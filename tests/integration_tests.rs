use simian::Device;
use simian::data::load_dataset;
use simian::data::splitter::RandomSplitter;
use simian::loss::{bce::BCE, mse::MSE};
use simian::model::algo::LinearRegression;
use simian::model::algo::LogisticRegression;
use simian::model::algo::PolynomialRegression;
use simian::optim::sgd::SGD;
use simian::train::fit;

use std::path::PathBuf;

fn get_fixture_path() -> PathBuf {
  PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures/test.csv")
}

#[test]
fn test_end_to_end_linear_pipeline() -> anyhow::Result<()> {
  let path = get_fixture_path();
  let dataset = load_dataset(path.to_str().unwrap())?;

  let (train_data, val_data) = RandomSplitter::split(dataset, 0.5, Some(42))?;

  let device = Device::Cpu;
  // 2 features (x1, x2), 1 target (y)
  let mut model = LinearRegression::new(2, &device)?;
  let mut optim = SGD::new(0.01);
  let loss_fn = MSE;

  fit(
    &mut model,
    &mut optim,
    &loss_fn,
    &train_data,
    &val_data,
    "y",
    &device,
    1,
    1,
    10,
    1e-4,
    None,
  )?;

  Ok(())
}
#[test]
fn test_end_to_end_polynomial_pipeline() -> anyhow::Result<()> {
  let path = get_fixture_path();
  let dataset = load_dataset(path.to_str().unwrap())?;

  let (train_data, val_data) = RandomSplitter::split(dataset, 0.5, Some(42))?;

  let device = Device::Cpu;
  let mut model = PolynomialRegression::new(2, 2, &device)?; // degree 2, 2 features
  let mut optim = SGD::new(0.01);
  let loss_fn = MSE;

  fit(
    &mut model,
    &mut optim,
    &loss_fn,
    &train_data,
    &val_data,
    "y",
    &device,
    1,
    1,
    10,
    1e-4,
    None,
  )?;

  Ok(())
}

#[test]
fn test_end_to_end_logistic_pipeline() -> anyhow::Result<()> {
  let path = get_fixture_path();
  let dataset = load_dataset(path.to_str().unwrap())?;

  let (train_data, val_data) = RandomSplitter::split(dataset, 0.5, Some(42))?;

  let device = Device::Cpu;
  let mut model = LogisticRegression::new(2, &device)?; // 2 features
  let mut optim = SGD::new(0.01);
  let loss_fn = BCE;

  fit(
    &mut model,
    &mut optim,
    &loss_fn,
    &train_data,
    &val_data,
    "y",
    &device,
    1,
    1,
    10,
    1e-4,
    None,
  )?;

  Ok(())
}
