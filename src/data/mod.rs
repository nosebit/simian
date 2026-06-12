pub mod plot;
pub mod prep;
pub mod splitter;

pub use splitter::{KFoldSplitter, RandomSplitter, Split};

use crate::Device;
use anyhow::{Context, Result, bail};
use candle_core::Tensor;
use hf_hub::api::sync::Api;
use polars::prelude::*;
use std::fs::File;
use std::io::Write;
use std::path::PathBuf;

#[derive(Clone)]
pub struct Dataset {
  pub df: DataFrame,
}

impl std::fmt::Display for Dataset {
  fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
    write!(f, "{}", self.df)
  }
}

impl Dataset {
  pub fn plot<'a>(
    &'a self,
    x_cols: &[&'a str],
    y_col: &'a str,
  ) -> crate::data::plot::DatasetPlotJob<'a> {
    crate::data::plot::DatasetPlotJob::new(self, x_cols, y_col)
  }
}

pub fn get_dataset_cache_dir() -> PathBuf {
  let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
  PathBuf::from(home).join(".simian").join("datasets")
}

/// Helper function to resolve the dataset source to a local path and its extension.
fn resolve_source(source: &str) -> Result<(PathBuf, String)> {
  if source.starts_with("hf:") {
    let repo_name = source.trim_start_matches("hf:");
    let simian_path_base = get_dataset_cache_dir().join(repo_name);

    for ext in ["parquet", "pq", "csv"] {
      let local_path = simian_path_base.with_extension(ext);
      if local_path.exists() {
        tracing::info!("Using cached dataset from: {:?}", local_path);
        return Ok((local_path, ext.to_string()));
      }
    }

    tracing::info!("Fetching '{}' from Hugging Face Hub...", repo_name);
    let api = Api::new()?;
    let repo = api.dataset(repo_name.to_string());
    let info = repo.info()?;

    let file_info = info
      .siblings
      .iter()
      .find(|f| f.rfilename.ends_with(".parquet") || f.rfilename.ends_with(".csv"))
      .with_context(|| {
        format!(
          "No .parquet or .csv file found in HF dataset: {}",
          repo_name
        )
      })?;

    let path = repo.get(&file_info.rfilename)?;
    let ext = file_info
      .rfilename
      .split('.')
      .next_back()
      .unwrap_or("")
      .to_string();

    // Cache it into our clean Simian directory
    if let Some(parent) = simian_path_base.parent() {
      std::fs::create_dir_all(parent)?;
    }
    let final_path = simian_path_base.with_extension(&ext);
    std::fs::copy(&path, &final_path)?;

    Ok((final_path, ext))
  } else if source.starts_with("http:")
    || source.starts_with("https:")
    || source.starts_with("ftp:")
  {
    tracing::info!("Downloading dataset from URL: {}", source);
    let ext = if source.contains(".parquet") {
      "parquet".to_string()
    } else if source.contains(".csv") {
      "csv".to_string()
    } else {
      bail!("URL must point to a .csv or .parquet file");
    };

    let simian_dir = get_dataset_cache_dir();
    std::fs::create_dir_all(&simian_dir)?;

    use std::hash::{Hash, Hasher};
    let mut hasher = std::collections::hash_map::DefaultHasher::new();
    source.hash(&mut hasher);
    let hash = hasher.finish();

    let file_name = format!("downloaded_{}.{}", hash, ext);
    let tmp_path = simian_dir.join(file_name);

    if tmp_path.exists() {
      tracing::info!("Using cached dataset from: {:?}", tmp_path);
      return Ok((tmp_path, ext));
    }

    let response = reqwest::blocking::get(source)?;
    if !response.status().is_success() {
      bail!(
        "Failed to download dataset. HTTP Status: {}",
        response.status()
      );
    }

    let bytes = response.bytes()?;
    let mut file = File::create(&tmp_path)?;
    file.write_all(&bytes)?;

    Ok((tmp_path, ext))
  } else {
    // Treat as local file
    let mut path = PathBuf::from(source);

    // If exact path doesn't exist, check the dataset cache directory (Studio or Global)
    if !path.exists() {
      let cached_path = get_dataset_cache_dir().join(source);
      if cached_path.exists() {
        path = cached_path;
      } else {
        // Just fail if not found anywhere
        bail!("Local dataset file not found: {}", source);
      }
    }

    let ext = path
      .extension()
      .and_then(|e| e.to_str())
      .unwrap_or("")
      .to_string();

    if ext != "csv" && ext != "parquet" && ext != "pq" {
      bail!("Local file must be a .csv, .parquet, or .pq file");
    }

    Ok((path, ext))
  }
}

/// Generic dataset loader for Parquet and CSV files using Polars.
pub fn load_dataset(source: &str) -> Result<Dataset> {
  let (path, ext) = resolve_source(source)?;
  tracing::info!("Loading {} file...", ext);

  let file = File::open(&path)?;
  let df = if ext == "parquet" || ext == "pq" {
    ParquetReader::new(file).finish()?
  } else if ext == "csv" {
    CsvReader::new(file).finish()?
  } else {
    bail!("Unsupported file extension: {}", ext);
  };

  tracing::info!("Loaded {} rows, {} features.", df.height(), df.width());

  Ok(Dataset { df })
}

