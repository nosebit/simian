#![doc = include_str!("README.md")]
use crate::data::Dataset;
use crate::Device;
use candle_core::{Result, Tensor};

pub mod algo;
pub mod plot;

pub trait Model {
  /// Preprocesses a dataset before training or evaluation.
  fn preprocess(&self, dataset: &Dataset) -> Result<Dataset> {
    Ok(dataset.clone())
  }

  /// Forward pass (Inference). Expects preprocessed input.
  fn forward(&self, x: &Tensor) -> Result<Tensor>;

  /// Calculates gradients manually based on the loss derivative.
  fn backward(&self, x: &Tensor, d_loss_d_y: &Tensor) -> Result<Vec<Tensor>>;

  /// Exposes mutable references to the model's parameters.
  fn params_mut(&mut self) -> Vec<&mut Tensor>;

  /// Convenience method for inference on raw data.
  fn predict(&self, raw_dataset: &Dataset, device: &Device) -> Result<Tensor> {
    let preprocessed = self.preprocess(raw_dataset)?;
    let features = preprocessed
      .to_tensor(device)
      .map_err(|e| candle_core::Error::Msg(e.to_string()))?;
    self.forward(&features)
  }

  type Optim: crate::optim::Optimizer;
  type LossFn: crate::loss::Loss;

  fn optimizer(&self, learning_rate: f64) -> Self::Optim;
  fn loss(&self) -> Self::LossFn;

  fn fit<'a>(
    &'a mut self,
    train_data: &'a Dataset,
    val_data: &'a Dataset,
    target_col: &'a str,
    device: &'a Device,
  ) -> FitJob<'a, Self>
  where
    Self: Sized,
  {
    FitJob {
      model: self,
      train_data,
      val_data,
      target_col,
      device,
      learning_rate: 0.0001,
      epochs: 1000,
      batch_size: 32,
      patience: 10,
      tolerance: 1e-4,
      log_path: None,
    }
  }

  fn fit_with<O: crate::optim::Optimizer, L: crate::loss::Loss>(
    &mut self,
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
  ) -> Result<()>
  where
    Self: Sized,
  {
    crate::train::fit(
      self, optimizer, loss_fn, train_data, val_data, target_col, device, epochs, batch_size,
      patience, tolerance, log_path,
    )
  }

  fn plot<'a>(
    &'a self,
    dataset: &'a Dataset,
    x_cols: &[&'a str],
    y_col: &'a str,
    device: &'a Device,
  ) -> crate::model::plot::ModelPlotJob<'a, Self>
  where
    Self: Sized,
  {
    crate::model::plot::ModelPlotJob::new(dataset, self, x_cols, y_col, device)
  }
}

pub struct FitJob<'a, M: Model> {
  model: &'a mut M,
  train_data: &'a Dataset,
  val_data: &'a Dataset,
  target_col: &'a str,
  device: &'a Device,
  learning_rate: f64,
  epochs: usize,
  batch_size: usize,
  patience: usize,
  tolerance: f64,
  log_path: Option<String>,
}

impl<'a, M: Model> FitJob<'a, M> {
  pub fn learning_rate(mut self, lr: f64) -> Self {
    self.learning_rate = lr;
    self
  }

  pub fn epochs(mut self, e: usize) -> Self {
    self.epochs = e;
    self
  }

  pub fn batch_size(mut self, b: usize) -> Self {
    self.batch_size = b;
    self
  }

  pub fn patience(mut self, p: usize) -> Self {
    self.patience = p;
    self
  }

  pub fn tolerance(mut self, t: f64) -> Self {
    self.tolerance = t;
    self
  }

  pub fn log_path(mut self, lp: Option<String>) -> Self {
    self.log_path = lp;
    self
  }

  pub fn run(self) -> Result<()> {
    let mut opt = self.model.optimizer(self.learning_rate);
    let loss = self.model.loss();
    self.model.fit_with(
      &mut opt,
      &loss,
      self.train_data,
      self.val_data,
      self.target_col,
      self.device,
      self.epochs,
      self.batch_size,
      self.patience,
      self.tolerance,
      self.log_path,
    )
  }
}
