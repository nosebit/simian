mod cli;
mod tui;

use anyhow::{Context, Result};
use clap::Parser;
use simian::Device;
use std::io::{self, Read};

use cli::{
  Cli, Commands, DataCommands, ModelCvCommands, ModelEvalCommands, ModelFitCommands, PaperCommands,
  PrepCommands, SplitCommands,
};
use simian::data::prep::{
  Preparer, polynomial::PolynomialFeatures, standard_scaler::StandardScaler,
};
use simian::data::{Dataset, KFoldSplitter, RandomSplitter, load_dataset};
use simian::eval::{accuracy_score, f1_score, mse_score, r2_score};
use simian::model::{
  Model,
  algo::{LinearRegression, LogisticRegression, PolynomialRegression},
};

fn read_stdin_path() -> Result<String> {
  let mut buffer = String::new();
  io::stdin().read_to_string(&mut buffer)?;
  let path = buffer.trim().to_string();
  if path.is_empty() {
    anyhow::bail!("No input file provided via arguments or stdin.");
  }
  Ok(path)
}

fn get_simian_dir() -> Result<std::path::PathBuf> {
  let home = std::env::var("HOME").context("Could not find HOME directory")?;
  Ok(std::path::PathBuf::from(home).join(".simian"))
}

fn get_datasets_dir() -> Result<std::path::PathBuf> {
  let dir = simian::data::get_dataset_cache_dir();
  std::fs::create_dir_all(&dir)?;
  Ok(dir)
}

fn get_models_dir() -> Result<std::path::PathBuf> {
  let dir = get_simian_dir()?.join("models");
  std::fs::create_dir_all(&dir)?;
  Ok(dir)
}

fn resolve_in_path(opt_in: &Option<String>) -> Result<String> {
  let raw_path = match opt_in {
    Some(path) => path.clone(),
    None => read_stdin_path()?,
  };

  let path = std::path::Path::new(&raw_path);
  if path.exists() {
    return Ok(raw_path);
  }
  for ext in &["st", "pq", "csv", "parquet"] {
    let with_ext = path.with_extension(ext);
    if with_ext.exists() {
      return Ok(with_ext.to_string_lossy().to_string());
    }
  }

  let datasets_dir = get_datasets_dir()?;
  let dataset_path = datasets_dir.join(&raw_path);
  if dataset_path.exists() {
    return Ok(dataset_path.to_string_lossy().to_string());
  }
  for ext in &["st", "pq", "csv", "parquet"] {
    let candidate = std::path::PathBuf::from(format!("{}.{}", dataset_path.to_string_lossy(), ext));
    if candidate.exists() {
      return Ok(candidate.to_string_lossy().to_string());
    }
  }

  let models_dir = get_models_dir()?;
  let model_path = models_dir.join(&raw_path);
  if model_path.exists() {
    return Ok(model_path.to_string_lossy().to_string());
  }
  for ext in &["st", "pq"] {
    let candidate = std::path::PathBuf::from(format!("{}.{}", model_path.to_string_lossy(), ext));
    if candidate.exists() {
      return Ok(candidate.to_string_lossy().to_string());
    }
  }

  Ok(raw_path)
}

fn resolve_out_dataset_path(
  in_path: &str,
  suffix: &str,
  opt_out: &Option<String>,
) -> Result<String> {
  if let Some(out) = opt_out {
    return Ok(out.clone());
  }

  let datasets_dir = get_datasets_dir()?;
  let in_path_obj = std::path::Path::new(in_path);
  let relative_path = if let Ok(rel) = in_path_obj.strip_prefix(&datasets_dir) {
    rel.to_string_lossy().to_string()
  } else {
    in_path_obj
      .file_name()
      .unwrap_or_default()
      .to_string_lossy()
      .to_string()
  };

  let mut file_name = relative_path;
  if file_name.ends_with(".pq") {
    file_name = file_name.replace(".pq", "");
  } else if file_name.ends_with(".st") {
    file_name = file_name.replace(".st", "");
  }

  let out_path = datasets_dir.join(format!("{}{}.pq", file_name, suffix));
  if let Some(parent) = out_path.parent() {
    let _ = std::fs::create_dir_all(parent);
  }
  Ok(out_path.to_string_lossy().to_string())
}

