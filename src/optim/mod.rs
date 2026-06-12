use candle_core::{Result, Tensor};

pub mod sgd;

pub trait Optimizer {
  /// Given a list of mutable references to parameters and a list of their respective gradients,
  /// this function will update the parameters according to the optimizer's algorithm.
  fn step(&mut self, params: &mut [&mut Tensor], grads: &[Tensor]) -> Result<()>;
}
