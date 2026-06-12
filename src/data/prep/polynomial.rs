use super::Preparer;
use crate::data::Dataset;
use anyhow::Result;
use polars::prelude::*;

/// Generates polynomial features.
/// Given an input DataFrame with features X,
/// this preparer will output a new DataFrame containing [X, X^2, X^3, ..., X^degree].
pub struct PolynomialFeatures {
  degree: usize,
}

impl PolynomialFeatures {
  pub fn new(degree: usize) -> Self {
    Self { degree }
  }
}

impl Preparer for PolynomialFeatures {
  fn fit(&mut self, _dataset: &Dataset) -> Result<()> {
    // PolynomialFeatures does not need to learn any parameters from the data.
    Ok(())
  }

  fn apply(&self, dataset: &Dataset) -> Result<Dataset> {
    if self.degree <= 1 {
      return Ok(dataset.clone());
    }

    let mut exprs = Vec::new();
    let data = &dataset.df;

    for col_name in data.get_column_names() {
      // Keep the original feature
      exprs.push(col(col_name));

      // Only generate polynomial features for numeric columns
      if data.column(col_name)?.dtype().is_numeric() {
        for d in 2..=self.degree {
          let alias_name = format!("{}^{}", col_name, d);
          exprs.push(col(col_name).pow(d as f64).alias(&alias_name));
        }
      }
    }

    let poly_df = data.clone().lazy().select(exprs).collect()?;
    Ok(Dataset { df: poly_df })
  }
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn test_polynomial_features() -> Result<()> {
    let mut poly = PolynomialFeatures::new(3);

    let s = Series::new("x".into(), &[1.0f64, 2.0, 3.0]);
    let df = DataFrame::new(vec![s])?;
    let dataset = Dataset { df };

    poly.fit(&dataset)?;
    let poly_ds = poly.apply(&dataset)?;
    let poly_df = poly_ds.df;

    assert_eq!(poly_df.width(), 3);
    assert_eq!(poly_df.get_column_names(), vec!["x", "x^2", "x^3"]);

    let x2 = poly_df.column("x^2")?.f64()?;
    assert_eq!(x2.get(0).unwrap(), 1.0);
    assert_eq!(x2.get(1).unwrap(), 4.0);
    assert_eq!(x2.get(2).unwrap(), 9.0);

    let x3 = poly_df.column("x^3")?.f64()?;
    assert_eq!(x3.get(0).unwrap(), 1.0);
    assert_eq!(x3.get(1).unwrap(), 8.0);
    assert_eq!(x3.get(2).unwrap(), 27.0);

    Ok(())
  }
}
