use std::env;
use std::path::Path;
use std::process::Command;

fn copy_dir_all(src: impl AsRef<Path>, dst: impl AsRef<Path>) -> std::io::Result<()> {
  std::fs::create_dir_all(&dst)?;
  for entry in std::fs::read_dir(src)? {
    let entry = entry?;
    let ty = entry.file_type()?;
    let name = entry.file_name();
    if name == "node_modules" || name == "dist" || name == ".git" {
      continue;
    }
    if ty.is_dir() {
      copy_dir_all(entry.path(), dst.as_ref().join(name))?;
    } else {
      std::fs::copy(entry.path(), dst.as_ref().join(name))?;
    }
  }
  Ok(())
}

fn main() {
  println!("cargo:rerun-if-changed=ui/src");
  println!("cargo:rerun-if-changed=ui/package.json");
  println!("cargo:rerun-if-changed=ui/vite.config.ts");
  println!("cargo:rerun-if-changed=ui/index.html");

  let out_dir = env::var("OUT_DIR").unwrap();
  let dest_ui = Path::new(&out_dir).join("ui");

  let _ = std::fs::remove_dir_all(&dest_ui);
  copy_dir_all("ui", &dest_ui).expect("Failed to copy ui directory");

  let status = Command::new("npm")
    .current_dir(&dest_ui)
    .args(["install"])
    .status()
    .expect("Failed to run npm install");

  if !status.success() {
    panic!("npm install failed");
  }

  let status = Command::new("npm")
    .current_dir(&dest_ui)
    .args(["run", "build"])
    .status()
    .expect("Failed to run npm run build");

  if !status.success() {
    panic!("npm run build failed");
  }
}
