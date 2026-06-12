# Linear Regression

In linear regression our model family has the form $f_{\mathbf{w},b}(\mathbf{x}) = b + \mathbf{x} \cdot \mathbf{w}$ where both $b \in \mathbb{R}$ (called the bias) and $\mathbf{w} \in \mathbb{R}^n$ (called the weights of the model) are parameters of the linear model. Many times is useful to interpret $b$ as a $w_0$ and extend $\mathbf{w}=(w_0,w_1,...w_n) \in \mathbb{R}^{n+1}$ to be our single weights vector. If we also extend $\mathbf{x}=(1,x_1,...,x_n)$, then we can rewrite our model to be simply $f_\mathbf{w}(\mathbf{x})=\mathbf{x} \cdot \mathbf{w}$.

For our linear model the quadratic loss can be written as:

$$
\ell_2(\textbf{w},b) = \frac{1}{2}(b + \mathbf{x} \cdot \mathbf{w} - y)^2
$$

And our total loss can be written as:

$$
\mathcal{L}_{\text{MSE}}(\mathbf{w},b) = \frac{1}{2m} \sum_{k=1}^{m}(b + \mathbf{x}_k \cdot \mathbf{w} - y_k)^2
$$

This way our optimization problem becomes simply $\argmin_{\textbf{w},b} \mathcal{L}_{\text{MSE}}(\textbf{w}, b)$.

### Matrix Form

Given $m$ data points in our training set we can write the model as:

$$
f_W(X) = XW
$$

where $X \in \mathbb{M}_{m,n+1}$ is the so called design matrix of the form:

$$
X =
\begin{bmatrix}
1 & \mathbf{x}_1 \\
1 & \mathbf{x}_2 \\
\vdots & \vdots \\
1 & \mathbf{x}_m \\
\end{bmatrix}
=
\begin{bmatrix}
  1 & x_{1,1} & x_{1,2} & ... & x_{1,n} \\
  1 & x_{2,1} & x_{2,2} & ... & x_{2,n} \\
  \vdots & \vdots & \vdots & \ddots & \vdots  \\
  1 & x_{m,1} & x_{m,2} & ... & x_{m,n} \\
\end{bmatrix}
$$

and $W \in \mathbb{M}_{n+1,1}$ is our parameters matrix of the form:

$$
W = \begin{bmatrix}
  b \\
  \mathbf{w}
\end{bmatrix}
= \begin{bmatrix}
  b \\
  w_1 \\
  w_2 \\
  \vdots \\
  w_n \\
\end{bmatrix}
$$

Therefore the matrix form can be written more clearly as:

$$
f_W(\mathbf{x}) = \begin{bmatrix}
  1 & \mathbf{x}_1 \\
  1 & \mathbf{x}_2 \\
  \vdots & \vdots \\
  1 & \mathbf{x}_m \\
\end{bmatrix} \cdot \begin{bmatrix}
  b \\
  \mathbf{w}
\end{bmatrix}
= \begin{bmatrix}
  b + \mathbf{x}_1 \cdot \mathbf{w} \\
  b + \mathbf{x}_2 \cdot \mathbf{w} \\
  \vdots \\
  b + \mathbf{x}_m \cdot \mathbf{w} \\
\end{bmatrix}
$$

