use crate::data::Split;
use crate::loss::{Loss, mse::MSE};
use crate::model::Model;
use anyhow::Result;
use candle_core::Tensor;

/// Computes the Mean Squared Error (MSE) between predictions and targets.
pub fn mse_score(predictions: &Tensor, targets: &Tensor) -> Result<f32> {
  let (mse_val, _) = MSE.compute(predictions, targets)?;
  Ok(mse_val)
}

/// Computes the R-squared (R²) score, the coefficient of determination.
/// 1.0 is a perfect prediction.
pub fn r2_score(predictions: &Tensor, targets: &Tensor) -> Result<f32> {
  // R² = 1 - (SS_res / SS_tot)
  // SS_res = sum((y_true - y_pred)^2)
  // SS_tot = sum((y_true - y_mean)^2)

  let ss_res = targets
    .sub(predictions)?
    .sqr()?
    .sum_all()?
    .to_scalar::<f32>()?;
  let y_mean = targets.mean_all()?;
  let ss_tot = targets
    .broadcast_sub(&y_mean)?
    .sqr()?
    .sum_all()?
    .to_scalar::<f32>()?;

  if ss_tot == 0.0 {
    return Ok(0.0);
  }

  Ok(1.0 - (ss_res / ss_tot))
}

/// Computes Accuracy (fraction of correct predictions).
pub fn accuracy_score(predictions: &Tensor, targets: &Tensor) -> Result<f32> {
  let y_pred = predictions.to_vec2::<f32>()?;
  let y_true = targets.to_vec2::<f32>()?;

  let mut correct = 0;
  let total = y_true.len();

  for i in 0..total {
    let pred = if y_pred[i][0] >= 0.5 { 1.0 } else { 0.0 };
    if (pred - y_true[i][0]).abs() < 1e-5 {
      correct += 1;
    }
  }

  if total == 0 {
    return Ok(0.0);
  }
  Ok(correct as f32 / total as f32)
}

/// Computes the F1-Score (harmonic mean of precision and recall).
pub fn f1_score(predictions: &Tensor, targets: &Tensor) -> Result<f32> {
  let y_pred = predictions.to_vec2::<f32>()?;
  let y_true = targets.to_vec2::<f32>()?;

  let mut tp = 0.0;
  let mut fp = 0.0;
  let mut fn_val = 0.0;

  let total = y_true.len();

  for i in 0..total {
    let pred = if y_pred[i][0] >= 0.5 { 1.0 } else { 0.0 };
    let truth = y_true[i][0];

    if pred == 1.0 && truth == 1.0 {
      tp += 1.0;
    }
    if pred == 1.0 && truth == 0.0 {
      fp += 1.0;
    }
    if pred == 0.0 && truth == 1.0 {
      fn_val += 1.0;
    }
  }

  if tp + fp == 0.0 {
    return Ok(0.0);
  }
  let precision = tp / (tp + fp);
  if tp + fn_val == 0.0 {
    return Ok(0.0);
  }
  let recall = tp / (tp + fn_val);

  if precision + recall == 0.0 {
    return Ok(0.0);
  }

  Ok(2.0 * (precision * recall) / (precision + recall))
}

/// Runs a cross-validation evaluation over a set of folds for regression.
/// `train_fn` is a closure that takes a training `Dataset` and returns a fully trained `Model`.
/// Returns a tuple of (Average MSE, Average R²).
pub fn cv_regression<F, M>(
  folds: &[Split],
  mut train_fn: F,
  target_col: &str,
  device: &crate::Device,
) -> Result<(f32, f32)>
where
  F: FnMut(&crate::data::Dataset) -> Result<M>,
  M: Model,
{
  let mut total_mse = 0.0;
  let mut total_r2 = 0.0;
  let k = folds.len() as f32;

  for (i, (train_data, test_data)) in folds.iter().enumerate() {
    // 1. Train a fresh model on the training fold
    let trained_model = train_fn(train_data)?;

    // 2. Evaluate on the test fold
    let (x_test_ds, y_test_ds) = test_data.split_features_target(target_col)?;
    let predictions = trained_model.predict(&x_test_ds, device)?;
    let y_test = y_test_ds.to_tensor(device)?;

    let fold_mse = mse_score(&predictions, &y_test)?;
    let fold_r2 = r2_score(&predictions, &y_test)?;

    tracing::info!("Fold {}: MSE = {:.4}, R² = {:.4}", i + 1, fold_mse, fold_r2);

    total_mse += fold_mse;
    total_r2 += fold_r2;
  }

  Ok((total_mse / k, total_r2 / k))
}

