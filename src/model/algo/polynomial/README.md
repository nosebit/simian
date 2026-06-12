# Polynomial Regression

Polynomial regression is a form of regression analysis in which the relationship between the independent variable $\mathbf{x}$ and the dependent variable $y$ is modeled as an $n$th degree polynomial in $\mathbf{x}$. 

Even though we are fitting a non-linear model to the data, Polynomial Regression is considered a special case of Multiple Linear Regression. This is because the model is still *linear in its parameters* (the weights). We achieve this by applying a non-linear transformation—a basis expansion $\phi(\mathbf{x})$—to the input features before feeding them into a standard linear model.

For a single feature $x$ and a polynomial of degree $d$, our expanded feature vector becomes:
$$
\phi(x) = (x, x^2, x^3, \dots, x^d)
$$

And the model family takes the form:
$$
f_{\mathbf{w},b}(x) = b + w_1 x + w_2 x^2 + \dots + w_d x^d
$$

For multiple features $\mathbf{x} = (x_1, x_2, \dots, x_n)$, our `PolynomialFeatures` preparer expands each feature up to degree $d$ independently:
$$
\phi(\mathbf{x}) = (x_1, x_1^2, \dots, x_1^d, \quad x_2, x_2^2, \dots, x_2^d, \quad \dots \quad x_n, x_n^2, \dots, x_n^d)
$$

### Matrix Form

Given $m$ data points in our training set, we define the expanded design matrix $\Phi(X)$ by applying the transformation $\phi$ to every row:

$$
\Phi(X) =
\begin{bmatrix}
1 & \phi(\mathbf{x}_1) \\
1 & \phi(\mathbf{x}_2) \\
\vdots & \vdots \\
1 & \phi(\mathbf{x}_m) \\
\end{bmatrix}
$$

Our parameter matrix $W$ is similarly expanded to match the new dimensions:

$$
W = \begin{bmatrix}
  b \\
  \mathbf{w}
\end{bmatrix}
$$

where $\mathbf{w}$ now contains a weight for every polynomial term. The forward pass of the model is exactly the same as linear regression, but uses the transformed matrix:

$$
f_W(X) = \Phi(X) W
$$

### Loss Function

Since the model is fundamentally a linear model acting on transformed data, the loss function remains the Mean Squared Error (MSE):

$$
\mathcal{L}_{\text{MSE}}(\mathbf{w},b) = \frac{1}{2m} \sum_{k=1}^{m}(b + \phi(\mathbf{x}_k) \cdot \mathbf{w} - y_k)^2
$$

The optimization process (e.g., using Stochastic Gradient Descent) works identically by finding $\argmin_{\textbf{w},b} \mathcal{L}_{\text{MSE}}(\textbf{w}, b)$.
