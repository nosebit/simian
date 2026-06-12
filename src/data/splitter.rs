use crate::data::Dataset;
use anyhow::Result;
use polars::prelude::*;
use rand::seq::SliceRandom;

/// Represents a tuple of (Train Dataset, Test Dataset)
pub type Split = (Dataset, Dataset);

pub struct RandomSplitter;

impl RandomSplitter {
  /// Splits the dataset randomly into a Train and Test set based on the train ratio.
  pub fn split(dataset: Dataset, ratio: f32, seed: Option<u64>) -> Result<Split> {
    let num_rows = dataset.df.height();
    let train_rows = (num_rows as f32 * ratio) as usize;
    let test_rows = num_rows - train_rows;

    // Create an array of indices and shuffle them
    let mut indices: Vec<IdxSize> = (0..num_rows as IdxSize).collect();

    if let Some(s) = seed {
      use rand::SeedableRng;
      let mut rng = rand::rngs::StdRng::seed_from_u64(s);
      indices.shuffle(&mut rng);
    } else {
      let mut rng = rand::rng();
      indices.shuffle(&mut rng);
    }

    let idx_chunked = IdxCa::from_vec("idx", indices);
    let shuffled_df = dataset.df.take(&idx_chunked)?;

    let train_df = shuffled_df.slice(0, train_rows);
    let test_df = shuffled_df.slice(train_rows as i64, test_rows);

    Ok((Dataset { df: train_df }, Dataset { df: test_df }))
  }
}

pub struct KFoldSplitter {
  k: usize,
}

impl KFoldSplitter {
  pub fn new(k: usize) -> Self {
    Self { k }
  }

  /// Splits the dataset into K folds. Returns a vector of Splits (Train, Test).
  pub fn split(&self, dataset: &Dataset) -> Result<Vec<Split>> {
    let num_rows = dataset.df.height();

    // Create an array of indices and shuffle them
    let mut indices: Vec<IdxSize> = (0..num_rows as IdxSize).collect();
    let mut rng = rand::rng();
    indices.shuffle(&mut rng);

    let idx_chunked = IdxCa::from_vec("idx", indices);
    let shuffled_df = dataset.df.take(&idx_chunked)?;

    let fold_size = num_rows / self.k;
    let mut splits = Vec::with_capacity(self.k);

    for i in 0..self.k {
      let start_idx = i * fold_size;
      // The last fold might be slightly larger if num_rows isn't perfectly divisible by K
      let end_idx = if i == self.k - 1 {
        num_rows
      } else {
        (i + 1) * fold_size
      };
      let test_size = end_idx - start_idx;

      // Extract the Test fold
      let test_df = shuffled_df.slice(start_idx as i64, test_size);

      // The Train fold is everything else (we concatenate the before and after parts)
      let mut train_dfs = Vec::new();

      if start_idx > 0 {
        train_dfs.push(shuffled_df.slice(0, start_idx));
      }
      if end_idx < num_rows {
        let remaining = num_rows - end_idx;
        train_dfs.push(shuffled_df.slice(end_idx as i64, remaining));
      }

      let mut train_df = train_dfs.pop().unwrap();
      for part in train_dfs {
        train_df = train_df.vstack(&part)?;
      }

      splits.push((Dataset { df: train_df }, Dataset { df: test_df }));
    }

    Ok(splits)
  }
}

#[cfg(test)]
mod tests {
  use super::*;

  fn dummy_dataset() -> Dataset {
    let s1 = Series::new("x".into(), &[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    let df = DataFrame::new(vec![s1]).unwrap();
    Dataset { df }
  }

  #[test]
  fn test_random_split() -> Result<()> {
    let dataset = dummy_dataset();
    let (train, test) = RandomSplitter::split(dataset, 0.8, Some(42))?;

    assert_eq!(train.df.height(), 8);
    assert_eq!(test.df.height(), 2);

    let mut all_vals = train
      .df
      .column("x")?
      .i32()?
      .into_no_null_iter()
      .collect::<Vec<_>>();
    all_vals.extend(test.df.column("x")?.i32()?.into_no_null_iter());
    all_vals.sort();

    assert_eq!(all_vals, vec![1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

    Ok(())
  }

  #[test]
  fn test_kfold_split() -> Result<()> {
    let dataset = dummy_dataset();
    let splitter = KFoldSplitter::new(3); // 10 rows, 3 folds -> sizes 3, 3, 4
    let splits = splitter.split(&dataset)?;

    assert_eq!(splits.len(), 3);

    assert_eq!(splits[0].1.df.height(), 3);
    assert_eq!(splits[0].0.df.height(), 7);

    assert_eq!(splits[1].1.df.height(), 3);
    assert_eq!(splits[1].0.df.height(), 7);

    assert_eq!(splits[2].1.df.height(), 4);
    assert_eq!(splits[2].0.df.height(), 6);

    for (train, test) in splits {
      let mut all_vals = train
        .df
        .column("x")?
        .i32()?
        .into_no_null_iter()
        .collect::<Vec<_>>();
      all_vals.extend(test.df.column("x")?.i32()?.into_no_null_iter());
      all_vals.sort();
      assert_eq!(all_vals, vec![1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    }

    Ok(())
  }
}
