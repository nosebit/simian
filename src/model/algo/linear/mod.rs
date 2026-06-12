#![doc = include_str!("README.md")]
use crate::model::Model;
use crate::Device;
use candle_core::{DType, Result, Tensor};

pub struct LinearRegression {
  pub weights: Tensor,
  pub bias: Tensor,
}

impl LinearRegression {
  /// Creates a new Linear Regression model with initialized weights and bias.
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

impl Model for LinearRegression {
  type Optim = crate::optim::sgd::SGD;
  type LossFn = crate::loss::mse::MSE;

  fn optimizer(&self, learning_rate: f64) -> Self::Optim {
    crate::optim::sgd::SGD::new(learning_rate)
  }

  fn loss(&self) -> Self::LossFn {
    crate::loss::mse::MSE
  }

  fn forward(&self, x: &Tensor) -> Result<Tensor> {
    // y_hat = X * W + b
    x.matmul(&self.weights)?.broadcast_add(&self.bias)
  }

  fn backward(&self, x: &Tensor, d_loss_d_y: &Tensor) -> Result<Vec<Tensor>> {
    // dL/dw = x^T * d_loss_d_y
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
  fn test_linear_forward() -> Result<()> {
    let device = Device::Cpu;
    let mut model = LinearRegression::new(2, &device)?;

    model.weights = Tensor::new(&[[2.0f32], [3.0]], &device.as_candle().unwrap())?;
    model.bias = Tensor::new(&[1.0f32], &device.as_candle().unwrap())?;

    let x = Tensor::new(&[[1.0f32, 2.0], [0.0, -1.0]], &device.as_candle().unwrap())?;
    let y_hat = model.forward(&x)?;

    let y_hat_vec = y_hat.to_vec2::<f32>()?;
    assert_eq!(y_hat_vec[0], vec![9.0]);
    assert_eq!(y_hat_vec[1], vec![-2.0]);

    Ok(())
  }

  #[test]
  fn test_linear_backward() -> Result<()> {
    let device = Device::Cpu;
    let model = LinearRegression::new(2, &device)?;

    let x = Tensor::new(&[[1.0f32, 2.0], [0.0, -1.0]], &device.as_candle().unwrap())?;
    let d_loss_d_y = Tensor::new(&[[0.5f32], [-0.5]], &device.as_candle().unwrap())?;

    let grads = model.backward(&x, &d_loss_d_y)?;
    assert_eq!(grads.len(), 2);

    let d_weights = grads[0].to_vec2::<f32>()?;
    assert_eq!(d_weights[0], vec![0.5]);
    assert_eq!(d_weights[1], vec![1.5]);

    let d_bias = grads[1].to_vec2::<f32>()?;
    assert_eq!(d_bias[0], vec![0.0]);

    Ok(())
  }

  #[test]
  fn test_linear_save_load() -> anyhow::Result<()> {
    let device = Device::Cpu;
    let mut model = LinearRegression::new(2, &device)?;
    model.weights = Tensor::new(&[[2.0f32], [3.0]], &device.as_candle().unwrap())?;
    model.bias = Tensor::new(&[1.0f32], &device.as_candle().unwrap())?;

    let tmp_dir = tempfile::tempdir()?;
    let path = tmp_dir.path().join("model.st");
    model.save(path.to_str().unwrap())?;

    let loaded = LinearRegression::load(path.to_str().unwrap(), &device)?;
    let loaded_w = loaded.weights.to_vec2::<f32>()?;
    let loaded_b = loaded.bias.to_vec1::<f32>()?;

    assert_eq!(loaded_w[0], vec![2.0]);
    assert_eq!(loaded_w[1], vec![3.0]);
    assert_eq!(loaded_b, vec![1.0]);

    Ok(())
  }
}
