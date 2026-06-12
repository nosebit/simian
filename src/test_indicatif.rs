use indicatif::{ProgressBar, ProgressStyle};
use std::thread;
use std::time::Duration;

pub fn test() {
    let pb = ProgressBar::new(10);
    pb.set_style(
        ProgressStyle::default_bar()
            .template("{spinner:.green} [{elapsed_precise}] [{bar:40.cyan/blue}] {pos}/{len} ({eta})\n{msg}")
            .unwrap()
            .progress_chars("#>-"),
    );
    for i in 0..5 {
        pb.set_message(format!("Step {}", i));
        pb.inc(1);
        thread::sleep(Duration::from_millis(100));
    }
    pb.finish_with_message("Done");
}
