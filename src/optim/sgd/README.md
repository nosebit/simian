# Gradient Descent Optimizer

The gradient $\nabla{\mathcal{L}}$ of a function $\mathcal{L}(\mathbf{w})$ is a vector of all the partial derivatives $\partial{\mathcal{L}}/\partial{w_k}$ of the function $\mathcal{L}$:

$$
\nabla{\mathcal{L}} = (\frac{\partial{\mathcal{L}}}{\partial{w_0}}, \frac{\partial{\mathcal{L}}}{\partial{w_1}},...,\frac{\partial{\mathcal{L}}}{\partial{w_k}},...,\frac{\partial{\mathcal{L}}}{\partial{w_n}})
$$

where $w_0$ is equivalent to our bias $b$. The gradient points towards where the function increases more rapidly and conversely $-\nabla{\mathcal{L}}$ points towards where the function decreases more rapidly. As we approach the minimum value for $\mathcal{L}$ the gradient $\nabla{\mathcal{L}}$ aproaches zero.

For our linear model the partial derivatives can be computed very easily via the "chain rule" as the following:

$$
\frac{\partial{\mathcal{L}}}{\partial{w_k}} = \begin{cases}
  \frac{1}{m}\sum_{i=1}^{m}(b + \mathbf{x}_i \cdot \mathbf{w} - y_i) & \text{ if } k =0 \\
  \frac{1}{m}\sum_{i=1}^{m}(b + \mathbf{x}_i \cdot \mathbf{w} - y_i)x_{i,k} & \text{ if } k \neq 0
\end{cases}
$$

Being able to compute the gradient $\nabla{\mathcal{L}}$ allow us to "step" in its opposite direction to get a lower value of $\mathcal{L}$. This way we can iteratively produce "better" weights for our model by doing:

$$
\textbf{w}^{(\text{new})}:=\textbf{w}^{(\text{old})}-\alpha\nabla{\mathcal{L}}
$$

where $\alpha$ is called the "learning rate" and measure how big is the step we take on the opposite direction of $\nabla{\mathcal{L}}$ (i.e., in the decreasing direction of $\mathcal{L}$). We should choose this learning rate very carefully because a small learning rate would require a lot of iterations to find the minimal value of $\mathcal{L}$ while a big value might make the iterations to diverge from this minimal value.

## Stochastic Gradient Descent (SGD)

In standard **Batch Gradient Descent**, we compute the gradient of the loss function using the entire dataset of $m$ examples. While this gives an accurate direction towards the minimum, it becomes computationally expensive and memory-intensive when $m$ is very large.

**Stochastic Gradient Descent (SGD)** addresses this by approximating the true gradient using only a *single* training example at each step:

$$
\textbf{w}^{(\text{new})} := \textbf{w}^{(\text{old})} - \alpha \nabla \ell(\textbf{w}^{(\text{old})}; \mathbf{x}_i, y_i)
$$

Because the gradient is estimated from just one example, the path to the minimum is erratic and noisy. However, this allows for much faster iterations and the noise can actually help the model escape local minima.

## Mini-Batch Gradient Descent

In practice, we compromise between the stability of Batch Gradient Descent and the speed of pure SGD by using **Mini-Batch Gradient Descent**. We divide the training set into small batches of size $B$ (where $1 < B < m$):

$$
\mathcal{L}_{\text{mini-batch}}(\mathbf{w}) = \frac{1}{B} \sum_{i=1}^{B} \ell(\mathbf{w}; \mathbf{x}_i, y_i)
$$

And the update rule becomes:

$$
\textbf{w}^{(\text{new})} := \textbf{w}^{(\text{old})} - \alpha \nabla \mathcal{L}_{\text{mini-batch}}(\textbf{w}^{(\text{old})})
$$

Mini-batch SGD leverages the highly optimized matrix multiplication capabilities of modern CPUs and GPUs, providing a smoother convergence path than pure SGD while remaining much faster than Batch Gradient Descent.

### Implementation in Simian

In Simian, the mathematical distinction between these three forms of Gradient Descent is elegantly handled entirely by the training loop within the `fit` function (located in `src/train.rs`). The `SGD` optimizer struct itself is completely agnostic to the batching process—it simply calculates gradients and takes a step based on whatever tensor it receives.

The `batch_size` parameter passed via the CLI controls how the `fit` function chunks the data into `x_batch` and `y_batch` tensors before passing them to the optimizer:

- **`batch_size = 1`**: The loop feeds the model exactly one row at a time. This results in pure **Stochastic Gradient Descent (SGD)**.
- **`1 < batch_size < m`**: The loop feeds chunks of data. This results in **Mini-Batch Gradient Descent**.
- **`batch_size = m`**: The loop executes exactly once, feeding the massive matrix of the entire dataset. This results in standard **Batch Gradient Descent**.
