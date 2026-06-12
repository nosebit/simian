use anyhow::{Context, Result};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::time::Duration;

pub enum RenderFormat {
  Html,
  Url,
}

pub fn render(format: RenderFormat, content: &str) {
  let final_url = match format {
    RenderFormat::Html => {
      use base64::{Engine as _, engine::general_purpose};
      format!(
        "data:text/html;base64,{}",
        general_purpose::STANDARD.encode(content)
      )
    }
    RenderFormat::Url => content.to_string(),
  };

  println!(
    "__SIMIAN_BEGIN_CONTENT\n{}\n__SIMIAN_END_CONTENT",
    final_url
  );
}

// Dummy Client ID for Simian CLI GitHub App
// TODO: Replace with the actual GitHub App Client ID!
const GITHUB_CLIENT_ID: &str = "YOUR_GITHUB_APP_CLIENT_ID";

#[derive(Serialize, Deserialize, Debug)]
struct DeviceAuthResponse {
  device_code: String,
  user_code: String,
  verification_uri: String,
  expires_in: u64,
  interval: u64,
}

#[derive(Serialize, Deserialize, Debug)]
struct AccessTokenResponse {
  access_token: Option<String>,
  token_type: Option<String>,
  scope: Option<String>,
  error: Option<String>,
  error_description: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
struct StoredAuth {
  access_token: String,
}

fn get_auth_file() -> Result<PathBuf> {
  let home = dirs::home_dir().context("Could not find HOME directory")?;
  let path = home.join(".simian").join("oauth").join("github.json");
  if let Some(parent) = path.parent() {
    std::fs::create_dir_all(parent)?;
  }
  Ok(path)
}

async fn authenticate(client: &Client) -> Result<String> {
  let auth_file = get_auth_file()?;
  if auth_file.exists()
    && let Ok(content) = std::fs::read_to_string(&auth_file)
    && let Ok(stored) = serde_json::from_str::<StoredAuth>(&content)
  {
    return Ok(stored.access_token);
  }

  tracing::info!("Authenticating with GitHub...");

  // 1. Request device code
  let res = client
    .post("https://github.com/login/device/code")
    .header("Accept", "application/json")
    .json(&serde_json::json!({
        "client_id": GITHUB_CLIENT_ID,
        "scope": "public_repo",
    }))
    .send()
    .await?;

  let device_auth: DeviceAuthResponse = res.json().await?;

  tracing::info!("--------------------------------------------------");
  tracing::info!("Please visit: {}", device_auth.verification_uri);
  tracing::info!("And enter code: {}", device_auth.user_code);
  tracing::info!("--------------------------------------------------");

  // Open browser automatically
  let _ = open::that(&device_auth.verification_uri);

  // 2. Poll for the token
  let mut interval = device_auth.interval;
  loop {
    tokio::time::sleep(Duration::from_secs(interval)).await;

    let res = client
      .post("https://github.com/login/oauth/access_token")
      .header("Accept", "application/json")
      .json(&serde_json::json!({
          "client_id": GITHUB_CLIENT_ID,
          "device_code": &device_auth.device_code,
          "grant_type": "urn:ietf:params:oauth:grant-type:device_code",
      }))
      .send()
      .await?;

    let token_res: AccessTokenResponse = res.json().await?;

    if let Some(token) = token_res.access_token {
      tracing::info!("Successfully authenticated!");
      let stored = StoredAuth {
        access_token: token.clone(),
      };
      std::fs::write(&auth_file, serde_json::to_string_pretty(&stored)?)?;
      return Ok(token);
    } else if let Some(err) = token_res.error {
      match err.as_str() {
        "authorization_pending" => continue,
        "slow_down" => {
          interval += 5;
          continue;
        }
        "expired_token" => anyhow::bail!("The device code expired. Please try again."),
        "access_denied" => anyhow::bail!("User canceled the authorization request."),
        _ => anyhow::bail!("OAuth Error: {} - {:?}", err, token_res.error_description),
      }
    }
  }
}

fn get_paper_dir(id: &str) -> Result<PathBuf> {
  let p_path = Path::new(id);
  if id.contains('/') || id.contains('\\') {
    if p_path.exists() {
      if p_path.extension().is_some_and(|ext| ext == "smn") {
        return Ok(p_path.parent().unwrap().to_path_buf());
      }
      return Ok(p_path.to_path_buf());
    }
    anyhow::bail!("Path {} does not exist", id);
  }

  let local_dir = std::env::current_dir()?.join(id);
  if local_dir.exists() {
    return Ok(local_dir);
  }

  let home = dirs::home_dir().context("Could not find HOME directory")?;
  let simian_dir = home.join(".simian").join("papers").join(id);
  if simian_dir.exists() {
    return Ok(simian_dir);
  }

  anyhow::bail!(
    "Paper '{}' not found in current directory or ~/.simian/papers/",
    id
  );
}

pub async fn submit(id: String) -> Result<()> {
  let paper_dir = get_paper_dir(&id)?;
  let source_file = paper_dir.join("source.smn");
  if !source_file.exists() {
    anyhow::bail!("No source.smn found in paper directory: {:?}", paper_dir);
  }

  let client = Client::builder().user_agent("Simian-CLI").build()?;

  // Attempt authentication first
  let token = authenticate(&client).await?;

  tracing::info!(
    "Authentication successful. Token begins with: {}...",
    &token[..4]
  );

  // Create bundle directory
  let bundle_dir = paper_dir.join(".bundle");
  if bundle_dir.exists() {
    std::fs::remove_dir_all(&bundle_dir)?;
  }
  std::fs::create_dir_all(&bundle_dir)?;
  let bundle_assets = bundle_dir.join("assets");
  std::fs::create_dir_all(&bundle_assets)?;

  tracing::info!("Parsing source.smn and collecting active plots...");
  let source_content = std::fs::read_to_string(&source_file)?;
  let ast: serde_json::Value = serde_json::from_str(&source_content)?;
  let mut markdown = format!("# Paper: {}\n\n", id);

  if let Some(blocks) = ast.as_array() {
    for block in blocks {
      let block_type = block.get("type").and_then(|v| v.as_str()).unwrap_or("");

      if block_type == "paragraph" || block_type == "text" {
        let mut text = String::new();
        if let Some(children) = block.get("children").and_then(|v| v.as_array()) {
          for child in children {
            if let Some(t) = child.get("text").and_then(|v| v.as_str()) {
              text.push_str(t);
            }
          }
        }
        markdown.push_str(&text);
        markdown.push_str("\n\n");
      } else if block_type == "code-block" {
        let mut code = String::new();
        if let Some(children) = block.get("children").and_then(|v| v.as_array()) {
          for child in children {
            if let Some(t) = child.get("text").and_then(|v| v.as_str()) {
              code.push_str(t);
            }
          }
        }
        let lang = block
          .get("language")
          .and_then(|v| v.as_str())
          .unwrap_or("rust");
        markdown.push_str(&format!("```{}\n{}\n```\n", lang, code));

        // Find plots in output
        if let Some(output) = block.get("output")
          && let Some(urls) = output.get("urls").and_then(|v| v.as_array())
        {
          for url_val in urls {
            if let Some(url) = url_val.as_str() {
              if url.starts_with("data:text/html;base64,") {
                let b64 = url.trim_start_matches("data:text/html;base64,");
                use base64::{Engine as _, engine::general_purpose};
                if let Ok(decoded) = general_purpose::STANDARD.decode(b64) {
                  let rand_id = rand::random::<u32>();
                  let html_filename = format!("plot-{}.html", rand_id);
                  let png_filename = format!("plot-{}.png", rand_id);
                  let html_dest = bundle_assets.join(&html_filename);
                  let png_dest = bundle_assets.join(&png_filename);
                  std::fs::write(&html_dest, decoded)?;

                  // Take screenshot
                  let ui_dir = std::env::current_dir()?.join("ui");
                  let script_path = ui_dir.join("scripts").join("screenshot.js");
                  if script_path.exists() {
                    tracing::info!("Taking screenshot of {}", html_filename);
                    std::process::Command::new("node")
                      .arg(&script_path)
                      .arg(&html_dest)
                      .arg(&png_dest)
                      .current_dir(&ui_dir)
                      .status()?;

                    markdown.push_str(&format!("\n![Plot](assets/{})\n", png_filename));
                  } else {
                    markdown.push_str(&format!("\n*(Interactive Plot: {})*\n", html_filename));
                  }
                }
              } else if url.starts_with("data:image/") {
                // Could save image to disk and link
                let parts: Vec<&str> = url.splitn(2, ',').collect();
                if parts.len() == 2 {
                  let b64 = parts[1];
                  use base64::{Engine as _, engine::general_purpose};
                  if let Ok(decoded) = general_purpose::STANDARD.decode(b64) {
                    let rand_id = rand::random::<u32>();
                    let ext = if url.starts_with("data:image/png") {
                      "png"
                    } else {
                      "jpg"
                    };
                    let filename = format!("image-{}.{}", rand_id, ext);
                    let dest = bundle_assets.join(&filename);
                    std::fs::write(&dest, decoded)?;
                    markdown.push_str(&format!("\n![Image](assets/{})\n", filename));
                  }
                }
              } else {
                // Normal remote URL
                markdown.push_str(&format!("\n![Media]({})\n", url));
              }
            }
          }
        }
        markdown.push('\n');
      } else if block_type == "heading" || block_type == "title" {
        let mut text = String::new();
        if let Some(children) = block.get("children").and_then(|v| v.as_array()) {
          for child in children {
            if let Some(t) = child.get("text").and_then(|v| v.as_str()) {
              text.push_str(t);
            }
          }
        }
        markdown.push_str(&format!("## {}\n\n", text));
      }
    }
  }

  std::fs::write(bundle_dir.join("paper.md"), markdown)?;
  std::fs::copy(&source_file, bundle_dir.join("source.smn"))?;

  tracing::info!("Bundling React App...");
  let ui_dir = std::env::current_dir()?.join("ui");
  let dist_dir = ui_dir.join("dist");

  // We assume `npm run build` has already been run in ui/, or we can try to run it:
  if !dist_dir.exists() {
    tracing::info!("Building UI...");
    let status = std::process::Command::new("npm")
      .arg("run")
      .arg("build")
      .current_dir(&ui_dir)
      .status()?;
    if !status.success() {
      anyhow::bail!("Failed to build UI!");
    }
  }

  // Copy dist/assets to .bundle/assets
  let dist_assets = dist_dir.join("assets");
  if dist_assets.exists() {
    for entry in std::fs::read_dir(&dist_assets)? {
      let entry = entry?;
      std::fs::copy(entry.path(), bundle_assets.join(entry.file_name()))?;
    }
  }

  // Copy and inject index.html
  let index_html_path = dist_dir.join("index.html");
  if index_html_path.exists() {
    let mut index_html = std::fs::read_to_string(&index_html_path)?;
    let ast_json = serde_json::to_string(&ast)?;
    let injection = format!("window.__SIMIAN_PAPER_DATA__ = {};", ast_json);
    index_html = index_html.replace("// __SIMIAN_INJECT__", &injection);
    std::fs::write(bundle_dir.join("index.html"), index_html)?;
  }

  tracing::info!("Skipping actual GitHub PR creation for now (repository is not published yet).");
  tracing::info!("Bundle is ready at: {:?}", bundle_dir);

  Ok(())
}
