#![doc = include_str!("README.md")]
use super::Optimizer;
use candle_core::{Result, Tensor};

/// Stochastic Gradient Descent (SGD) Optimizer.
///
/// # What is Gradient Descent?
/// Gradient descent is an optimization algorithm used to find the values of parameters (weights and biases)
/// that minimize a cost function (like Mean Squared Error).
/// Imagine standing on a hilly terrain and wanting to reach the lowest valley. The "gradient" tells you
/// the direction of the steepest ascent. To reach the bottom, you take a step in the *opposite*
/// direction of the gradient.
///
/// The formula for updating a parameter `w` is:
/// w_new = w_old - (learning_rate * gradient_of_w)
///
/// # What is the Learning Rate?
/// The `learning_rate` is the size of the step you take.
/// - If it's too large, you might overshoot the valley and diverge.
/// - If it's too small, it will take a very long time to reach the bottom.
///
/// # SGD vs GD and the Role of `batch_size`
/// When we compute the gradient, we can do it using:
/// 1. The entire dataset: This is called **Batch Gradient Descent (GD)**. It's accurate but very
///    slow and memory-intensive for large datasets.
/// 2. A single example: This is pure **Stochastic Gradient Descent (SGD)**. It's very fast but
///    the path to the minimum is extremely noisy and erratic.
/// 3. A small subset (e.g., 32, 64 examples): This is **Mini-Batch SGD**. It offers the best of
///    both worlds: faster computation than GD and a smoother convergence path than pure SGD.
///
/// Therefore, the `batch_size` parameter in the training loop controls which variant we are using:
/// - `batch_size = 1` -> Pure SGD
/// - `1 < batch_size < dataset_size` -> Mini-Batch SGD
/// - `batch_size = dataset_size` -> Batch Gradient Descent
pub struct SGD {
  learning_rate: f64,
}

impl SGD {
  pub fn new(learning_rate: f64) -> Self {
    Self { learning_rate }
  }
}

impl Optimizer for SGD {
  /// Steps the optimizer, updating the parameters based on their gradients.
  fn step(&mut self, params: &mut [&mut Tensor], grads: &[Tensor]) -> Result<()> {
    assert_eq!(
      params.len(),
      grads.len(),
      "Number of parameters and gradients must match"
    );

    // Iterate through each parameter and its corresponding gradient
    for (param, grad) in params.iter_mut().zip(grads.iter()) {
      // We want to perform: param = param - learning_rate * grad

      // First, scale the gradient by the learning rate
      // Since we are moving in the opposite direction of the gradient to minimize the loss,
      // we multiply by a negative learning rate.
      let step = (grad * -self.learning_rate)?;

      // Apply the step to the parameter.
      // In Candle, since Tensors are largely immutable, we assign a new Tensor to the parameter reference.
      // This represents updating the weights of our model.
      **param = param.broadcast_add(&step)?;
    }

    Ok(())
  }
}

#[cfg(test)]
mod tests {
  use super::*;
  use crate::Device;

  #[test]
  fn test_sgd_step() -> Result<()> {
    let device = Device::Cpu;
    let mut optim = SGD::new(0.1);

    let mut param = Tensor::new(&[1.0f32, 2.0], &device.as_candle().unwrap())?;
    let grad = Tensor::new(&[0.5f32, -1.0], &device.as_candle().unwrap())?;

    optim.step(&mut [&mut param], &[grad])?;

    // param_new = param_old - lr * grad
    // new_param = [1.0, 2.0] - 0.1 * [0.5, -1.0] = [0.95, 2.1]
    let param_vec = param.to_vec1::<f32>()?;
    assert!((param_vec[0] - 0.95).abs() < 1e-5);
    assert!((param_vec[1] - 2.1).abs() < 1e-5);

    Ok(())
  }
}
