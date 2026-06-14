use std::process::Command;

fn main() {
  println!("cargo:rerun-if-changed=ui/src");
  println!("cargo:rerun-if-changed=ui/package.json");
  println!("cargo:rerun-if-changed=ui/vite.config.ts");
  println!("cargo:rerun-if-changed=ui/index.html");

  let status = Command::new("npm")
    .current_dir("ui")
    .args(["install"])
    .status()
    .expect("Failed to run npm install");

  if !status.success() {
    panic!("npm install failed");
  }

  let status = Command::new("npm")
    .current_dir("ui")
    .args(["run", "build"])
    .status()
    .expect("Failed to run npm run build");

  if !status.success() {
    panic!("npm run build failed");
  }
}
