use async_stream::stream;
use axum::body::Body;
use axum::response::Response;
use axum::{
  Json, Router,
  extract::State,
  routing::{get, post},
};
use bytes::Bytes;
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tokio::io::AsyncReadExt;
use tower_http::services::{ServeDir, ServeFile};

pub mod sandbox;

#[derive(Deserialize)]
pub struct ExecuteRequest {
  pub code: String,
}

#[derive(Serialize)]
pub struct ExecuteResponse {
  pub stdout: String,
  pub stderr: String,
  pub success: bool,
}

#[derive(Clone)]
struct AppState {
  studio_file: PathBuf,
}

async fn execute_code(
  State(state): State<Arc<AppState>>,
  Json(payload): Json<ExecuteRequest>,
) -> Response {
  let code = payload.code;
  use crossterm::style::Stylize;
  tracing::debug!("Received code to execute:\n{}", code.as_str().dark_grey());

  match sandbox::run_rust_code(&code, &state.studio_file).await {
    Ok(mut child) => {
      let mut stdout = child.stdout.take().unwrap();
      let mut stderr = child.stderr.take().unwrap();

      let stream = stream! {
        let (tx, mut rx) = tokio::sync::mpsc::channel::<Bytes>(32);
        let tx1 = tx.clone();
        let tx2 = tx.clone();

        tokio::spawn(async move {
          let mut buf = [0u8; 1024];
          while let Ok(n) = stdout.read(&mut buf).await {
            if n == 0 { break; }
            if tx1.send(Bytes::copy_from_slice(&buf[..n])).await.is_err() { break; }
          }
        });

        tokio::spawn(async move {
          let mut buf = [0u8; 1024];
          while let Ok(n) = stderr.read(&mut buf).await {
            if n == 0 { break; }
            if tx2.send(Bytes::copy_from_slice(&buf[..n])).await.is_err() { break; }
          }
        });

        drop(tx);

        while let Some(bytes) = rx.recv().await {
          yield Ok::<_, std::io::Error>(bytes);
        }

        if let Ok(status) = child.wait().await {
          if status.success() {
            yield Ok(Bytes::from("\n__SIMIAN_EXIT_SUCCESS__\n"));
          } else {
            yield Ok(Bytes::from("\n__SIMIAN_EXIT_FAILURE__\n"));
          }
        }
      };

      Response::builder()
        .header("Content-Type", "text/plain")
        .body(Body::from_stream(stream))
        .unwrap()
    }
    Err(e) => Response::builder()
      .status(500)
      .body(Body::from(format!("Sandbox error: {:?}", e)))
      .unwrap(),
  }
}

async fn get_content(State(state): State<Arc<AppState>>) -> Json<serde_json::Value> {
  if state.studio_file.exists()
    && let Ok(content) = std::fs::read_to_string(&state.studio_file)
    && let Ok(json) = serde_json::from_str(&content)
  {
    return Json(json);
  }
  // Default AST if file is missing or empty
  Json(serde_json::json!([
    {
      "type": "title",
      "children": [{ "text": "Welcome to Simian Paper" }]
    },
    {
      "type": "paragraph",
      "children": [{ "text": "This is an interactive notebook. Type `# ` for a heading or ` ``` ` for a code block." }]
    },
    {
      "type": "code",
      "children": [{ "text": "println!(\"Hello from Simian Paper!\");" }],
      "output": null
    }
  ]))
}

async fn save_content(State(state): State<Arc<AppState>>, Json(payload): Json<serde_json::Value>) {
  if let Ok(content) = serde_json::to_string_pretty(&payload) {
    let _ = std::fs::write(&state.studio_file, content);
  }
}

#[derive(Deserialize)]
pub struct HtmlQuery {
  path: String,
}

async fn serve_html(
  axum::extract::Query(query): axum::extract::Query<HtmlQuery>,
) -> axum::response::Html<String> {
  if let Ok(content) = std::fs::read_to_string(&query.path) {
    axum::response::Html(content)
  } else {
    axum::response::Html("<h1>File not found</h1>".to_string())
  }
}

