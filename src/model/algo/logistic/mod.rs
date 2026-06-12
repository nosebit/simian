use crate::model::Model;
use crate::Device;
use candle_core::{DType, Result, Tensor};

pub struct LogisticRegression {
  pub weights: Tensor,
  pub bias: Tensor,
}

impl LogisticRegression {
  /// Creates a new Logistic Regression model with initialized weights and bias.
  pub fn new(num_features: usize, device: &Device) -> Result<Self> {
    let c_device = device.as_candle().unwrap();
    let weights = Tensor::randn(0f32, 0.01, (num_features, 1), &c_device)?;
    let bias = Tensor::zeros(1, DType::F32, &c_device)?;
    Ok(Self { weights, bias })
  }

  /// Saves the model weights to a file.
  pub fn save(&self, path: &str) -> anyhow::Result<()> {
    let mut tensors = std::collections::HashMap::new();
    tensors.insert("weights".to_string(), self.weights.clone());
    tensors.insert("bias".to_string(), self.bias.clone());
    candle_core::safetensors::save(&tensors, path)?;
    Ok(())
  }

  /// Loads the model weights from a file.
  pub fn load(path: &str, device: &Device) -> anyhow::Result<Self> {
    let c_device = device.as_candle()?;
    let tensors = candle_core::safetensors::load(path, &c_device)?;
    use anyhow::Context;
    let weights = tensors
      .get("weights")
      .context("Missing 'weights' tensor")?
      .clone();
    let bias = tensors
      .get("bias")
      .context("Missing 'bias' tensor")?
      .clone();
    Ok(Self { weights, bias })
  }
}

impl Model for LogisticRegression {
  type Optim = crate::optim::sgd::SGD;
  type LossFn = crate::loss::bce::BCE;

  fn optimizer(&self, learning_rate: f64) -> Self::Optim {
    crate::optim::sgd::SGD::new(learning_rate)
  }

  fn loss(&self) -> Self::LossFn {
    crate::loss::bce::BCE
  }

  fn forward(&self, x: &Tensor) -> Result<Tensor> {
    // z = X * W + b
    let z = x.matmul(&self.weights)?.broadcast_add(&self.bias)?;
    
    // y_pred = sigmoid(z) = 1 / (1 + exp(-z))
    let neg_z = z.neg()?;
    let exp_neg_z = neg_z.exp()?;
    let ones = Tensor::ones_like(&z)?;
    let den = ones.add(&exp_neg_z)?;
    let y_pred = ones.div(&den)?;

    Ok(y_pred)
  }

  fn backward(&self, x: &Tensor, d_loss_d_y: &Tensor) -> Result<Vec<Tensor>> {
    // Note: The BCELoss implementation computes the gradient of the loss with respect
    // to the logits (z) directly to avoid numerical instability and redundant math.
    // So `d_loss_d_y` here is actually `dL/dz = (y_pred - y) / N`.
    
    // dL/dw = x^T * d_loss_d_y (which is dL/dz)
    let d_weights = x.t()?.matmul(d_loss_d_y)?;

    // dL/db = sum of d_loss_d_y across the batch
    let d_bias = d_loss_d_y.sum_keepdim(0)?;

    Ok(vec![d_weights, d_bias])
  }

  fn params_mut(&mut self) -> Vec<&mut Tensor> {
    vec![&mut self.weights, &mut self.bias]
  }
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn test_logistic_forward() -> Result<()> {
    let device = Device::Cpu;
    let mut model = LogisticRegression::new(2, &device)?;

    model.weights = Tensor::new(&[[2.0f32], [3.0]], &device.as_candle().unwrap())?;
    model.bias = Tensor::new(&[1.0f32], &device.as_candle().unwrap())?;

    let x = Tensor::new(&[[1.0f32, -1.0], [0.0, 0.0]], &device.as_candle().unwrap())?;
    
    // x0: 1*2 + -1*3 + 1 = 0
    // sigmoid(0) = 0.5
    // x1: 0*2 + 0*3 + 1 = 1
    // sigmoid(1) = 0.7310585786
    let y_hat = model.forward(&x)?;

    let y_hat_vec = y_hat.to_vec2::<f32>()?;
    assert!((y_hat_vec[0][0] - 0.5).abs() < 1e-4);
    assert!((y_hat_vec[1][0] - 0.7310586).abs() < 1e-4);

    Ok(())
  }

  #[test]
  fn test_logistic_backward() -> Result<()> {
    let device = Device::Cpu;
    let model = LogisticRegression::new(2, &device)?;

    let x = Tensor::new(&[[1.0f32, 2.0], [0.0, -1.0]], &device.as_candle().unwrap())?;
    let d_loss_d_y = Tensor::new(&[[0.5f32], [-0.5]], &device.as_candle().unwrap())?;

    let grads = model.backward(&x, &d_loss_d_y)?;
    assert_eq!(grads.len(), 2);

    let d_weights = grads[0].to_vec2::<f32>()?;
    assert_eq!(d_weights[0], vec![0.5]);
    assert_eq!(d_weights[1], vec![1.5]);

    Ok(())
  }
}
