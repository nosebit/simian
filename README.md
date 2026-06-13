# Simian

[![Crates.io](https://img.shields.io/crates/v/simian.svg)](https://crates.io/crates/simian)
[![CI](https://github.com/nosebit/simian/actions/workflows/ci.yml/badge.svg)](https://github.com/nosebit/simian/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Simian is a modular, high-performance Machine Learning toolkit written in Rust. Designed for experimentation and education, Simian allows you to build, train, and evaluate machine learning models entirely from scratch using native tensor operations and manual backpropagation.

Simian provides a powerful **Command Line Interface (CLI)**, a **Rust Library** for integrating ML workflows directly into your own applications, and a **Paper Editor** for creating interactive an ML studies similar to Jupyter Notebooks but with more flexibility and control. Simian papers can be submitted for review and after approval they become public for the entire community to use and experiment with. Published papers can be forked so you can make your own experiments.

## Installation

The easiest way to install Simian on macOS or Linux is via our official installation script:

```bash
curl -fsSL https://simian.sh/install.sh | bash
```

Alternatively, you can install the CLI using Cargo:

```bash
cargo install simian
```

## Data Loader

Before anything else we need to have a dataset to start playing with. Simian provides a data loader that can download datasets directly from th Hugging Face hub or from any other url. To load a dataset using the CLI you can simply run:

```bash
simian data load hf:scikit-learn/Fish
```

Where the `hf:` specifies that this dataset lives in the Hugging Face hub. By default this dataset will be saved to `~/.simian/datasets/scikit-learn/Fish.pq` where `pq` stands for parquet, the default format for datasets in Simian. You could use the `--out` command line argument to specify a different location to store the dataset. If using Simian as a library in your Rust application you can do:

```rust
use simian::data::Dataset;

let dataset = Dataset::load("hf:scikit-learn/Fish")?;

println!("Loaded dataset with {} rows and {} features", dataset.df.height(), dataset.df.width());
```

You can also plot this data in 2D or 3D to get some feeling for it. For example, you can plot the `scikit-learn/Fish` dataset like this in the CLI:

```bash
simian data plot scikit-learn/Fish --features Width,Height --target Weight
```

Or, using the Rust library, you can do the following:

```rust
use simian::data::Dataset;

let dataset = Dataset::load("hf:scikit-learn/Fish")?;

let html = dataset.plot(&["Width", "Height"], "Weight")
    .title("Fish Dimensions vs Weight")
    .run()?;

// If you are in a Simian Paper environment, you can render the HTML plot:
simian::paper::render(simian::paper::RenderFormat::Html, &html);
```

We can iteratively "navigate" through the data (in a vim style way) using this command:

```bash
simian data show scikit-learn/Fish --interactive
```

or you can show a specific chunk of the data using:

```bash
simian data show scikit-learn/Fish --limit 100 --offset 0
```

Finally you can get some statistics like mean, standard deviation and minimum/maximum values using the `describe` command:

```bash
simian data describe scikit-learn/Fish
```

## Data Splitters

In order to evaluate how well a model generalizes to unseen data, we generally need to split the dataset into subsets. Simian provides a set of data splitters that can be used to split the loaded data. For example, the `test split` splitter can be used to split the dataset into training and testing sets like this in the CLI:

```bash
simian data split test scikit-learn/Fish --ratio 0.2 --seed 42
```

This command will split 80% of the dataset into a training subset at `~/.simian/datasets/scikit-learn/Fish.train.pq` and the remaining 20% will be placed in a testing subset at `~/.simian/datasets/scikit-learn/Fish.test.pq`. The seed ensures that the split is reproducible.

When using simian as a library we can use the `RandomSplitter` to achieve the same:

```rust
use simian::data::Dataset;
use simian::data::splitter::RandomSplitter;

let dataset = Dataset::load("hf:scikit-learn/Fish")?;
let (train_dataset, test_dataset) = RandomSplitter::split(dataset, 0.8, Some(42))?;
```

Note that we use 0.8 as ratio in the RandomSplitter because we want the first item of the resulting tuple (the train_dataset) to receive 80% of the data in the original dataset.

## Data Preparers

Many times we need to preprocess the loaded data in order to get it prepared for the model training step. Some common data preprocessing tasks include scaling numerical data, encoding categorical data, and handling missing values. Simian provides a set of data preparers that can be used to preprocess the loaded data. For example, the `Standard Scaler` preparer can be used to scale numerical data like this in the CLI:

```bash
simian data prep standard-scaler scikit-learn/Fish
```

This command will apply the standard scaler to the `scikit-learn/Fish` dataset and save the result to `~/.simian/datasets/scikit-learn/Fish.std_scaler.pq` by default. If using Simian as a lib we can use this:

```rust
use simian::data::Dataset;
use simian::data::prep::StandardScaler;

let dataset = Dataset::load("hf:scikit-learn/Fish")?;

// Fit and apply directly.
let scaled_dataset = StandardScaler::fit_apply(dataset)?;
```

In the previous example we used the static `fit_apply` to fit the scaler to the dataset and apply the transformation to it at the same time. However, when dealing with train/test dataset splits, it is important to fit the scaler only to the train data and then apply it to the entire dataset so we avoid data leakage. This can be done like this:

```rust
use simian::data::Dataset;
use simian::data::prep::{Preparer, StandardScaler};
use simian::data::splitter::RandomSplitter;

let dataset = Dataset::load("hf:scikit-learn/Fish")?;

let (train_dataset, test_dataset) = RandomSplitter::split(dataset, 0.8, Some(42))?;

let mut scaler = StandardScaler::new();
scaler.fit(&train_dataset)?;

let train_scaled = scaler.apply(&train_dataset)?;
let test_scaled = scaler.apply(&test_dataset)?;
```

## Model Training

We are slowly supporting more types of models, optimizers and loss functions which are used together to train a specific model. For example, to train a linear regression model using mean square error loss function and stochastic gradient descent optimizer we can do this in the CLI:

```bash
simian fit linear scikit-learn/Fish.train.std_scaler --learning-rate 0.01 --epochs 1000 --patience 500 --tolerance 0.001
```

This command will save the resulting model to `~/.simian/models/scikit-learn/Fish.train.std_scaler.linear.st` by default but you can use the `--out` argument to specify a different location. The training will stop if the loss does not improve for 500 epochs, if the loss improvement is less than 0.001 or if the maximum number of epochs (1000) is reached.

When using simian as a library we can do the following:

```rust
use simian::model::{Model, algo::LinearRegression};
use simian::Device;

// Assuming `train_scaled` and `test_scaled` are your Datasets
// and the target column you want to predict is "Weight"
let num_features = train_scaled.df.width() - 1;
let device = Device::Cpu;

let mut model = LinearRegression::new(num_features, &device)?;

// Because of our robust Model trait, we get a full training loop with
// early stopping, validation, and optimal defaults out of the box!
model.fit(&train_scaled, &test_scaled, "Weight", &device)
    .learning_rate(0.01)
    .epochs(1000)
    .batch_size(32)
    .patience(500)
    .tolerance(0.001)
    .run()?;
```

You can plot the model against the test set using the following:

```rust
let html = model.plot(&test_scaled, &["Width", "Height"], "Weight", &device)
    .title("Model Predictions vs Actuals")
    .run()?;

simian::paper::render(simian::paper::RenderFormat::Html, &html);
```

To better evaluate an architecture and hyperparameters, we can use K-Fold Cross-Validation. This automatically splits the data into $K$ folds, trains $K$ separate models, evaluates them, and averages the scores. The command bellow fits a polynomial of degree 3 to a dataset using 5-fold cross validation:

```bash
simian cv polynomial --degree 3 scikit-learn/Fish.train.std_scaler --k 5
```

## Model Evaluation

Evaluate your trained model's performance on the hold-out test set to get its MSE (Mean Squared Error) and R² Score.

```bash
simian eval score scikit-learn/Fish.train.std_scaler.train.linear.st --test-dataset scikit-learn/Fish.train.std_scaler.test
```

If you are using the rust library you can do:

```rust
use simian::data::Dataset;
use simian::eval::{mse_score, r2_score};
use simian::Device;

// 2. Split features from the target column
let (x_test, y_test_ds) = test_scaled.split_features_target("Weight")?;

// 3. Generate predictions
let predictions = model.predict(&x_test, &device)?;
let y_true = y_test_ds.to_tensor(&device)?;

// 4. Compute evaluation metrics
let mse = mse_score(&predictions, &y_true)?;
let r2 = r2_score(&predictions, &y_true)?;

println!("MSE: {:.4}", mse);
println!("R² Score: {:.4}", r2);
```

## Simian Papers (Interactive ML Environment)

Simian also provides a full-blown interactive graphical environment for experimenting with models, writing documentation, and generating inline 3D/2D plots—all bundled into the CLI! This is known as **Simian Papers**.

### Authoring Papers

You can launch a local web editor to start writing a new paper:

```bash
simian paper open my-paper --dev
```

This will spin up a local UI where you can mix rich markdown text with executable Rust code blocks. Any `simian` plots generated inside the code blocks will instantly render as inline, interactive iframe widgets within the paper!

### Publishing Papers

Once you are done writing your paper, you can securely package and publish it directly to Simian repository so ther users can learn from it as well:

```bash
simian paper submit my-paper
```

This command will:

1. Authenticate your CLI with GitHub using the Device Authorization flow.
2. Build a highly-optimized, static React bundle of the viewer (`.bundle/`).
3. Inject your exact paper AST and copy all referenced interactive HTML plots alongside the static viewer.
4. Auto-generate a highly readable `paper.md` version of your work for easy PR reviews.
5. _(Coming Soon)_ Push the bundled paper to a fork and open a Pull Request!

## Development

If you are modifying the code and want to run Simian without explicitly building the binary first, you can use `cargo run`. Simply append `--` followed by the CLI arguments:

```bash
RUST_LOG=debug cargo run -- paper open --dev
```
