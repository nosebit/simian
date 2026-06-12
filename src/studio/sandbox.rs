use anyhow::Result;
use tokio::process::Command;

pub async fn run_rust_code(
  code: &str,
  studio_file: &std::path::Path,
) -> Result<tokio::process::Child> {
  let simian_path = std::env::current_dir()?.to_string_lossy().to_string();
  let target_dir = std::env::current_dir()?.join("target");

  // Create a persistent sandbox directory in ~/.simian/sandboxes/ to avoid
  // Cargo workspace conflicts if the studio file is inside an existing repo.
  use std::hash::{Hash, Hasher};
  let mut hasher = std::collections::hash_map::DefaultHasher::new();
  studio_file.hash(&mut hasher);
  let hash = hasher.finish();

  let home = dirs::home_dir().unwrap_or_else(|| std::path::PathBuf::from("."));
  let proj_path = home
    .join(".simian")
    .join("sandboxes")
    .join(format!("sandbox_{}", hash));

  if !proj_path.exists() {
    std::fs::create_dir_all(&proj_path)?;
    std::fs::create_dir_all(proj_path.join("src"))?;
  }

  // Always ensure Cargo.toml is properly written
  let cargo_toml_path = proj_path.join("Cargo.toml");
  let mut cargo_toml = String::new();
  cargo_toml.push_str(
    "[package]\nname = \"sandbox\"\nversion = \"0.1.0\"\nedition = \"2024\"\n\n[dependencies]\n",
  );
  cargo_toml.push_str(&format!("simian = {{ path = \"{}\" }}\n", simian_path));
  cargo_toml.push_str("tokio = { version = \"1\", features = [\"full\"] }\n");
  cargo_toml.push_str(
    "polars = { version = \"0.41\", features = [\"csv\", \"parquet\", \"lazy\", \"describe\"] }\n",
  );
  cargo_toml.push_str("candle-core = \"0.10.2\"\n");
  std::fs::write(&cargo_toml_path, cargo_toml)?;

  // Prepare the main.rs content
  let main_rs_path = proj_path.join("src/main.rs");

  // We wrap the user's code inside a main function if they haven't provided one.
  // To handle global imports, we can prepend them.
  let full_code = if code.contains("fn main") {
    code.to_string()
  } else {
    format!(
      "#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {{
{}
  Ok(())
}}
",
      code
    )
  };

  std::fs::write(&main_rs_path, full_code)?;

  let studio_dir = studio_file.parent().unwrap();

  let assets_dir = studio_dir.join("assets");
  if !assets_dir.exists() {
    std::fs::create_dir_all(&assets_dir)?;
  }

  // Run the code, pointing CARGO_TARGET_DIR to the main simian target folder
  // so we reuse the massive pre-compiled artifacts (Polars, Tokio, etc.)!
  let child = Command::new("cargo")
    .arg("run")
    .arg("--manifest-path")
    .arg(&cargo_toml_path)
    .arg("-q") // quiet
    .env("CARGO_TARGET_DIR", target_dir)
    .env("SIMIAN_STUDIO_DIR", studio_dir)
    .env("FORCE_COLOR", "1")
    .env("CLICOLOR_FORCE", "1")
    .current_dir(&assets_dir)
    .stdout(std::process::Stdio::piped())
    .stderr(std::process::Stdio::piped())
    .spawn()?;

  Ok(child)
}