/// Runs a cross-validation evaluation over a set of folds for classification.
/// `train_fn` is a closure that takes a training `Dataset` and returns a fully trained `Model`.
/// Returns a tuple of (Average Accuracy, Average F1).
pub fn cv_classification<F, M>(
  folds: &[Split],
  mut train_fn: F,
  target_col: &str,
  device: &crate::Device,
) -> Result<(f32, f32)>
where
  F: FnMut(&crate::data::Dataset) -> Result<M>,
  M: Model,
{
  let mut total_acc = 0.0;
  let mut total_f1 = 0.0;
  let k = folds.len() as f32;

  for (i, (train_data, test_data)) in folds.iter().enumerate() {
    // 1. Train a fresh model on the training fold
    let trained_model = train_fn(train_data)?;

    // 2. Evaluate on the test fold
    let (x_test_ds, y_test_ds) = test_data.split_features_target(target_col)?;
    let predictions = trained_model.predict(&x_test_ds, device)?;
    let y_test = y_test_ds.to_tensor(device)?;

    let fold_acc = accuracy_score(&predictions, &y_test)?;
    let fold_f1 = f1_score(&predictions, &y_test)?;

    tracing::info!(
      "Fold {}: Accuracy = {:.4}, F1 = {:.4}",
      i + 1,
      fold_acc,
      fold_f1
    );

    total_acc += fold_acc;
    total_f1 += fold_f1;
  }

  Ok((total_acc / k, total_f1 / k))
}

#[cfg(test)]
mod tests {
  use super::*;
  use crate::Device;

  #[test]
  fn test_mse_score() -> Result<()> {
    let device = Device::Cpu;
    let y_pred = Tensor::new(&[[1.0f32], [2.0], [3.0]], &device.as_candle().unwrap())?;
    let y_true = Tensor::new(&[[1.0f32], [1.0], [5.0]], &device.as_candle().unwrap())?;

    let mse = mse_score(&y_pred, &y_true)?;
    // (0^2 + 1^2 + (-2)^2) / 3 = 5 / 3 = 1.666...
    assert!((mse - 1.6666666).abs() < 1e-5);
    Ok(())
  }

  #[test]
  fn test_r2_score() -> Result<()> {
    let device = Device::Cpu;
    let y_pred = Tensor::new(
      &[[2.5f32], [0.0], [2.0], [8.0]],
      &device.as_candle().unwrap(),
    )?;
    let y_true = Tensor::new(
      &[[3.0f32], [-0.5], [2.0], [7.0]],
      &device.as_candle().unwrap(),
    )?;

    // y_mean = 2.875
    // SS_res = 1.5
    // SS_tot = 29.1875
    // R2 = 1 - (1.5 / 29.1875) = 0.94860816
    let r2 = r2_score(&y_pred, &y_true)?;
    assert!((r2 - 0.94860816).abs() < 1e-5);
    Ok(())
  }

  #[test]
  fn test_r2_score_perfect() -> Result<()> {
    let device = Device::Cpu;
    let y_true = Tensor::new(&[[1.0f32], [2.0], [3.0]], &device.as_candle().unwrap())?;
    let r2 = r2_score(&y_true, &y_true)?;
    assert!((r2 - 1.0).abs() < 1e-5);
    Ok(())
  }
}
