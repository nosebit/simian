use candle_core::{Result, Tensor};

pub mod mse;
pub mod bce;

pub trait Loss {
  /// Computes the loss value (a scalar) and the gradient of the loss with respect to the predictions.
  /// Returns a tuple: (loss_value, d_loss_d_y_pred)
  fn compute(&self, y_pred: &Tensor, y_true: &Tensor) -> Result<(f32, Tensor)>;
}
