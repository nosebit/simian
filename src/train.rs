use crate::Device;
use candle_core::Result;

use crate::data::Dataset;
use crate::loss::Loss;
use crate::model::Model;
use crate::optim::Optimizer;
use indicatif::{ProgressBar, ProgressStyle};

/// Trains any machine learning model that implements the Model trait.
#[allow(clippy::too_many_arguments)]
pub fn fit<M: Model, O: Optimizer, L: Loss>(
  model: &mut M,
  optimizer: &mut O,
  loss_fn: &L,
  train_data: &Dataset,
  val_data: &Dataset,
  target_col: &str,
  device: &Device,
  epochs: usize,
  batch_size: usize,
  patience: usize,
  tolerance: f64,
  log_path: Option<String>,
) -> Result<()> {
  // 1. Split features and target
  let (x_train_ds, y_train_ds) = train_data
    .split_features_target(target_col)
    .map_err(|e| candle_core::Error::Msg(e.to_string()))?;
  let (x_val_ds, y_val_ds) = val_data
    .split_features_target(target_col)
    .map_err(|e| candle_core::Error::Msg(e.to_string()))?;

  // 2. Preprocess features via the model's lifecycle hook
  let prepared_x_train = model.preprocess(&x_train_ds)?;
  let prepared_x_val = model.preprocess(&x_val_ds)?;

  // 3. Convert DataFrames to Tensors
  let x_train = prepared_x_train
    .to_tensor(device)
    .map_err(|e| candle_core::Error::Msg(e.to_string()))?;
  let y_train = y_train_ds
    .to_tensor(device)
    .map_err(|e| candle_core::Error::Msg(e.to_string()))?;

  let x_val = prepared_x_val
    .to_tensor(device)
    .map_err(|e| candle_core::Error::Msg(e.to_string()))?;
  let y_val = y_val_ds
    .to_tensor(device)
    .map_err(|e| candle_core::Error::Msg(e.to_string()))?;

  let num_rows = x_train.dim(0)?;
  let num_batches = num_rows.div_ceil(batch_size);

  let studio_mode = std::env::var("SIMIAN_STUDIO_DIR").is_ok();
  let pb = if studio_mode {
    ProgressBar::hidden()
  } else {
    ProgressBar::new(epochs as u64)
  };

  if !studio_mode {
    pb.set_style(
      ProgressStyle::default_bar()
        .template(
          "{spinner:.green} [{elapsed_precise}] [{bar:40.cyan/blue}] {pos}/{len} ({eta})\n{msg}",
        )
        .unwrap()
        .progress_chars("#>-"),
    );
  }

  let mut log_file = if let Some(path) = log_path {
    let mut file = std::fs::OpenOptions::new()
      .create(true)
      .append(true)
      .open(path)
      .ok();

    if let Some(ref mut f) = file {
      use std::io::Write;
      let _ = writeln!(f, "==================================================");
      let _ = writeln!(f, "Starting new training run ({} epochs)", epochs);
      let _ = writeln!(f, "==================================================");
    }
    file
  } else {
    None
  };

  let mut best_val_loss = f32::MAX;
  let mut epochs_without_improvement = 0;
  let mut final_epoch = 0;
  let mut final_val_loss = 0.0;
  let mut stopped_early = false;
  let mut prev_msg = String::new();
  let mut last_two_msgs = String::new();

  for epoch in 1..=epochs {
    let mut total_train_loss = 0.0;

    for batch_idx in 0..num_batches {
      let start = batch_idx * batch_size;
      let len = std::cmp::min(batch_size, num_rows - start);

      let x_batch = x_train.narrow(0, start, len)?;
      let y_batch = y_train.narrow(0, start, len)?;

      // Forward pass
      let y_pred = model.forward(&x_batch)?;

      // Compute Loss and Gradient of the loss with respect to predictions
      let (batch_loss, d_loss_d_y) = loss_fn.compute(&y_pred, &y_batch)?;
      total_train_loss += batch_loss * (len as f32);

      // Model computes its own gradients manually
      let grads = model.backward(&x_batch, &d_loss_d_y)?;

      // Training loop grabs params and tells optimizer to step
      optimizer.step(&mut model.params_mut(), &grads)?;
    }

    let avg_train_loss = total_train_loss / (num_rows as f32);

    // Evaluate on validation set
    let val_pred = model.forward(&x_val)?;
    let (val_loss, _) = loss_fn.compute(&val_pred, &y_val)?;

    if epoch % (epochs.max(20) / 20) == 0 || epoch == epochs || epoch == 1 {
      let current_msg = format!(
        "Epoch {:5} | Train Loss: {:.4} | Val Loss: {:.4}",
        epoch, avg_train_loss, val_loss
      );
      if prev_msg.is_empty() {
        last_two_msgs = current_msg.clone();
      } else {
        last_two_msgs = format!("{}\n{}", current_msg, prev_msg);
      }

      if studio_mode {
        let bar_len = 40;
        let pos = epoch * bar_len / epochs;
        let progress_chars = "#".repeat(pos);
        let space_chars = "-".repeat(bar_len - pos);
        let pb_str = format!(
          "\r[{}{}] {}/{} {}",
          progress_chars,
          space_chars,
          epoch,
          epochs,
          last_two_msgs.replace("\n", " || ")
        );
        eprint!("{}", pb_str);
      } else {
        pb.set_message(last_two_msgs.clone());
      }

      if let Some(ref mut f) = log_file {
        use std::io::Write;
        let _ = writeln!(f, "{}", current_msg);
      }
      prev_msg = current_msg;
    }

    pb.inc(1);

    if patience > 0 {
      if best_val_loss - val_loss > tolerance as f32 {
        best_val_loss = val_loss;
        epochs_without_improvement = 0;
      } else {
        epochs_without_improvement += 1;
        if epochs_without_improvement >= patience {
          stopped_early = true;
          break;
        }
      }
    }

    final_epoch = epoch;
    final_val_loss = val_loss;
  }

  let summary = if stopped_early {
    format!(
      "Training stopped early at epoch {} (No improvement for {} epochs). Best Val Loss: {:.4}",
      final_epoch, patience, best_val_loss
    )
  } else {
    format!(
      "Training completed after {} epochs. Final Val Loss: {:.4}",
      final_epoch, final_val_loss
    )
  };

  if studio_mode {
    tracing::info!("\n{}", summary);
  } else {
    if stopped_early {
      pb.abandon_with_message(format!("{}\n{}", last_two_msgs, summary));
    } else {
      pb.finish_with_message(format!("{}\n{}", last_two_msgs, summary));
    }
  }

  if let Some(ref mut f) = log_file {
    use std::io::Write;
    let _ = writeln!(f, "==================================================");
    let _ = writeln!(f, "{}", summary);
  }

  Ok(())
}

