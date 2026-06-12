use crate::Device;
use crate::data::Dataset;
use crate::model::Model;
use anyhow::{Result, bail};
use plotly::common::{Marker, Mode, Title};
use plotly::layout::{Axis, Layout};
use plotly::{Mesh3D, Plot, Scatter, Scatter3D};

pub struct ModelPlotJob<'a, M: Model> {
  dataset: &'a Dataset,
  model: &'a M,
  x_cols: Vec<&'a str>,
  y_col: &'a str,
  device: &'a Device,
  out_path: Option<String>,
  title: Option<String>,
}

impl<'a, M: Model> ModelPlotJob<'a, M> {
  pub fn new(
    dataset: &'a Dataset,
    model: &'a M,
    x_cols: &[&'a str],
    y_col: &'a str,
    device: &'a Device,
  ) -> Self {
    Self {
      dataset,
      model,
      x_cols: x_cols.to_vec(),
      y_col,
      device,
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
        "ModelPlotJob requires 1 or 2 features in x_cols, found {}",
        self.x_cols.len()
      );
    }

    let default_title = if let Some(t) = &self.title {
      t.clone()
    } else {
      format!(
        "Model Fit ({} vs {})",
        self.y_col,
        self.x_cols.join(" and ")
      )
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
    let (x_test_ds, _) = self.dataset.split_features_target(self.y_col)?;
    let predictions = self.model.predict(&x_test_ds, self.device)?;
    let y_pred: Vec<f32> = predictions
      .to_vec2::<f32>()?
      .into_iter()
      .map(|v| v[0])
      .collect();

    let plot = if self.x_cols.len() == 1 {
      let x_col = get_f32_col(self.x_cols[0])?;
      let mut pairs: Vec<(f32, f32)> = x_col.clone().into_iter().zip(y_pred).collect();
      pairs.sort_by(|a, b| a.0.partial_cmp(&b.0).unwrap());
      let x_line: Vec<f32> = pairs.iter().map(|p| p.0).collect();
      let y_line: Vec<f32> = pairs.iter().map(|p| p.1).collect();

      build_model_fit_2d(
        x_col,
        target_col,
        x_line,
        y_line,
        self.x_cols[0],
        self.y_col,
        &default_title,
      )
    } else {
      let x_col = get_f32_col(self.x_cols[0])?;
      let y_col = get_f32_col(self.x_cols[1])?;
      build_model_fit_3d(
        x_col.clone(),
        y_col.clone(),
        target_col,
        x_col,
        y_col,
        y_pred,
        self.x_cols[0],
        self.x_cols[1],
        self.y_col,
        &default_title,
      )
    };

    Ok(crate::vis::generate_plot_html(&plot))
  }
}

/// Plots a 2D Scatter plot for the dataset and overlays a Line plot for the model predictions.
pub fn build_model_fit_2d(
  x_data: Vec<f32>,
  y_data: Vec<f32>,
  x_line: Vec<f32>,
  y_line: Vec<f32>,
  x_name: &str,
  y_name: &str,
  title: &str,
) -> Plot {
  let data_trace = Scatter::new(x_data, y_data)
    .mode(Mode::Markers)
    .marker(Marker::new().size(5).color(plotly::color::NamedColor::Blue))
    .name("Actual Data");

  let fit_trace = Scatter::new(x_line, y_line)
    .mode(Mode::Lines)
    .marker(Marker::new().color(plotly::color::NamedColor::Red))
    .name("Model Fit");

  let layout = Layout::new()
    .title(Title::new().text(title))
    .x_axis(Axis::new().title(Title::new().text(x_name)))
    .y_axis(Axis::new().title(Title::new().text(y_name)));

  let mut plot = Plot::new();
  plot.add_trace(data_trace);
  plot.add_trace(fit_trace);
  plot.set_layout(layout);

  plot
}

/// Plots a 3D Scatter plot for the dataset and overlays a 3D Scatter plot for the model predictions.
#[allow(clippy::too_many_arguments)]
pub fn build_model_fit_3d(
  x_data: Vec<f32>,
  y_data: Vec<f32>,
  z_data: Vec<f32>,
  x_pred: Vec<f32>,
  y_pred: Vec<f32>,
  z_pred: Vec<f32>,
  _x_name: &str,
  _y_name: &str,
  _z_name: &str,
  title: &str,
) -> Plot {
  let data_trace = Scatter3D::new(x_data, y_data, z_data)
    .mode(Mode::Markers)
    .marker(Marker::new().size(3).color(plotly::color::NamedColor::Blue))
    .name("Actual Data");

  let fit_trace = Mesh3D::new(x_pred, y_pred, z_pred, None, None, None)
    .opacity(0.5)
    .color(plotly::color::NamedColor::Red)
    .name("Model Fit");

  let layout = Layout::new().title(Title::new().text(title));

  let mut plot = Plot::new();
  plot.add_trace(data_trace);
  plot.add_trace(fit_trace);
  plot.set_layout(layout);

  plot
}
