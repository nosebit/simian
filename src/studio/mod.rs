use async_stream::stream;
use axum::body::Body;
use axum::response::Response;
use axum::{
  Json, Router,
  extract::{Path as AxumPath, State},
  routing::{get, post},
};
use bytes::Bytes;
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;
use std::path::PathBuf;
use std::sync::Arc;
use tokio::io::AsyncReadExt;
use tower_http::services::{ServeDir, ServeFile};

#[derive(rust_embed::RustEmbed)]
#[folder = "ui/dist/"]
pub struct UiAssets;

async fn embedded_serve(uri: axum::http::Uri) -> impl axum::response::IntoResponse {
  let mut path = uri.path().trim_start_matches('/');
  if path.is_empty() {
    path = "index.html";
  }

  match UiAssets::get(path) {
    Some(content) => {
      let mime = mime_guess::from_path(path).first_or_octet_stream();
      axum::response::Response::builder()
        .header(axum::http::header::CONTENT_TYPE, mime.as_ref())
        .body(Body::from(content.data.into_owned()))
        .unwrap()
    }
    None => {
      if let Some(content) = UiAssets::get("index.html") {
        let mime = mime_guess::from_path("index.html").first_or_octet_stream();
        axum::response::Response::builder()
          .header(axum::http::header::CONTENT_TYPE, mime.as_ref())
          .body(Body::from(content.data.into_owned()))
          .unwrap()
      } else {
        axum::response::Response::builder()
          .status(axum::http::StatusCode::NOT_FOUND)
          .body(Body::from("404 Not Found"))
          .unwrap()
      }
    }
  }
}

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
  base_dir: PathBuf,
}

#[derive(Serialize)]
struct PaperMetadata {
  id: String,
  title: String,
  slug: Option<String>,
  last_modified: u64,
}

async fn list_papers(State(state): State<Arc<AppState>>) -> Json<Vec<PaperMetadata>> {
  let mut papers = Vec::new();
  if let Ok(entries) = std::fs::read_dir(&state.base_dir) {
    for entry in entries.flatten() {
      if let Ok(file_type) = entry.file_type()
        && file_type.is_symlink()
      {
        continue;
      }
      if entry.path().is_dir() {
        let source_file = entry.path().join("source.smn");
        if source_file.exists() {
          let mut title = String::from("Untitled Paper");
          let mut slug = None;

          if let Ok(content) = std::fs::read_to_string(&source_file)
            && let Ok(ast) = serde_json::from_str::<serde_json::Value>(&content)
            && let Some(blocks) = ast.as_array()
          {
            for block in blocks {
              if block.get("type").and_then(|v| v.as_str()) == Some("title") {
                if let Some(children) = block.get("children").and_then(|v| v.as_array()) {
                  let mut t = String::new();
                  for child in children {
                    if let Some(text) = child.get("text").and_then(|v| v.as_str()) {
                      t.push_str(text);
                    }
                  }
                  title = t.trim().to_string();
                }
                break;
              }
            }
          }

          let metadata_file = entry.path().join("metadata.json");
          if let Ok(content) = std::fs::read_to_string(&metadata_file)
            && let Ok(json) = serde_json::from_str::<serde_json::Value>(&content)
            && let Some(s) = json.get("slug").and_then(|v| v.as_str())
          {
            slug = Some(s.to_string());
          }

          let last_modified = entry
            .metadata()
            .and_then(|m| m.modified())
            .map(|t| t.duration_since(std::time::UNIX_EPOCH).unwrap().as_secs())
            .unwrap_or(0);

          papers.push(PaperMetadata {
            id: entry.file_name().to_string_lossy().to_string(),
            title,
            slug,
            last_modified,
          });
        }
      }
    }
  }

  papers.sort_by_key(|b| std::cmp::Reverse(b.last_modified));
  Json(papers)
}

#[derive(Serialize)]
struct CreatePaperResponse {
  id: String,
}

fn create_paper_dir(base_dir: &std::path::Path, id: &str) -> anyhow::Result<PathBuf> {
  let paper_dir = base_dir.join(id);
  std::fs::create_dir_all(&paper_dir)?;
  std::fs::create_dir_all(paper_dir.join("assets"))?;
  std::fs::create_dir_all(paper_dir.join(".local").join("plots"))?;
  std::fs::create_dir_all(paper_dir.join(".local").join("datasets"))?;
  std::fs::create_dir_all(paper_dir.join(".local").join("models"))?;

  let default_content = serde_json::json!([
    {
      "type": "title",
      "children": [{ "text": "Untitled Paper" }]
    },
    {
      "type": "code-block",
      "language": "rust",
      "children": [{ "text": "println!(\"Hello from Simian Paper!\");" }]
    }
  ]);
  let _ = std::fs::write(
    paper_dir.join("source.smn"),
    serde_json::to_string_pretty(&default_content).unwrap(),
  );

  Ok(paper_dir)
}

