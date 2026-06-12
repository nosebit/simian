# Simian Models

This directory contains all the machine learning architectures supported by Simian. Right now the supported models are:

- **Linear Regression** (`linear`): A basic linear model optimized via Stochastic Gradient Descent.
- **Polynomial Regression** (`polynomial`): A linear model applied to polynomial-expanded features.

## Regression Models

A regression problem consists of finding a curve that "best fits" a set of data points ($\mathbf{x}_k$,$y_k$) where $\mathbf{x}_k \in \mathbb{R}^n$ (called the inputs) are independent variables each one of them represents a kth observation of $n$ "features" while $y_k \in \mathbb{R}$ (called the output or target) is dependent of $\mathbf{x}_k$ in such a way we can broadly write $y=f(\mathbb{x})$. Therefore our task in a regression problem is to find an "approximator" (or "estimator") function $\hat{f}$ (also called a model of the real $f$) such that $\hat{f} \approx f$ in the sense that each $\hat{y} = \hat{f}(\mathbf{x})$ is "as close as possible" to the real (observable) $y = f(\mathbf{x})$. We call $\hat{y}$ a prediction (or approximation or estimation) of the real $y$. It's important to note that the real $f$ is generally "hidden from us" in the sense that it exists but is unknown and it can be a very complicated function which could also depend on features not represented in our $\mathbf{x}$. This "hidden" features are called **_latent features_** and many times in statistical learning we write $y = f(\mathbf{x}) + \epsilon$ where we actually "break up" the function $f$ we had before in two parts: the "correct" $f$ function which only captures how the $\mathbf{x}$ impacts the value $y$ and this $\epsilon$ (called the "irreducible error") which captures how the non-observed latent features also impacts the value of $y$. If we neglect the "noise" caused by latent features we could simplify and write only $y = f(\mathbf{x})$ as we were doing before.

For example, suppose that our data points represent the dependency of house prices to only two house features: size in square meters and number of bathrooms. This way our $\mathbf{x} \in \mathbb{R}^2$, $y$ is the house price and we know there is a relation $f$ between $y$ and $\mathbf{x}$ although is very likely that this $f$ depends on many house features other than just size and number of bathrooms. But for our concerns we observe only how the prices varies considering only those two features and try to find a "good" estimator $\hat{f}$ for this relationship. We usually say that this estimator $\hat{f}$ always carries two inerent errors within it: (1) the irreducible error we mentioned before which is due to non-observed features that still impacts the output $y$ (and we can't do much related with this error and thats why we called it "irreducible"); (2) and a "reducible" error due to the fact that $\hat{f}$ is an approximation of the real $f$ (here we can try to reduce this error by chosing a $\hat{f}$ that better approximates $f$).

From now on we are going to drop the "hat" from our model function $\hat{f}$ notation and represent it simply by $f$. After all the whole purpose of having a model is to try to capture the real relationship between $\mathbf{x}$ and $y$ anyways.

The process of "modeling" a problem consits in first selecting a particular "family" of functions $f_\theta$ caracterized by a set of parameters $\theta$ and then iterativelly find parameters that produce a "better" approximator $f_\theta$ in the sense that our prediction $\hat{y} = f(\mathbf{x})$ is "closer" to the real $y$ for all $\mathbf{x}$'s in our data set. We can measure the "distance" between a specific $\hat{y}_k$ and $y_k$ in several different ways and we usually call this "distance" the **loss** $\ell(\hat{y}_k, y_k)$ of our prediction $\hat{y}_k$. One of the most used loss functions is the quadratic loss defined as:

$$
\ell_2(\hat{y},y) = \frac{1}{2}(\hat{y} - y)^2
$$

where $\hat{y} - y$ is usually called the "residual". The "total loss" $\mathcal{L}$ (also called the **cost** or the **empirical error**) of our predictor can be computed by simply avering the losses for all points in our data set:

$$
\mathcal{L}(\theta) = \frac{1}{m} \sum_{k=1}^{m}\ell(f_\theta(\mathbf{x}_k), y_k)
$$

When we use the quadratic loss then the total loss is called the Mean Squared Error or MSE for short:

$$
\mathcal{L}_{\text{MSE}}(\theta) = \frac{1}{m} \sum_{k=1}^{m}\ell_2(f_\theta(\mathbf{x}_k), y_k)
$$

This way a regression problem can be formulated as an optimization problem where given a particular model family $f_\theta$ we want to find the parameters $\hat{\theta}$ that give us the minimal cost $\mathcal{L}(\hat{\theta})$ over all the available inputs ($\mathbf{x}_k$, $y_k$):

$$
\hat{\theta} = \argmin_{\theta} \mathcal{L}(\theta)
$$

### Datasets

If you are looking for data to test these regression models, the Hugging Face Hub provides several excellent tabular datasets that work perfectly with Simian:

1. **California Housing (`gvlassis/california_housing`)**
   - **Description**: Predict the median house value for California districts based on features like `median_income`, `total_rooms`, `population`, etc.
   - **Why it's good**: A classic regression dataset. `median_income` has a strong, mostly linear correlation with the house value, making it great for testing simple Linear Regression.
   - **Command**: `simian data load hf:gvlassis/california_housing`

2. **Auto MPG (`scikit-learn/auto-mpg`)**
   - **Description**: Predict a car's fuel efficiency (Miles Per Gallon) based on features like `weight`, `horsepower`, `displacement`, and `cylinders`.
   - **Why it's good**: Relationships like MPG vs. `weight` or `horsepower` are notoriously non-linear (often curved). This makes it the perfect dataset to test and compare Polynomial Regression against Linear Regression!
   - **Command**: `simian data load hf:scikit-learn/auto-mpg`

3. **Fish Market (`scikit-learn/Fish`)**
   - **Description**: Predict the weight of fish based on vertical/diagonal/cross lengths, height, width, and species.
   - **Why it's good**: Contains multiple features with complex interactions, providing a good challenge for multi-variate regression and $K$-Fold cross-validation evaluations.
   - **Command**: `simian data load hf:scikit-learn/Fish`
