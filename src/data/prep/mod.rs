pub mod polynomial;
pub mod standard_scaler;

pub use polynomial::PolynomialFeatures;
pub use standard_scaler::StandardScaler;

use crate::data::Dataset;
use anyhow::Result;


pub trait Preparer {
  /// Learns parameters from the data (e.g., calculates mean and std).
  /// Default implementation does nothing for stateless preparers.
  fn fit(&mut self, _dataset: &Dataset) -> Result<()> {
    Ok(())
  }

  /// Modifies the data and returns the new Dataset.
  fn apply(&self, dataset: &Dataset) -> Result<Dataset>;

  /// Convenience method to fit and apply in one go.
  fn run(&mut self, dataset: &Dataset) -> Result<Dataset> {
    self.fit(dataset)?;
    self.apply(dataset)
  }

  /// Static method to quickly fit and apply an entire Dataset in one go.
  /// Note: In a robust ML pipeline, you should instantiate the preparer, fit it on the Train set,
  /// and apply it to both Train and Test sets separately to prevent data leakage.
  fn fit_apply(dataset: Dataset) -> Result<Dataset>
  where
    Self: Default + Sized,
  {
    let mut preparer = Self::default();
    preparer.run(&dataset)
  }
}