/// Generic lazy dataset loader for Parquet and CSV files using Polars LazyFrame.
pub fn load_lazy(source: &str) -> Result<LazyFrame> {
  let (path, ext) = resolve_source(source)?;

  if ext == "parquet" || ext == "pq" {
    Ok(LazyFrame::scan_parquet(&path, Default::default())?)
  } else if ext == "csv" {
    Ok(LazyCsvReader::new(&path).finish()?)
  } else {
    bail!("Unsupported file extension: {}", ext);
  }
}

impl Dataset {
  /// Returns a new Dataset containing the first `length` rows.
  pub fn head(&self, length: Option<usize>) -> Self {
    Dataset {
      df: self.df.head(length),
    }
  }

  /// Saves the dataset to a `.pq` (Parquet) file.
  pub fn save(&self, path: &str) -> Result<()> {
    let mut resolved_path = PathBuf::from(path);
    if !resolved_path.is_absolute() && !path.starts_with(".") {
      resolved_path = get_dataset_cache_dir().join(path);
    }

    if let Some(parent) = resolved_path.parent() {
      std::fs::create_dir_all(parent)?;
    }

    let mut file = File::create(&resolved_path)?;
    let mut df = self.df.clone();
    ParquetWriter::new(&mut file).finish(&mut df)?;
    Ok(())
  }

  /// Loads the dataset from a source (local file, URL, or Hugging Face Hub `hf:`).
  pub fn load(source: &str) -> Result<Self> {
    load_dataset(source)
  }

  /// Splits the dataset into Features (X) and Target (y) datasets.
  pub fn split_features_target(&self, target_col: &str) -> Result<(Self, Self)> {
    let col_names: Vec<String> = self
      .df
      .get_column_names()
      .into_iter()
      .map(|s| s.to_string())
      .collect();
    let target_col_str = target_col.to_string();
    if !col_names.contains(&target_col_str) {
      bail!(
        "Target column '{}' not found in dataset. Available columns: {:?}",
        target_col,
        col_names
      );
    }

    let mut x_df = self.df.clone();
    let y_series = x_df.drop_in_place(target_col)?;
    let y_df = DataFrame::new(vec![y_series])?;

    Ok((Dataset { df: x_df }, Dataset { df: y_df }))
  }

  /// Converts the entire DataFrame to a Tensor
  pub fn to_tensor(&self, device: &Device) -> Result<Tensor> {
    let c_device = device.as_candle()?;
    let df = &self.df;
    let num_rows = df.height();
    let num_features = df.width();
    let mut x_vec: Vec<f32> = Vec::with_capacity(num_rows * num_features);

    let mut col_iters: Vec<_> = Vec::new();
    for col_name in df.get_column_names() {
      let s = df.column(col_name)?;
      let s_f32 = s.cast(&DataType::Float32)?;
      let vec: Vec<f32> = s_f32.f32()?.into_no_null_iter().collect();
      col_iters.push(vec);
    }
    for row_idx in 0..num_rows {
      for col in &col_iters {
        x_vec.push(col[row_idx]);
      }
    }
    Ok(Tensor::from_vec(
      x_vec,
      (num_rows, num_features),
      &c_device,
    )?)
  }
}

#[cfg(test)]
mod tests {
  use super::*;
  use std::path::PathBuf;

  fn get_fixture_path() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures/test.csv")
  }

  #[test]
  fn test_load_csv() -> Result<()> {
    let path = get_fixture_path();
    let dataset = load_dataset(path.to_str().unwrap())?;
    assert_eq!(dataset.df.height(), 2);
    assert_eq!(dataset.df.width(), 3);
    Ok(())
  }

  #[test]
  fn test_split_and_to_tensor() -> Result<()> {
    let path = get_fixture_path();
    let dataset = load_dataset(path.to_str().unwrap())?;
    let device = Device::Cpu;

    let (x_ds, y_ds) = dataset.split_features_target("y")?;
    let x = x_ds.to_tensor(&device)?;
    let y = y_ds.to_tensor(&device)?;

    assert_eq!(x.dims(), &[2, 2]);
    assert_eq!(y.dims(), &[2, 1]);

    let x_vec = x.to_vec2::<f32>()?;
    assert_eq!(x_vec[0], vec![1.0, 2.0]);
    assert_eq!(x_vec[1], vec![4.0, 5.0]);

    let y_vec = y.to_vec2::<f32>()?;
    assert_eq!(y_vec[0], vec![3.0]);
    assert_eq!(y_vec[1], vec![9.0]);

    Ok(())
  }

  #[test]
  fn test_save_and_load_parquet() -> Result<()> {
    let path = get_fixture_path();
    let dataset = load_dataset(path.to_str().unwrap())?;

    let tmp_dir = tempfile::tempdir()?;
    let pq_path = tmp_dir.path().join("test.pq");

    dataset.save(pq_path.to_str().unwrap())?;

    let loaded = Dataset::load(pq_path.to_str().unwrap())?;
    assert_eq!(loaded.df.height(), 2);
    assert_eq!(loaded.df.width(), 3);

    Ok(())
  }
}