async fn create_paper(State(state): State<Arc<AppState>>) -> Json<CreatePaperResponse> {
  let id = format!("paper-{:06x}", rand::random::<u32>() & 0xFFFFFF);
  let _ = create_paper_dir(&state.base_dir, &id);
  Json(CreatePaperResponse { id })
}

async fn execute_code(
  State(state): State<Arc<AppState>>,
  AxumPath(id): AxumPath<String>,
  Json(payload): Json<ExecuteRequest>,
) -> Response {
  let studio_file = state.base_dir.join(&id).join("source.smn");
  let code = payload.code;
  use crossterm::style::Stylize;
  tracing::debug!("Received code to execute:\n{}", code.as_str().dark_grey());

  match sandbox::run_rust_code(&code, &studio_file).await {
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

async fn get_content(
  State(state): State<Arc<AppState>>,
  AxumPath(id): AxumPath<String>,
) -> Json<serde_json::Value> {
  let studio_file = state.base_dir.join(&id).join("source.smn");
  if studio_file.exists()
    && let Ok(content) = std::fs::read_to_string(&studio_file)
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

async fn save_content(
  State(state): State<Arc<AppState>>,
  AxumPath(id): AxumPath<String>,
  Json(payload): Json<serde_json::Value>,
) {
  let studio_file = state.base_dir.join(&id).join("source.smn");
  if let Ok(content) = serde_json::to_string_pretty(&payload) {
    let _ = std::fs::write(&studio_file, content);
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

struct ChildGuard(std::process::Child);

impl Drop for ChildGuard {
  fn drop(&mut self) {
    let _ = self.0.kill();
    let _ = self.0.wait();
  }
}

pub async fn run(path: Option<String>, dev: bool) -> anyhow::Result<()> {
  let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
  let base_dir = home.join(".simian").join("papers");
  std::fs::create_dir_all(&base_dir)?;

  let state = Arc::new(AppState {
    base_dir: base_dir.clone(),
  });

  // If a path was passed explicitly, ensure it exists in base_dir
  if let Some(ref p) = path {
    let target = base_dir.join(p);
    if !target.exists() {
      let _ = create_paper_dir(&base_dir, p);
    }
  }

  let _dev_guard = if dev {
    tracing::info!("Starting UI in development mode (Vite)...");

    let _ = std::process::Command::new("sh")
      .arg("-c")
      .arg("lsof -ti:7777 | xargs kill -9 2>/dev/null")
      .output();

    let ui_dir = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("ui");
    let vite_bin = ui_dir.join("node_modules/.bin/vite");

    let child = std::process::Command::new(vite_bin)
      .current_dir(&ui_dir)
      .stdout(std::process::Stdio::null())
      .stderr(std::process::Stdio::null())
      .spawn()?;

    tracing::info!("UI entered watch mode.");
    Some(ChildGuard(child))
  } else {
    None
  };

  use tower_http::cors::{Any, CorsLayer};
  let cors = CorsLayer::new()
    .allow_origin(Any)
    .allow_headers(Any)
    .allow_methods(Any);

  let api_router = Router::new()
    .route("/papers", get(list_papers).post(create_paper))
    .route("/execute/{id}", post(execute_code))
    .route("/paper/{id}/content", get(get_content).post(save_content))
    .route("/html", get(serve_html))
    .with_state(state.clone());

  let app = if dev {
    let ui_dir = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("ui/dist");
    let serve_dir =
      ServeDir::new(&ui_dir).not_found_service(ServeFile::new(ui_dir.join("index.html")));
    Router::new()
      .nest("/api", api_router)
      .fallback_service(serve_dir)
      .layer(cors)
  } else {
    Router::new()
      .nest("/api", api_router)
      .fallback(embedded_serve)
      .layer(cors)
  };

  let api_port = if dev { 3000 } else { 7777 };
  let addr = SocketAddr::from(([127, 0, 0, 1], api_port));

  if dev {
    tracing::info!("Paper API listening on http://127.0.0.1:3000");
    tracing::info!("Paper UI available at: http://127.0.0.1:7777 (Development Mode)");
  } else {
    tracing::info!("Paper UI available at: http://127.0.0.1:7777");
  }

  let listener = tokio::net::TcpListener::bind(addr).await?;

  // Automatically open browser
  if let Some(p) = path {
    let _ = open::that(format!("http://127.0.0.1:7777/{}", p));
  } else {
    let _ = open::that("http://127.0.0.1:7777/");
  }

  axum::serve(listener, app).await?;

  Ok(())
}