fn resolve_out_model_path(
  dataset_path: &str,
  suffix: &str,
  opt_out: &Option<String>,
) -> Result<String> {
  if let Some(out) = opt_out {
    return Ok(out.clone());
  }

  let in_path_obj = std::path::Path::new(dataset_path);
  let relative_path = if let Ok(rel) = in_path_obj.strip_prefix(get_datasets_dir()?) {
    rel.to_path_buf()
  } else {
    std::path::PathBuf::from(in_path_obj.file_name().unwrap_or_default())
  };

  let file_stem = relative_path
    .file_stem()
    .unwrap_or_default()
    .to_string_lossy()
    .to_string();
  let parent = relative_path
    .parent()
    .unwrap_or_else(|| std::path::Path::new(""));

  let models_dir = get_models_dir()?;
  let out_path = models_dir
    .join(parent)
    .join(format!("{}.{}.st", file_stem, suffix));
  if let Some(parent_dir) = out_path.parent() {
    let _ = std::fs::create_dir_all(parent_dir);
  }
  Ok(out_path.to_string_lossy().to_string())
}

use crossterm::style::Stylize;
use tracing::{Event, Subscriber, field::Field, field::Visit};
use tracing_subscriber::fmt::{FmtContext, FormatEvent, FormatFields, format::Writer};
use tracing_subscriber::registry::LookupSpan;

struct CliFormatter;

