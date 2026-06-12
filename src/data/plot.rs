use crate::data::Dataset;
use anyhow::{Result, bail};
use plotly::common::{Marker, Mode, Title};
use plotly::layout::{Axis, Layout};
use plotly::{Plot, Scatter, Scatter3D};

pub struct DatasetPlotJob<'a> {
  dataset: &'a Dataset,
  x_cols: Vec<&'a str>,
  y_col: &'a str,
  out_path: Option<String>,
  title: Option<String>,
}

impl<'a> DatasetPlotJob<'a> {
  pub fn new(dataset: &'a Dataset, x_cols: &[&'a str], y_col: &'a str) -> Self {
    Self {
      dataset,
      x_cols: x_cols.to_vec(),
      y_col,
      out_path: None,
      title: None,
    }
  }

  pub fn out_path(mut self, path: impl Into<String>) -> Self {
    self.out_path = Some(path.into());
    self
  }

  pub fn title(mut self, title: impl Into<String>) -> Self {
    self.title = Some(title.into());
    self
  }

  pub fn run(self) -> Result<String> {
    if self.x_cols.is_empty() || self.x_cols.len() > 2 {
      bail!(
        "PlotJob requires 1 or 2 features in x_cols, found {}",
        self.x_cols.len()
      );
    }

    let default_title = if let Some(t) = &self.title {
      t.clone()
    } else {
      format!("{} vs {}", self.y_col, self.x_cols.join(" and "))
    };

    let get_f32_col = |col_name: &str| -> Result<Vec<f32>> {
      Ok(
        self
          .dataset
          .df
          .column(col_name)?
          .cast(&polars::prelude::DataType::Float32)?
          .f32()?
          .into_no_null_iter()
          .collect(),
      )
    };

    let target_col = get_f32_col(self.y_col)?;

    let plot = if self.x_cols.len() == 1 {
      let x_col = get_f32_col(self.x_cols[0])?;
      build_2d_scatter(
        x_col,
        target_col,
        self.x_cols[0],
        self.y_col,
        &default_title,
      )
    } else {
      let x_col = get_f32_col(self.x_cols[0])?;
      let y_col = get_f32_col(self.x_cols[1])?;
      build_3d_scatter(
        x_col,
        y_col,
        target_col,
        self.x_cols[0],
        self.x_cols[1],
        self.y_col,
        &default_title,
      )
    };

    Ok(crate::vis::generate_plot_html(&plot))
  }
}

/// Plots a 2D Scatter plot and opens it in the browser.
pub fn build_2d_scatter(x: Vec<f32>, y: Vec<f32>, x_name: &str, y_name: &str, title: &str) -> Plot {
  let trace = Scatter::new(x, y)
    .mode(Mode::Markers)
    .marker(Marker::new().size(5))
    .name("Data");

  let layout = Layout::new()
    .title(Title::new().text(title))
    .x_axis(Axis::new().title(Title::new().text(x_name)))
    .y_axis(Axis::new().title(Title::new().text(y_name)));

  let mut plot = Plot::new();
  plot.add_trace(trace);
  plot.set_layout(layout);

  plot
}

/// Plots a 3D Scatter plot and opens it in the browser.
pub fn build_3d_scatter(
  x: Vec<f32>,
  y: Vec<f32>,
  z: Vec<f32>,
  _x_name: &str,
  _y_name: &str,
  _z_name: &str,
  title: &str,
) -> Plot {
  let trace = Scatter3D::new(x, y, z)
    .mode(Mode::Markers)
    .marker(Marker::new().size(3))
    .name("Data");

  let layout = Layout::new().title(Title::new().text(title));

  let mut plot = Plot::new();
  plot.add_trace(trace);
  plot.set_layout(layout);

  plot
}