fn resolve_studio_path(path: Option<String>) -> anyhow::Result<PathBuf> {
  let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
  let base_dir = home.join(".simian").join("papers");

  let resolved = match path {
    None => {
      let random_name = format!("paper-{}", rand::random::<u16>());
      base_dir.join(random_name).join("source.smn")
    }
    Some(p) => {
      // If it explicitly contains path separators, treat it as a direct path
      if p.contains('/') || p.contains('\\') {
        let p_path = Path::new(&p);
        if p.ends_with(".smn") || p.ends_with(".md") {
          p_path.to_path_buf()
        } else {
          p_path.join("source.smn")
        }
      } else {
        // It's just a name like "somepaper".
        // 1. Check if it exists in the current directory
        let local_dir = std::env::current_dir()?.join(&p);
        let simian_dir = base_dir.join(&p);

        if local_dir.exists() {
          local_dir.join("source.smn")
        } else if simian_dir.exists() {
          // 2. Check if it exists in ~/.simian/papers/
          simian_dir.join("source.smn")
        } else {
          // 3. Otherwise, create it in ~/.simian/papers/
          simian_dir.join("source.smn")
        }
      }
    }
  };

  if let Some(parent) = resolved.parent() {
    std::fs::create_dir_all(parent)?;
    // Create new paper directory structure
    std::fs::create_dir_all(parent.join("assets"))?;
    std::fs::create_dir_all(parent.join(".local").join("plots"))?;
    std::fs::create_dir_all(parent.join(".local").join("datasets"))?;
    std::fs::create_dir_all(parent.join(".local").join("models"))?;
  }

  // Ensure absolute path
  let absolute = if resolved.is_absolute() {
    resolved
  } else {
    std::env::current_dir()?.join(resolved)
  };

  // Seed the file with default content if it doesn't exist
  if !absolute.exists() {
    let name = absolute
      .parent()
      .and_then(|p| p.file_name())
      .and_then(|n| n.to_str())
      .unwrap_or("Untitled Paper")
      .replace("-", " ");

    // capitalize
    let name = name
      .chars()
      .enumerate()
      .map(|(i, c)| if i == 0 { c.to_ascii_uppercase() } else { c })
      .collect::<String>();

    let default_content = serde_json::json!([
      {
        "type": "title",
        "children": [{ "text": name }]
      },
      {
        "type": "code-block",
        "language": "rust",
        "children": [{ "text": "println!(\"Hello from Simian Paper!\");" }]
      }
    ]);
    let _ = std::fs::write(
      &absolute,
      serde_json::to_string_pretty(&default_content).unwrap(),
    );
  }

  Ok(absolute)
}

struct ChildGuard(std::process::Child);

impl Drop for ChildGuard {
  fn drop(&mut self) {
    let _ = self.0.kill();
    let _ = self.0.wait();
  }
}

pub async fn run(path: Option<String>, dev: bool) -> anyhow::Result<()> {
  let abs_path = resolve_studio_path(path)?;
  tracing::info!("Opening Simian Paper: {:?}", abs_path);

  let state = Arc::new(AppState {
    studio_file: abs_path,
  });

  // Pre-compile the sandbox
  // This forces Cargo to fetch the registry index, generate the Cargo.lock,
  // and link the initial binary making the user's first Shift+Enter evaluation virtually instantaneous!
  tracing::info!("Pre-warming sandbox environment...");
  if let Ok(mut child) = sandbox::run_rust_code("", &state.studio_file).await {
    let _ = child.wait().await;
  }
  tracing::info!("Sandbox pre-warmed and ready!");

  let _dev_guard = if dev {
    tracing::info!("Starting UI in development mode (Vite)...");

    // Proactively kill any zombie process holding port 7777
    let _ = std::process::Command::new("sh")
      .arg("-c")
      .arg("lsof -ti:7777 | xargs kill -9 2>/dev/null")
      .output();

    let ui_dir = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("ui");
    let child = std::process::Command::new("node_modules/.bin/vite")
      .current_dir(ui_dir)
      .stdout(std::process::Stdio::null())
      .stderr(std::process::Stdio::null())
      .spawn()?;

    tracing::info!("UI entered watch mode.");
    Some(ChildGuard(child))
  } else {
    None
  };

  // Allow CORS for the Vite dev server
  use tower_http::cors::{Any, CorsLayer};
  let cors = CorsLayer::new()
    .allow_origin(Any)
    .allow_headers(Any)
    .allow_methods(Any);

  // Setup the API router
  let api_router = Router::new()
    .route("/execute", post(execute_code))
    .route("/paper/content", get(get_content).post(save_content))
    .route("/html", get(serve_html))
    .with_state(state.clone());

  // Determine the path to the UI assets.
  // In development, this relies on `simian` being run from the repo root.
  let ui_dir = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("ui/dist");
  let serve_dir =
    ServeDir::new(&ui_dir).not_found_service(ServeFile::new(ui_dir.join("index.html")));

  // The main router
  let app = Router::new()
    .nest("/api", api_router)
    .fallback_service(serve_dir)
    .layer(cors);

  let api_port = if dev { 3000 } else { 7777 };
  let addr = SocketAddr::from(([127, 0, 0, 1], api_port));

  if dev {
    tracing::info!("Paper API listening on http://127.0.0.1:3000");
    tracing::info!("Paper UI available at: http://127.0.0.1:7777 (Development Mode)");
  } else {
    tracing::info!("Paper UI available at: http://127.0.0.1:7777");
  }

  let listener = tokio::net::TcpListener::bind(addr).await?;
  axum::serve(listener, app).await?;

  Ok(())
}