impl<S, N> FormatEvent<S, N> for CliFormatter
where
  S: Subscriber + for<'a> LookupSpan<'a>,
  N: for<'a> FormatFields<'a> + 'static,
{
  fn format_event(
    &self,
    _ctx: &FmtContext<'_, S, N>,
    mut writer: Writer<'_>,
    event: &Event<'_>,
  ) -> std::fmt::Result {
    let meta = event.metadata();
    let level = meta.level();

    let level_str = match *level {
      tracing::Level::TRACE => "TRACE".magenta().to_string(),
      tracing::Level::DEBUG => "DEBUG".blue().to_string(),
      tracing::Level::INFO => "INFO ".green().to_string(),
      tracing::Level::WARN => "WARN ".yellow().to_string(),
      tracing::Level::ERROR => "ERROR".red().to_string(),
    };

    write!(writer, "{} ", level_str)?;

    // Custom visitor to extract and print the message without ANSI escaping
    struct MessageVisitor<'a> {
      writer: Writer<'a>,
      result: std::fmt::Result,
    }
    impl<'a> Visit for MessageVisitor<'a> {
      fn record_debug(&mut self, field: &Field, value: &dyn std::fmt::Debug) {
        if field.name() == "message" {
          // tracing's message field passes an object whose Debug impl is the Display impl
          self.result = write!(self.writer, "{:?}", value);
        }
      }
      fn record_str(&mut self, field: &Field, value: &str) {
        if field.name() == "message" {
          self.result = write!(self.writer, "{}", value);
        }
      }
      fn record_error(&mut self, field: &Field, value: &(dyn std::error::Error + 'static)) {
        if field.name() == "message" {
          self.result = write!(self.writer, "{}", value);
        }
      }
    }

    let mut visitor = MessageVisitor {
      writer: writer.by_ref(),
      result: Ok(()),
    };
    event.record(&mut visitor);
    visitor.result?;

    writeln!(writer)
  }
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
  use tracing_subscriber::EnvFilter;
  let filter = EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info"));

  tracing_subscriber::fmt()
    .with_writer(std::io::stderr)
    .event_format(CliFormatter)
    .with_env_filter(filter)
    .init();

  let cli = Cli::parse();

  // Initialize candle device
  let device = Device::Cpu;

  match &cli.command {
    Commands::Paper { command } => match command {
      PaperCommands::Open { id, dev } => {
        simian::studio::run(id.clone(), *dev).await?;
      }
      PaperCommands::Submit { id, dry } => {
        simian::paper::submit(id.clone(), *dry).await?;
      }
      PaperCommands::Fork { id } => {
        tracing::info!("Forking paper: {}", id);
        // Phase 3 placeholder
      }
    },
    Commands::Data { command } => match command {
      DataCommands::Load { dataset, out } => {
        let dataset_obj = load_dataset(dataset)?;

        let clean_dataset_name = dataset
          .replace("hf:", "")
          .replace("http://", "")
          .replace("https://", "")
          .replace("ftp://", "")
          .replace(":", "_");

        let out_path = out.clone().unwrap_or_else(|| {
          get_datasets_dir()
            .unwrap_or_default()
            .join(format!("{}.pq", clean_dataset_name))
            .to_string_lossy()
            .to_string()
        });

        // Ensure parent directories exist
        if let Some(parent) = std::path::Path::new(&out_path).parent() {
          let _ = std::fs::create_dir_all(parent);
        }
        dataset_obj.save(&out_path)?;
        println!(
          "{}",
          std::fs::canonicalize(&out_path)
            .unwrap_or(std::path::PathBuf::from(&out_path))
            .display()
        );
      }
      DataCommands::Prep { preparer } => match preparer {
        PrepCommands::StandardScaler { dataset, out } => {
          let in_path = resolve_in_path(dataset)?;
          let out_path = resolve_out_dataset_path(&in_path, ".std_scaler", out)?;
          tracing::info!("Preparing dataset using 'standard_scaler'...");
          let mut dataset = Dataset::load(&in_path)?;
          let mut scaler = StandardScaler::new();
          dataset = scaler.run(&dataset)?;
          dataset.save(&out_path)?;
          println!(
            "{}",
            std::fs::canonicalize(&out_path)
              .unwrap_or(std::path::PathBuf::from(&out_path))
              .display()
          );
        }
        PrepCommands::Polynomial {
          degree,
          dataset,
          out,
        } => {
          let in_path = resolve_in_path(dataset)?;
          let out_path = resolve_out_dataset_path(&in_path, &format!(".poly_{}", degree), out)?;
          tracing::info!(
            "Preparing dataset using 'polynomial' (degree {})...",
            degree
          );
          let mut dataset = Dataset::load(&in_path)?;
          let mut poly = PolynomialFeatures::new(*degree);
          dataset = poly.run(&dataset)?;
          dataset.save(&out_path)?;
          println!(
            "{}",
            std::fs::canonicalize(&out_path)
              .unwrap_or(std::path::PathBuf::from(&out_path))
              .display()
          );
        }
      },
      DataCommands::Split { strategy } => match strategy {
        SplitCommands::Test {
          dataset,
          train,
          test,
          ratio,
          seed,
        } => {
          let in_path = resolve_in_path(dataset)?;
          let default_train = resolve_out_dataset_path(&in_path, ".train", &None)?;
          let default_test = resolve_out_dataset_path(&in_path, ".test", &None)?;
          let train_path = train.clone().unwrap_or(default_train);
          let test_path = test.clone().unwrap_or(default_test);

          tracing::info!(
            "Splitting dataset into Train ({}) / Test ({})...",
            1.0 - ratio,
            ratio
          );
          let dataset = Dataset::load(&in_path)?;
          let api_ratio = 1.0 - ratio;
          let (train_ds, test_ds) = RandomSplitter::split(dataset, api_ratio, *seed)?;
          train_ds.save(&train_path)?;
          test_ds.save(&test_path)?;
          println!(
            "{}",
            std::fs::canonicalize(&train_path)
              .unwrap_or(std::path::PathBuf::from(&train_path))
              .display()
          );
        }
        SplitCommands::Kfold { dataset, k } => {
          let in_path = resolve_in_path(dataset)?;
          tracing::info!("Splitting dataset into {} folds...", k);
          let dataset = Dataset::load(&in_path)?;
          let splitter = KFoldSplitter::new(*k);
          let splits = splitter.split(&dataset)?;
          for (i, (train_ds, test_ds)) in splits.into_iter().enumerate() {
            let train_path =
              resolve_out_dataset_path(&in_path, &format!(".fold{}.train", i + 1), &None)?;
            let test_path =
              resolve_out_dataset_path(&in_path, &format!(".fold{}.test", i + 1), &None)?;
            train_ds.save(&train_path)?;
            test_ds.save(&test_path)?;
          }
          println!(
            "{}",
            std::fs::canonicalize(&in_path)
              .unwrap_or(std::path::PathBuf::from(&in_path))
              .display()
          );
        }
      },
      DataCommands::Show {
        dataset,
        interactive,
        limit,
        offset,
        columns,
      } => {
        let resolved = resolve_in_path(dataset)?;
        let mut lf = simian::data::load_lazy(&resolved)?;

        if let Some(cols) = columns {
          let col_exprs: Vec<polars::prelude::Expr> = cols
            .split(',')
            .map(|s| polars::prelude::col(s.trim()))
            .collect();
          lf = lf.select(&col_exprs);
        }

        if *interactive {
          tui::run_dataset_tui(lf)?;
        } else {
          let df = lf.slice(*offset as i64, *limit as u32).collect()?;
          println!("{}", df);
        }
      }
      DataCommands::Describe { dataset } => {
        let in_path = resolve_in_path(dataset)?;
        let dataset = Dataset::load(&in_path)?;

        println!(
          "{:<20} | {:<10} | {:<10} | {:<10} | {:<10}",
          "Column", "Mean", "Std", "Min", "Max"
        );
        println!(
          "{:-<20}-|-{:-<10}-|-{:-<10}-|-{:-<10}-|-{:-<10}-",
          "", "", "", "", ""
        );
        for s in dataset.df.get_columns() {
          if s.dtype().is_numeric() {
            let s_f64 = s.cast(&polars::prelude::DataType::Float64).unwrap();
            let iter = s_f64.f64().unwrap().into_no_null_iter().collect::<Vec<_>>();
            if iter.is_empty() {
              println!(
                "{:<20} | {:<10} | {:<10} | {:<10} | {:<10}",
                s.name(),
                "N/A",
                "N/A",
                "N/A",
                "N/A"
              );
              continue;
            }

            let mut min = iter[0];
            let mut max = iter[0];
            let mut sum = 0.0;
            for &v in &iter {
              if v < min {
                min = v;
              }
              if v > max {
                max = v;
              }
              sum += v;
            }
            let mean = sum / iter.len() as f64;
            let variance = if iter.len() > 1 {
              iter.iter().map(|&v| (v - mean).powi(2)).sum::<f64>() / (iter.len() as f64 - 1.0)
            } else {
              0.0
            };
            let std_dev = variance.sqrt();

            println!(
              "{:<20} | {:<10.4} | {:<10.4} | {:<10.4} | {:<10.4}",
              s.name(),
              mean,
              std_dev,
              min,
              max
            );
          } else {
            println!(
              "{:<20} | {:<10} | {:<10} | {:<10} | {:<10}",
              s.name(),
              "N/A",
              "N/A",
              "N/A",
              "N/A"
            );
          }
        }
      }
      DataCommands::Plot {
        dataset,
        features,
        target,
      } => {
        let in_path = resolve_in_path(dataset)?;
        let dataset = Dataset::load(&in_path)?;

        let all_cols: Vec<String> = dataset
          .df
          .get_column_names()
          .into_iter()
          .map(|s| s.to_string())
          .collect();
        let target_col = target
          .clone()
          .unwrap_or_else(|| all_cols.last().unwrap().to_string());
        let features_str = features
          .clone()
          .unwrap_or_else(|| all_cols.first().unwrap().to_string());

        let feature_cols: Vec<&str> = features_str.split(',').map(|s| s.trim()).collect();

        let out_path = format!("{}_scatter.html", in_path);
        let html = dataset.plot(&feature_cols, &target_col).run()?;
        simian::vis::handle_plot_html(html, Some(&out_path))?;
      }
    },
    Commands::Fit { model } => match model {
      ModelFitCommands::Linear { args } => {
        let train_path = resolve_in_path(&args.train_dataset)?;
        tracing::info!("Fitting Linear model on dataset '{}'...", train_path);
        let train_data = Dataset::load(&train_path)?;

        let all_cols: Vec<String> = train_data
          .df
          .get_column_names()
          .into_iter()
          .map(|s| s.to_string())
          .collect();
        let target_col = args
          .target
          .clone()
          .unwrap_or_else(|| all_cols.last().unwrap().to_string());

        let (x_ds, _) = train_data.split_features_target(&target_col)?;
        let num_features = x_ds.df.width();

        let mut linear_model = LinearRegression::new(num_features, &device)?;

        linear_model
          .fit(&train_data, &train_data, &target_col, &device)
          .learning_rate(args.learning_rate)
          .epochs(args.epochs)
          .batch_size(args.batch_size)
          .patience(args.patience)
          .tolerance(args.tolerance)
          .log_path(Some(
            std::path::Path::new(&train_path)
              .with_extension("log")
              .to_string_lossy()
              .to_string(),
          ))
          .run()?;
        let out_path = resolve_out_model_path(&train_path, "linear", &args.out)?;
        linear_model.save(&out_path)?;
        tracing::info!("Model saved to {}", out_path);
      }
      ModelFitCommands::Polynomial { degree, args } => {
        let train_path = resolve_in_path(&args.train_dataset)?;
        tracing::info!(
          "Fitting Polynomial (degree {}) model on dataset '{}'...",
          degree,
          train_path
        );
        let train_data = Dataset::load(&train_path)?;

        let all_cols: Vec<String> = train_data
          .df
          .get_column_names()
          .into_iter()
          .map(|s| s.to_string())
          .collect();
        let target_col = args
          .target
          .clone()
          .unwrap_or_else(|| all_cols.last().unwrap().to_string());

        let (x_ds, _) = train_data.split_features_target(&target_col)?;
        let original_num_features = x_ds.df.width();

        let mut poly_model = PolynomialRegression::new(original_num_features, *degree, &device)?;

        poly_model
          .fit(&train_data, &train_data, &target_col, &device)
          .learning_rate(args.learning_rate)
          .epochs(args.epochs)
          .batch_size(args.batch_size)
          .patience(args.patience)
          .tolerance(args.tolerance)
          .log_path(Some(
            std::path::Path::new(&train_path)
              .with_extension("log")
              .to_string_lossy()
              .to_string(),
          ))
          .run()?;
        let out_path = resolve_out_model_path(&train_path, "polynomial", &args.out)?;
        poly_model.save(&out_path)?;
        tracing::info!("Model saved to {}", out_path);
      }
      ModelFitCommands::Logistic { args } => {
        let train_path = resolve_in_path(&args.train_dataset)?;
        tracing::info!("Fitting Logistic model on dataset '{}'...", train_path);
        let train_data = Dataset::load(&train_path)?;

        let all_cols: Vec<String> = train_data
          .df
          .get_column_names()
          .into_iter()
          .map(|s| s.to_string())
          .collect();
        let target_col = args
          .target
          .clone()
          .unwrap_or_else(|| all_cols.last().unwrap().to_string());

        let (x_ds, _) = train_data.split_features_target(&target_col)?;
        let num_features = x_ds.df.width();

        let mut logistic_model = LogisticRegression::new(num_features, &device)?;

        logistic_model
          .fit(&train_data, &train_data, &target_col, &device)
          .learning_rate(args.learning_rate)
          .epochs(args.epochs)
          .batch_size(args.batch_size)
          .patience(args.patience)
          .tolerance(args.tolerance)
          .log_path(Some(
            std::path::Path::new(&train_path)
              .with_extension("log")
              .to_string_lossy()
              .to_string(),
          ))
          .run()?;
        let out_path = resolve_out_model_path(&train_path, "logistic", &args.out)?;
        logistic_model.save(&out_path)?;
        tracing::info!("Model saved to {}", out_path);
      }
    },
    Commands::Eval { model } => match model {
      ModelEvalCommands::Score { args } => {
        let test_path = resolve_in_path(&args.test_dataset)?;
        let test_data = Dataset::load(&test_path)?;

        let all_cols: Vec<String> = test_data
          .df
          .get_column_names()
          .into_iter()
          .map(|s| s.to_string())
          .collect();
        let target_col = args
          .target
          .clone()
          .unwrap_or_else(|| all_cols.last().unwrap().to_string());

        let (x_test_ds, y_test_ds) = test_data.split_features_target(&target_col)?;
        let y_test = y_test_ds.to_tensor(&device)?;

        let model_path = resolve_in_path(&Some(args.model.clone()))?;

        let predictions = if model_path.ends_with(".polynomial.st") {
          tracing::info!("Evaluating Polynomial model on dataset '{}'...", test_path);
          let poly_model = PolynomialRegression::load(&model_path, &device)?;
          poly_model.predict(&x_test_ds, &device)?
        } else if model_path.ends_with(".linear.st") {
          tracing::info!("Evaluating Linear model on dataset '{}'...", test_path);
          let lin_model = LinearRegression::load(&model_path, &device)?;
          lin_model.predict(&x_test_ds, &device)?
        } else if model_path.ends_with(".logistic.st") {
          tracing::info!("Evaluating Logistic model on dataset '{}'...", test_path);
          let log_model = LogisticRegression::load(&model_path, &device)?;
          log_model.predict(&x_test_ds, &device)?
        } else {
          anyhow::bail!(
            "Cannot infer model type from filename '{}'. Ensure the model file ends with .linear.st, .polynomial.st, or .logistic.st",
            model_path
          );
        };

        tracing::info!("--- Evaluation Results ---");
        if model_path.ends_with(".logistic.st") {
          let acc = accuracy_score(&predictions, &y_test)?;
          let f1 = f1_score(&predictions, &y_test)?;
          tracing::info!("Accuracy: {:.4}", acc);
          tracing::info!("F1-Score: {:.4}", f1);
        } else {
          let mse = mse_score(&predictions, &y_test)?;
          let r2 = r2_score(&predictions, &y_test)?;
          tracing::info!("MSE: {:.4}", mse);
          tracing::info!("R²:  {:.4}", r2);
        }
      }
      ModelEvalCommands::Plot {
        model,
        test_dataset,
        features,
        target,
      } => {
        let test_path = resolve_in_path(test_dataset)?;
        let test_data = Dataset::load(&test_path)?;
        let model_path = resolve_in_path(&Some(model.clone()))?;

        let all_cols: Vec<String> = test_data
          .df
          .get_column_names()
          .into_iter()
          .map(|s| s.to_string())
          .collect();
        let target_col = target
          .clone()
          .unwrap_or_else(|| all_cols.last().unwrap().to_string());
        let features_str = features
          .clone()
          .unwrap_or_else(|| all_cols.first().unwrap().to_string());
        let feature_cols: Vec<&str> = features_str.split(',').map(|s| s.trim()).collect();

        let out_path = format!("{}_fit.html", test_path);
        let html = if model_path.ends_with(".polynomial.st") {
          let poly_model = PolynomialRegression::load(&model_path, &device)?;
          poly_model
            .plot(&test_data, &feature_cols, &target_col, &device)
            .run()?
        } else if model_path.ends_with(".linear.st") {
          let lin_model = LinearRegression::load(&model_path, &device)?;
          lin_model
            .plot(&test_data, &feature_cols, &target_col, &device)
            .run()?
        } else if model_path.ends_with(".logistic.st") {
          let log_model = LogisticRegression::load(&model_path, &device)?;
          log_model
            .plot(&test_data, &feature_cols, &target_col, &device)
            .run()?
        } else {
          anyhow::bail!(
            "Cannot infer model type from filename '{}'. Ensure the model file ends with .linear.st, .polynomial.st, or .logistic.st",
            model_path
          );
        };

        simian::vis::handle_plot_html(html, Some(&out_path))?;
      }
    },
    Commands::Cv { model } => match model {
      ModelCvCommands::Linear { args } => {
        let dataset_path = resolve_in_path(&args.dataset)?;
        tracing::info!(
          "Running {}-Fold Cross Validation on dataset '{}'...",
          args.k,
          dataset_path
        );
        let dataset_obj = Dataset::load(&dataset_path)?;
        let splitter = KFoldSplitter::new(args.k);
        let splits = splitter.split(&dataset_obj)?;

        let all_cols: Vec<String> = dataset_obj
          .df
          .get_column_names()
          .into_iter()
          .map(|s| s.to_string())
          .collect();
        let target_col = args
          .target
          .clone()
          .unwrap_or_else(|| all_cols.last().unwrap().to_string());

        let (avg_mse, avg_r2) = simian::eval::cv_regression(
          &splits,
          |train_data| {
            let (x_ds, _) = train_data.split_features_target(&target_col)?;
            let num_features = x_ds.df.width();
            let mut linear_model = LinearRegression::new(num_features, &device)?;
            linear_model
              .fit(train_data, train_data, &target_col, &device)
              .learning_rate(args.learning_rate)
              .epochs(args.epochs)
              .batch_size(args.batch_size)
              .patience(args.patience)
              .tolerance(args.tolerance)
              .log_path(Some(
                std::path::Path::new(&dataset_path)
                  .with_extension("log")
                  .to_string_lossy()
                  .to_string(),
              ))
              .run()?;
            Ok(linear_model)
          },
          &target_col,
          &device,
        )?;
        tracing::info!("--- Cross-Validation Results ---");
        tracing::info!("Average MSE: {:.4}", avg_mse);
        tracing::info!("Average R²:  {:.4}", avg_r2);
      }
      ModelCvCommands::Polynomial { degree, args } => {
        let dataset_path = resolve_in_path(&args.dataset)?;
        tracing::info!(
          "Running {}-Fold Cross Validation on dataset '{}'...",
          args.k,
          dataset_path
        );
        let dataset_obj = Dataset::load(&dataset_path)?;
        let splitter = KFoldSplitter::new(args.k);
        let splits = splitter.split(&dataset_obj)?;

        let all_cols: Vec<String> = dataset_obj
          .df
          .get_column_names()
          .into_iter()
          .map(|s| s.to_string())
          .collect();
        let target_col = args
          .target
          .clone()
          .unwrap_or_else(|| all_cols.last().unwrap().to_string());

        let (avg_mse, avg_r2) = simian::eval::cv_regression(
          &splits,
          |train_data| {
            let (x_ds, _) = train_data.split_features_target(&target_col)?;
            let num_features = x_ds.df.width();
            let mut poly_model = PolynomialRegression::new(num_features, *degree, &device)?;
            poly_model
              .fit(train_data, train_data, &target_col, &device)
              .learning_rate(args.learning_rate)
              .epochs(args.epochs)
              .batch_size(args.batch_size)
              .patience(args.patience)
              .tolerance(args.tolerance)
              .log_path(Some(
                std::path::Path::new(&dataset_path)
                  .with_extension("log")
                  .to_string_lossy()
                  .to_string(),
              ))
              .run()?;
            Ok(poly_model)
          },
          &target_col,
          &device,
        )?;
        tracing::info!("--- Cross-Validation Results ---");
        tracing::info!("Average MSE: {:.4}", avg_mse);
        tracing::info!("Average R²:  {:.4}", avg_r2);
      }
      ModelCvCommands::Logistic { args } => {
        let dataset_path = resolve_in_path(&args.dataset)?;
        tracing::info!(
          "Running {}-Fold Cross Validation on dataset '{}'...",
          args.k,
          dataset_path
        );
        let dataset_obj = Dataset::load(&dataset_path)?;
        let splitter = KFoldSplitter::new(args.k);
        let splits = splitter.split(&dataset_obj)?;

        let all_cols: Vec<String> = dataset_obj
          .df
          .get_column_names()
          .into_iter()
          .map(|s| s.to_string())
          .collect();
        let target_col = args
          .target
          .clone()
          .unwrap_or_else(|| all_cols.last().unwrap().to_string());

        let (avg_acc, avg_f1) = simian::eval::cv_classification(
          &splits,
          |train_data| {
            let (x_ds, _) = train_data.split_features_target(&target_col)?;
            let num_features = x_ds.df.width();
            let mut logistic_model = LogisticRegression::new(num_features, &device)?;
            logistic_model
              .fit(train_data, train_data, &target_col, &device)
              .learning_rate(args.learning_rate)
              .epochs(args.epochs)
              .batch_size(args.batch_size)
              .patience(args.patience)
              .tolerance(args.tolerance)
              .log_path(Some(
                std::path::Path::new(&dataset_path)
                  .with_extension("log")
                  .to_string_lossy()
                  .to_string(),
              ))
              .run()?;
            Ok(logistic_model)
          },
          &target_col,
          &device,
        )?;
        tracing::info!("--- Cross-Validation Results ---");
        tracing::info!("Average Accuracy: {:.4}", avg_acc);
        tracing::info!("Average F1-Score: {:.4}", avg_f1);
      }
    },
  }

  Ok(())
}
