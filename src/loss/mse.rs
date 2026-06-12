use super::Loss;
use candle_core::{Result, Tensor};

pub struct MSE;

impl Loss for MSE {
  fn compute(&self, y_pred: &Tensor, y_true: &Tensor) -> Result<(f32, Tensor)> {
    // The formula for MSE is: 1/N * sum((y_pred - y_true)^2)

    let diff = y_pred.sub(y_true)?;

    // Compute the squared differences
    let squared_diff = diff.sqr()?;

    // Compute the mean of the squared differences
    let loss_tensor = squared_diff.mean_all()?;
    let loss_value = loss_tensor.to_scalar::<f32>()?;

    // The analytical gradient of MSE with respect to y_pred is:
    // dL/dy_pred = 2/N * (y_pred - y_true)
    // Note: N is the batch size (the first dimension of y_pred).
    let n = y_pred.dim(0)? as f64;
    let d_loss_d_y_pred = (diff * (2.0 / n))?;

    Ok((loss_value, d_loss_d_y_pred))
  }
}

#[cfg(test)]
mod tests {
  use super::*;
  use crate::Device;

  #[test]
  fn test_mse_compute() -> Result<()> {
    let device = Device::Cpu;
    let mse = MSE;

    let y_pred = Tensor::new(&[[1.0f32], [2.0], [3.0]], &device.as_candle().unwrap())?;
    let y_true = Tensor::new(&[[1.0f32], [1.0], [5.0]], &device.as_candle().unwrap())?;

    let (loss_val, grad) = mse.compute(&y_pred, &y_true)?;

    // Mean of squared diffs: 0^2 + 1^2 + (-2)^2 = 5. Mean = 5/3 = 1.666...
    assert!((loss_val - 1.6666666).abs() < 1e-5);

    // Grad: 2/3 * diff = [0, 2/3, -4/3]
    let grad_vec = grad.to_vec2::<f32>()?;
    assert!((grad_vec[0][0] - 0.0).abs() < 1e-5);
    assert!((grad_vec[1][0] - 0.6666666).abs() < 1e-5);
    assert!((grad_vec[2][0] + 1.3333333).abs() < 1e-5);

    Ok(())
  }
}
