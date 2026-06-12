use crate::loss::Loss;
use candle_core::{Result, Tensor};

pub struct BCE;

impl Loss for BCE {
  fn compute(&self, y_pred: &Tensor, y_true: &Tensor) -> Result<(f32, Tensor)> {
    // Prevent log(0) by clipping y_pred to [epsilon, 1 - epsilon]
    let epsilon = 1e-7f32;
    let eps_tensor = Tensor::new(epsilon, y_pred.device())?.broadcast_as(y_pred.shape())?;
    let one_minus_eps = Tensor::new(1.0f32 - epsilon, y_pred.device())?.broadcast_as(y_pred.shape())?;
    
    // y_pred_clipped = clamp(y_pred, eps, 1 - eps)
    let y_pred_clipped = y_pred.maximum(&eps_tensor)?.minimum(&one_minus_eps)?;

    let n = y_true.dim(0)? as f32;

    // BCE Loss: -1/N * sum(y * log(y_pred) + (1 - y) * log(1 - y_pred))
    let ones = Tensor::ones_like(y_true)?;
    
    // Term 1: y * log(y_pred)
    let log_y_pred = y_pred_clipped.log()?;
    let term1 = y_true.mul(&log_y_pred)?;
    
    // Term 2: (1 - y) * log(1 - y_pred)
    let one_minus_y = ones.sub(y_true)?;
    let one_minus_y_pred = ones.sub(&y_pred_clipped)?;
    let log_one_minus_y_pred = one_minus_y_pred.log()?;
    let term2 = one_minus_y.mul(&log_one_minus_y_pred)?;
    
    // BCE = term1 + term2
    let bce = term1.add(&term2)?;
    
    // Mean over all samples
    let loss_val = bce.sum_all()?.to_scalar::<f32>()? * (-1.0 / n);

    // Gradient of BCE Loss with respect to *logits* if using sigmoid!
    // But since our Loss trait takes `y_pred` (which is already post-sigmoid),
    // wait. The gradient of BCE w.r.t post-sigmoid y_pred is:
    // dl/dy_pred = (y_pred - y) / (y_pred * (1 - y_pred))
    // HOWEVER, the standard way in ML is that the final layer combines Sigmoid + BCE
    // because the gradient of Sigmoid(BCE) simplifies beautifully to:
    // (y_pred - y) / N
    // If we just return `(y_pred - y) / N` as the gradient, we must NOT apply the
    // sigmoid derivative during the backward pass in the model!
    // Let's assume the gradient returned here is the gradient w.r.t the LOGITS
    // so the model doesn't need to compute the derivative of the Sigmoid.
    // Yes! `(y_pred - y) / N` is the gradient of BCE *with logits*.
    let grad = y_pred.sub(y_true)?.affine(1.0 / (n as f64), 0.0)?;

    Ok((loss_val, grad))
  }
}

#[cfg(test)]
mod tests {
  use super::*;
  use crate::Device;

  #[test]
  fn test_bce_compute() -> Result<()> {
    let bce = BCE;
    let device = Device::Cpu;
    
    // Perfect predictions
    let y_pred = Tensor::new(&[[0.9999f32], [0.0001], [0.9999]], &device.as_candle().unwrap())?;
    let y_true = Tensor::new(&[[1.0f32], [0.0], [1.0]], &device.as_candle().unwrap())?;
    
    let (loss_val, _) = bce.compute(&y_pred, &y_true)?;
    assert!(loss_val < 0.01); // Near zero loss
    
    // Terrible predictions
    let y_pred_bad = Tensor::new(&[[0.0001f32], [0.9999], [0.0001]], &device.as_candle().unwrap())?;
    let (loss_bad, _) = bce.compute(&y_pred_bad, &y_true)?;
    assert!(loss_bad > 5.0); // High loss
    
    Ok(())
  }
}
