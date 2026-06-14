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

pub async fn submit(id: String, dry: bool) -> Result<()> {
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
  
  fn extract_markdown_text(children: &[serde_json::Value]) -> String {
    let mut text = String::new();
    for child in children {
      let child_type = child.get("type").and_then(|v| v.as_str()).unwrap_or("");
      if child_type == "latex-inline" {
        if let Some(subchildren) = child.get("children").and_then(|v| v.as_array()) {
          text.push('$');
          text.push_str(&extract_markdown_text(subchildren));
          text.push('$');
        }
      } else if let Some(t) = child.get("text").and_then(|v| v.as_str()) {
        text.push_str(t);
      }
    }
    text
  }

  let mut title_text = String::new();
  if let Some(blocks) = ast.as_array() {
    for block in blocks {
      if let Some(block_type) = block.get("type").and_then(|v| v.as_str()) {
        if block_type == "title" {
          if let Some(children) = block.get("children").and_then(|v| v.as_array()) {
            title_text = extract_markdown_text(children);
          }
          break;
        }
      }
    }
  }
  let title_text = title_text.trim().to_string();

  let metadata_path = paper_dir.join("metadata.json");
  let mut slug = String::new();
  let mut metadata_json = serde_json::json!({});

  if metadata_path.exists() {
    if let Ok(content) = std::fs::read_to_string(&metadata_path) {
      if let Ok(json) = serde_json::from_str::<serde_json::Value>(&content) {
        metadata_json = json.clone();
        if let Some(s) = json.get("slug").and_then(|v| v.as_str()) {
          slug = s.to_string();
        }
      }
    }
  }

  let theme = dialoguer::theme::ColorfulTheme::default();

  if slug.is_empty() {
    let suffix = if id.starts_with("paper-") && id.len() > 6 {
      &id[6..]
    } else {
      &id
    };

    let base_slug = slug::slugify(&title_text);
    let suggested_slug = if base_slug.is_empty() {
      format!("paper-{}", suffix)
    } else {
      format!("{}-{}", base_slug, suffix)
    };

    let confirmation = dialoguer::Confirm::with_theme(&theme)
      .with_prompt(format!("We extracted the title '{}'. Do you want to publish this paper as `{}`?", title_text, suggested_slug))
      .default(true)
      .interact()?;

    if confirmation {
      slug = suggested_slug;
    } else {
      slug = dialoguer::Input::with_theme(&theme)
        .with_prompt("Please enter a custom slug for this paper")
        .interact_text()?;
    }

    metadata_json["slug"] = serde_json::json!(slug);
  }

  if metadata_json.get("authors").is_none() {
    tracing::info!("Fetching your GitHub profile...");
    let auth_client = reqwest::Client::builder()
      .user_agent("Simian-CLI")
      .default_headers({
        let mut headers = reqwest::header::HeaderMap::new();
        headers.insert(
          "Authorization",
          format!("Bearer {}", token).parse().unwrap(),
        );
        headers.insert("Accept", "application/vnd.github.v3+json".parse().unwrap());
        headers
      })
      .build()?;
      
    let user_res: serde_json::Value = auth_client
      .get("https://api.github.com/user")
      .send()
      .await?
      .json()
      .await?;
      
    let primary_id = user_res.get("id").and_then(|v| v.as_u64()).context("Failed to get GitHub user ID. Try checking your internet connection or removing ~/.simian/oauth/github.json.")?;
    let mut authors = vec![primary_id];

    let co_authors: String = dialoguer::Input::with_theme(&theme)
      .with_prompt("Enter any co-author GitHub handles (comma-separated), or leave blank")
      .allow_empty(true)
      .interact_text()?;

    if !co_authors.trim().is_empty() {
      for handle in co_authors.split(',') {
        let handle = handle.trim();
        if !handle.is_empty() {
          let co_res: serde_json::Value = client.get(format!("https://api.github.com/users/{}", handle))
            .send().await?.json().await?;
          if let Some(uid) = co_res.get("id").and_then(|v| v.as_u64()) {
            authors.push(uid);
          } else {
            tracing::warn!("Could not find GitHub user '{}'", handle);
          }
        }
      }
    }

    metadata_json["authors"] = serde_json::json!(authors);
  }

  std::fs::write(&metadata_path, serde_json::to_string_pretty(&metadata_json)?)?;

  // Create symlink if needed
  if id != slug {
    let home = dirs::home_dir().context("Could not find HOME directory")?;
    let simian_papers = home.join(".simian").join("papers");
    let link_path = simian_papers.join(&slug);
    if !link_path.exists() {
      #[cfg(unix)]
      let _ = std::os::unix::fs::symlink(&paper_dir, &link_path);
      #[cfg(windows)]
      let _ = std::os::windows::fs::symlink_dir(&paper_dir, &link_path);
    }
  }

  let mut markdown = format!("# Paper: {}\n\n", title_text);

  if let Some(blocks) = ast.as_array() {
    for block in blocks {
      let block_type = block.get("type").and_then(|v| v.as_str()).unwrap_or("");

      if block_type == "paragraph" || block_type == "text" {
        let text = if let Some(children) = block.get("children").and_then(|v| v.as_array()) {
          extract_markdown_text(children)
        } else {
          String::new()
        };
        markdown.push_str(&text);
        markdown.push_str("\n\n");
      } else if block_type == "latex-block" {
        let code = if let Some(children) = block.get("children").and_then(|v| v.as_array()) {
          extract_markdown_text(children)
        } else {
          String::new()
        };
        markdown.push_str(&format!("$$\n{}\n$$\n\n", code));
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
        let text = if let Some(children) = block.get("children").and_then(|v| v.as_array()) {
          extract_markdown_text(children)
        } else {
          String::new()
        };
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
    let metadata_str = serde_json::to_string(&metadata_json)?;
    let injection = format!("window.__SIMIAN_PAPER_DATA__ = {};\nwindow.__SIMIAN_PAPER_METADATA__ = {};", ast_json, metadata_str);
    index_html = index_html.replace("// __SIMIAN_INJECT__", &injection);
    std::fs::write(bundle_dir.join("index.html"), index_html)?;
  }

  tracing::info!("Bundle is ready at: {:?}", bundle_dir);

  if dry {
    tracing::info!("Dry run complete! Opening bundled paper preview...");
    let _ = open::that(bundle_dir.join("index.html"));
    return Ok(());
  }

  tracing::info!("Authenticating with GitHub API...");
  let auth_client = reqwest::Client::builder()
    .user_agent("Simian-CLI")
    .default_headers({
      let mut headers = reqwest::header::HeaderMap::new();
      headers.insert(
        "Authorization",
        format!("Bearer {}", token).parse().unwrap(),
      );
      headers.insert("Accept", "application/vnd.github.v3+json".parse().unwrap());
      headers
    })
    .build()?;

  // 1. Get authenticated user
  tracing::info!("Fetching authenticated user...");
  let user_res: serde_json::Value = auth_client
    .get("https://api.github.com/user")
    .send()
    .await?
    .json()
    .await?;
  let username = user_res
    .get("login")
    .and_then(|v| v.as_str())
    .context("Failed to get GitHub username")?;

  // 2. Fork repository
  tracing::info!("Ensuring fork of nosebit/simian-papers exists...");
  let fork_res = auth_client
    .post("https://api.github.com/repos/nosebit/simian-papers/forks")
    .send()
    .await?;
  if !fork_res.status().is_success() && fork_res.status() != reqwest::StatusCode::ACCEPTED {
    anyhow::bail!("Failed to fork repository: {:?}", fork_res.text().await?);
  }

  // Wait for fork to be ready (GitHub takes a few seconds)
  tokio::time::sleep(std::time::Duration::from_secs(3)).await;

  // 3. Get base commit
  tracing::info!("Fetching latest commit from main branch...");
  let ref_url = format!(
    "https://api.github.com/repos/{}/simian-papers/git/ref/heads/main",
    username
  );
  let ref_res: serde_json::Value = auth_client.get(&ref_url).send().await?.json().await?;
  let base_sha = ref_res.get("object").and_then(|o| o.get("sha")).and_then(|s| s.as_str()).context("Failed to get base commit SHA from your fork. Make sure nosebit/simian-papers has an initial commit!")?;

  // 4. Create blobs and tree
  tracing::info!("Uploading files to GitHub...");
  let mut tree_nodes = Vec::new();

  async fn upload_blob(client: &reqwest::Client, user: &str, content: &[u8]) -> Result<String> {
    let b64 = {
      use base64::{Engine as _, engine::general_purpose};
      general_purpose::STANDARD.encode(content)
    };
    let res: serde_json::Value = client
      .post(format!(
        "https://api.github.com/repos/{}/simian-papers/git/blobs",
        user
      ))
      .json(&serde_json::json!({
        "content": b64,
        "encoding": "base64"
      }))
      .send()
      .await?
      .json()
      .await?;
    res
      .get("sha")
      .and_then(|s| s.as_str())
      .map(|s| s.to_string())
      .context("Failed to upload blob")
  }

  // Iterate over bundle dir recursively
  let mut stack = vec![(bundle_dir.clone(), String::new())];
  while let Some((dir, rel_path)) = stack.pop() {
    for entry in std::fs::read_dir(dir)? {
      let entry = entry?;
      let path = entry.path();
      let file_name = entry.file_name().to_string_lossy().to_string();
      let entry_rel = if rel_path.is_empty() {
        file_name
      } else {
        format!("{}/{}", rel_path, file_name)
      };

      if path.is_dir() {
        stack.push((path, entry_rel));
      } else {
        let content = std::fs::read(&path)?;
        let sha = upload_blob(&auth_client, username, &content).await?;
        let tree_path = format!("papers/{}/{}", slug, entry_rel);

        tree_nodes.push(serde_json::json!({
          "path": tree_path,
          "mode": "100644",
          "type": "blob",
          "sha": sha
        }));
      }
    }
  }

  // 5. Create Tree
  tracing::info!("Creating git tree...");
  let tree_res: serde_json::Value = auth_client
    .post(format!(
      "https://api.github.com/repos/{}/simian-papers/git/trees",
      username
    ))
    .json(&serde_json::json!({
      "base_tree": base_sha,
      "tree": tree_nodes
    }))
    .send()
    .await?
    .json()
    .await?;
  let tree_sha = tree_res
    .get("sha")
    .and_then(|s| s.as_str())
    .context("Failed to create tree")?;

  // 6. Create Commit
  tracing::info!("Creating commit...");
  let commit_res: serde_json::Value = auth_client
    .post(format!(
      "https://api.github.com/repos/{}/simian-papers/git/commits",
      username
    ))
    .json(&serde_json::json!({
      "message": format!("Publish paper: {}", title_text),
      "tree": tree_sha,
      "parents": [base_sha]
    }))
    .send()
    .await?
    .json()
    .await?;
  let commit_sha = commit_res
    .get("sha")
    .and_then(|s| s.as_str())
    .context("Failed to create commit")?;

  // 7. Update or Create Branch
  let branch_name = format!("publish/{}", slug);
  tracing::info!("Updating branch {}...", branch_name);

  let ref_url = format!("https://api.github.com/repos/{}/simian-papers/git/refs/heads/{}", username, branch_name);
  let ref_check = auth_client.get(&ref_url).send().await?;

  if ref_check.status().is_success() {
    let patch_res = auth_client
      .patch(&ref_url)
      .json(&serde_json::json!({
        "sha": commit_sha,
        "force": true
      }))
      .send()
      .await?;
    if !patch_res.status().is_success() {
      anyhow::bail!("Failed to update branch: {:?}", patch_res.text().await?);
    }
  } else {
    let branch_res = auth_client
      .post(format!("https://api.github.com/repos/{}/simian-papers/git/refs", username))
      .json(&serde_json::json!({
        "ref": format!("refs/heads/{}", branch_name),
        "sha": commit_sha
      }))
      .send()
      .await?;
    if !branch_res.status().is_success() {
      anyhow::bail!("Failed to create branch: {:?}", branch_res.text().await?);
    }
  }

  // 8. Create Pull Request
  tracing::info!("Opening Pull Request on nosebit/simian-papers...");
  let pr_res = auth_client
    .post("https://api.github.com/repos/nosebit/simian-papers/pulls")
    .json(&serde_json::json!({
      "title": format!("Publish Paper: {}", title_text),
      "head": format!("{}:{}", username, branch_name),
      "base": "main",
      "body": format!("Automatic submission of paper `{}` via Simian CLI.", slug)
    }))
    .send()
    .await?;

  if pr_res.status().is_success() {
    let pr_json: serde_json::Value = pr_res.json().await?;
    if let Some(url) = pr_json.get("html_url").and_then(|u| u.as_str()) {
      tracing::info!("Successfully opened Pull Request: {}", url);
      let _ = open::that(url);
    }
  } else if pr_res.status() == reqwest::StatusCode::UNPROCESSABLE_ENTITY {
    let text = pr_res.text().await?;
    if text.contains("A pull request already exists") {
      tracing::info!("✅ Successfully updated your existing Pull Request!");
    } else {
      anyhow::bail!("Failed to open PR: {:?}", text);
    }
  } else {
    anyhow::bail!("Failed to open PR: {:?}", pr_res.text().await?);
  }

  if id != slug {
    tracing::info!("Note: You can open this paper locally using either `{}` or `{}`.", id, slug);
  }

  Ok(())
}
