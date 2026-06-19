use clap::{Parser, Subcommand};

#[derive(Parser, Debug)]
#[command(name = "simian")]
#[command(version)]
#[command(about = "A machine learning CLI app in Rust for learning and experimentation", long_about = None)]
pub struct Cli {
  #[command(subcommand)]
  pub command: Commands,
}

#[derive(Subcommand, Debug)]
pub enum Commands {
  /// Dataset operations (load, prep, split)
  Data {
    #[command(subcommand)]
    command: DataCommands,
  },

  /// Fits (trains) a machine learning model on a dataset.
  Fit {
    #[command(subcommand)]
    model: ModelFitCommands,
  },

  /// Evaluates a trained model on a test dataset
  Eval {
    #[command(subcommand)]
    model: ModelEvalCommands,
  },

  /// Automated Cross-Validation loop
  Cv {
    #[command(subcommand)]
    model: ModelCvCommands,
  },

  /// Simian Papers - Interactive notebook environment and publishing
  Paper {
    #[command(subcommand)]
    command: PaperCommands,
  },
}

#[derive(Subcommand, Debug)]
pub enum PaperCommands {
  /// Open or create a Simian Paper
  Open {
    /// The ID of the paper (acts as folder name). If omitted, a random ID is generated.
    #[arg(index = 1)]
    id: Option<String>,
    #[arg(short, long)]
    dev: bool,
  },
  /// Package and submit the paper as a GitHub Pull Request
  Submit {
    /// The ID of the paper to submit
    #[arg(index = 1)]
    id: String,
  },
  /// Package the paper and start a local server to preview it
  Preview {
    /// The ID of the paper to preview
    #[arg(index = 1)]
    id: String,
  },
  /// Fork a published paper from the community
  Fork {
    /// The ID of the paper to fork
    #[arg(index = 1)]
    id: String,
  },
}

#[derive(Subcommand, Debug)]
pub enum DataCommands {
  /// Loads a dataset from Hugging Face
  Load {
    dataset: String,
    #[arg(long)]
    out: Option<String>,
  },
  /// Prepares a dataset using a preparer
  Prep {
    #[command(subcommand)]
    preparer: PrepCommands,
  },
  /// Splits a dataset
  Split {
    #[command(subcommand)]
    strategy: SplitCommands,
  },
  /// Interactive view of a dataset (using LazyFrame limits and offsets)
  Show {
    dataset: Option<String>,
    #[arg(short, long, default_value_t = false)]
    interactive: bool,
    #[arg(long, default_value_t = 10)]
    limit: usize,
    #[arg(long, default_value_t = 0)]
    offset: usize,
    #[arg(long)]
    columns: Option<String>,
  },
  /// Show summary statistics of a dataset
  Describe { dataset: Option<String> },
  /// Plot a dataset
  Plot {
    dataset: Option<String>,
    #[arg(long)]
    features: Option<String>,
    #[arg(long)]
    target: Option<String>,
  },
}

#[derive(Subcommand, Debug)]
pub enum PrepCommands {
  /// Standard scaler (zero mean, unit variance)
  StandardScaler {
    dataset: Option<String>,
    #[arg(long)]
    out: Option<String>,
  },
  /// Polynomial features expansion
  Polynomial {
    dataset: Option<String>,
    #[arg(short, long, default_value_t = 2)]
    degree: usize,
    #[arg(long)]
    out: Option<String>,
  },
}

#[derive(Subcommand, Debug)]
pub enum SplitCommands {
  /// Standard Train/Test split
  Test {
    dataset: Option<String>,
    #[arg(long)]
    train: Option<String>,
    #[arg(long)]
    test: Option<String>,
    #[arg(long, default_value_t = 0.2)]
    ratio: f32,
    #[arg(long)]
    seed: Option<u64>,
  },
  /// K-Fold cross validation split
  Kfold {
    dataset: Option<String>,
    #[arg(short, long, default_value_t = 5)]
    k: usize,
  },
}

#[derive(clap::Args, Debug, Clone)]
pub struct TrainArgs {
  pub train_dataset: Option<String>,

  #[arg(short, long)]
  pub target: Option<String>,

  #[arg(long)]
  pub out: Option<String>,

  #[arg(short, long, default_value_t = 0.0001)]
  pub learning_rate: f64,

  #[arg(short, long, default_value_t = 1000)]
  pub epochs: usize,

  #[arg(short, long, default_value_t = 10)]
  pub patience: usize,

  #[arg(long, default_value_t = 1e-4)]
  pub tolerance: f64,

  #[arg(short, long, default_value_t = 32)]
  pub batch_size: usize,
}

#[derive(Subcommand, Debug)]
pub enum ModelFitCommands {
  Linear {
    #[command(flatten)]
    args: TrainArgs,
  },
  Polynomial {
    #[arg(short, long, default_value_t = 2)]
    degree: usize,
    #[command(flatten)]
    args: TrainArgs,
  },
  Logistic {
    #[command(flatten)]
    args: TrainArgs,
  },
}

#[derive(clap::Args, Debug, Clone)]
pub struct EvalArgs {
  pub model: String,
  #[arg(long)]
  pub test_dataset: Option<String>,
  #[arg(short, long)]
  pub target: Option<String>,
}

#[derive(Subcommand, Debug)]
pub enum ModelEvalCommands {
  /// Evaluate a model to get its MSE and R2 scores
  Score {
    #[command(flatten)]
    args: EvalArgs,
  },
  /// Plot a model against a dataset
  Plot {
    model: String,
    #[arg(long)]
    test_dataset: Option<String>,
    #[arg(long)]
    features: Option<String>,
    #[arg(long)]
    target: Option<String>,
  },
}

#[derive(clap::Args, Debug, Clone)]
pub struct CvArgs {
  pub dataset: Option<String>,
  #[arg(short, long)]
  pub target: Option<String>,
  #[arg(short, long, default_value_t = 5)]
  pub k: usize,
  #[arg(short, long, default_value_t = 0.0001)]
  pub learning_rate: f64,
  #[arg(short, long, default_value_t = 1000)]
  pub epochs: usize,
  #[arg(short, long, default_value_t = 10)]
  pub patience: usize,
  #[arg(long, default_value_t = 1e-4)]
  pub tolerance: f64,
  #[arg(short, long, default_value_t = 32)]
  pub batch_size: usize,
}

#[derive(Subcommand, Debug)]
pub enum ModelCvCommands {
  Linear {
    #[command(flatten)]
    args: CvArgs,
  },
  Polynomial {
    #[arg(short, long, default_value_t = 2)]
    degree: usize,
    #[command(flatten)]
    args: CvArgs,
  },
  Logistic {
    #[command(flatten)]
    args: CvArgs,
  },
}
