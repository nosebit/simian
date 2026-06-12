#![doc = include_str!("README.md")]
use super::linear::LinearRegression;
use crate::Device;
use crate::data::Dataset;
use crate::data::prep::{Preparer, polynomial::PolynomialFeatures};
use crate::model::Model;
use candle_core::{Result, Tensor};

pub struct PolynomialRegression {
  pub degree: usize,
  pub linear: LinearRegression,
}

impl PolynomialRegression {
  /// Creates a new Polynomial Regression model.
  pub fn new(degree: usize, num_features: usize, device: &Device) -> Result<Self> {
    // The linear model needs to know the expanded feature size.
    // If we have 1 feature and degree 3, the expanded size is 3 (x, x^2, x^3).
    // Since we expand each feature purely, the total features will be num_features * degree.
    let expanded_features = num_features * degree;
    let linear = LinearRegression::new(expanded_features, device)?;
    Ok(Self { degree, linear })
  }

  /// Saves the model weights and degree to a file.
  pub fn save(&self, path: &str) -> anyhow::Result<()> {
    let mut tensors = std::collections::HashMap::new();
    tensors.insert("weights".to_string(), self.linear.weights.clone());
    tensors.insert("bias".to_string(), self.linear.bias.clone());

    // Save the degree as a scalar tensor
    let device = self.linear.weights.device();
    let degree_tensor = Tensor::new(&[self.degree as u32], device)?;
    tensors.insert("degree".to_string(), degree_tensor);

    candle_core::safetensors::save(&tensors, path)?;
    Ok(())
  }

  /// Loads the model weights and degree from a file.
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

    let degree_tensor = tensors.get("degree").context("Missing 'degree' tensor")?;
    let degree = degree_tensor.to_vec1::<u32>()?[0] as usize;

    let linear = LinearRegression { weights, bias };
    Ok(Self { degree, linear })
  }
}

impl Model for PolynomialRegression {
  type Optim = crate::optim::sgd::SGD;
  type LossFn = crate::loss::mse::MSE;

  fn optimizer(&self, learning_rate: f64) -> Self::Optim {
    crate::optim::sgd::SGD::new(learning_rate)
  }

  fn loss(&self) -> Self::LossFn {
    crate::loss::mse::MSE
  }

  fn preprocess(&self, dataset: &Dataset) -> Result<Dataset> {
    PolynomialFeatures::new(self.degree)
      .apply(dataset)
      .map_err(|e| candle_core::Error::Msg(e.to_string()))
  }

  fn forward(&self, x: &Tensor) -> Result<Tensor> {
    // Assume x is ALREADY PREPROCESSED by the train/eval loop using preprocess()
    self.linear.forward(x)
  }

  fn backward(&self, x: &Tensor, d_loss_d_y: &Tensor) -> Result<Vec<Tensor>> {
    self.linear.backward(x, d_loss_d_y)
  }

  fn params_mut(&mut self) -> Vec<&mut Tensor> {
    self.linear.params_mut()
  }
}

#[cfg(test)]
mod tests {
  use super::*;
  use polars::prelude::*;

  #[test]
  fn test_polynomial_preprocess() -> Result<()> {
    let device = Device::Cpu;
    let model = PolynomialRegression::new(2, 1, &device)?;

    let s = Series::new("x", &[1.0f32, 2.0, 3.0]);
    let df = DataFrame::new(vec![s]).unwrap();
    let dataset = Dataset { df };

    let preprocessed = model.preprocess(&dataset)?;
    assert_eq!(preprocessed.df.width(), 2);
    assert_eq!(preprocessed.df.get_column_names(), vec!["x", "x^2"]);

    Ok(())
  }

  #[test]
  fn test_polynomial_save_load() -> anyhow::Result<()> {
    let device = Device::Cpu;
    let mut model = PolynomialRegression::new(3, 1, &device)?;
    model.linear.weights = Tensor::new(&[[1.0f32], [2.0], [3.0]], &device.as_candle().unwrap())?;
    model.linear.bias = Tensor::new(&[0.5f32], &device.as_candle().unwrap())?;

    let tmp_dir = tempfile::tempdir()?;
    let path = tmp_dir.path().join("poly_model.st");
    model.save(path.to_str().unwrap())?;

    let loaded = PolynomialRegression::load(path.to_str().unwrap(), &device)?;
    assert_eq!(loaded.degree, 3);

    let loaded_w = loaded.linear.weights.to_vec2::<f32>()?;
    let loaded_b = loaded.linear.bias.to_vec1::<f32>()?;

    assert_eq!(loaded_w[0], vec![1.0]);
    assert_eq!(loaded_w[1], vec![2.0]);
    assert_eq!(loaded_w[2], vec![3.0]);
    assert_eq!(loaded_b, vec![0.5]);

    Ok(())
  }
}