#[cfg(test)]
mod tests {
  use super::*;
  use crate::loss::mse::MSE;
  use crate::model::algo::LinearRegression;
  use crate::optim::sgd::SGD;
  use polars::prelude::*;

  fn get_dummy_dataset() -> Result<Dataset> {
    let s_x = Series::new("x".into(), &[1.0f32, 2.0, 3.0]);
    let s_y = Series::new("y".into(), &[2.0f32, 4.0, 6.0]);
    let df = DataFrame::new(vec![s_x, s_y]).unwrap();
    Ok(Dataset { df })
  }

  #[test]
  fn test_fit_decreases_loss() -> Result<()> {
    let device = Device::Cpu;
    let dataset = get_dummy_dataset()?;

    let mut model = LinearRegression::new(1, &device)?;
    let mut optim = SGD::new(0.01);
    let loss_fn = MSE;

    let (x_ds, y_ds) = dataset.split_features_target("y").unwrap();
    let x = x_ds.to_tensor(&device).unwrap();
    let y = y_ds.to_tensor(&device).unwrap();
    let y_pred_initial = model.forward(&x)?;
    let (initial_loss, _) = loss_fn.compute(&y_pred_initial, &y)?;

    fit(
      &mut model, &mut optim, &loss_fn, &dataset,
      &dataset, // val is same as train for this test
      "y", &device, 10, 3, 10, 1e-4, None,
    )?;

    let y_pred_final = model.forward(&x)?;
    let (final_loss, _) = loss_fn.compute(&y_pred_final, &y)?;

    // The model should have learned, so loss should strictly decrease
    assert!(final_loss < initial_loss);

    Ok(())
  }
}
