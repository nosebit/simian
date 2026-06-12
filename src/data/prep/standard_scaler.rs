use super::Preparer;
use crate::data::Dataset;
use anyhow::Result;
use polars::prelude::*;

/// Standardizes features by removing the mean and scaling to unit variance.
pub struct StandardScaler {
  means: Vec<f64>,
  stds: Vec<f64>,
  col_names: Vec<String>,
}

impl Default for StandardScaler {
  fn default() -> Self {
    Self::new()
  }
}

impl StandardScaler {
  pub fn new() -> Self {
    Self {
      means: Vec::new(),
      stds: Vec::new(),
      col_names: Vec::new(),
    }
  }
}

impl Preparer for StandardScaler {
  fn fit(&mut self, dataset: &Dataset) -> Result<()> {
    let data = &dataset.df;
    self.col_names = data
      .get_column_names()
      .into_iter()
      .map(|s| s.to_string())
      .collect();
    self.means = Vec::with_capacity(self.col_names.len());
    self.stds = Vec::with_capacity(self.col_names.len());

    for col_name in &self.col_names {
      let s = data.column(col_name)?;
      // Only scale numeric columns
      if s.dtype().is_numeric() {
        let mean = s.cast(&DataType::Float64)?.f64()?.mean().unwrap_or(0.0);
        let mut std = s.cast(&DataType::Float64)?.f64()?.std(1).unwrap_or(1.0);
        if std == 0.0 {
          std = 1.0;
        }
        self.means.push(mean);
        self.stds.push(std);
      } else {
        self.means.push(0.0);
        self.stds.push(1.0);
      }
    }
    Ok(())
  }

  fn apply(&self, dataset: &Dataset) -> Result<Dataset> {
    if self.col_names.is_empty() {
      anyhow::bail!("StandardScaler is not fitted yet. Call fit() first.");
    }

    let mut exprs = Vec::with_capacity(self.col_names.len());
    let data = &dataset.df;
    for (i, col_name) in self.col_names.iter().enumerate() {
      // Only apply scaling if the column exists in the current DataFrame
      if data.get_column_names().contains(&col_name.as_str()) {
        let mean = self.means[i];
        let std = self.stds[i];
        if std != 1.0 || mean != 0.0 {
          exprs.push(((col(col_name) - lit(mean)) / lit(std)).alias(col_name));
        }
      }
    }

    let scaled = data.clone().lazy().with_columns(exprs).collect()?;
    Ok(Dataset { df: scaled })
  }
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn test_standard_scaler() -> Result<()> {
    let mut scaler = StandardScaler::new();

    let s = Series::new("x", &[1.0f64, 2.0, 3.0, 4.0, 5.0]);
    let df = DataFrame::new(vec![s])?;
    let dataset = Dataset { df };

    scaler.fit(&dataset)?;

    // Mean of 1..5 is 3.0
    // Std dev of 1..5 with ddof=1 is sqrt(2.5) ~ 1.5811388
    assert!((scaler.means[0] - 3.0).abs() < 1e-5);
    assert!((scaler.stds[0] - 1.5811388).abs() < 1e-5);

    let scaled_ds = scaler.apply(&dataset)?;
    let scaled_df = scaled_ds.df;
    let scaled_s = scaled_df.column("x")?.f64()?;

    let val_0 = scaled_s.get(0).unwrap();
    assert!((val_0 - -1.264911).abs() < 1e-5);

    let scaled_mean = scaled_s.mean().unwrap();
    let scaled_std = scaled_s.std(1).unwrap();

    assert!(scaled_mean.abs() < 1e-5);
    assert!((scaled_std - 1.0).abs() < 1e-5);

    Ok(())
  }
}
