use anyhow::Result;
use crossterm::{
  event::{self, Event, KeyCode, KeyEventKind},
  execute,
  terminal::{EnterAlternateScreen, LeaveAlternateScreen, disable_raw_mode, enable_raw_mode},
};
use polars::prelude::*;
use ratatui::{
  Terminal,
  backend::CrosstermBackend,
  layout::{Constraint, Direction, Layout},
  style::{Color, Modifier, Style},
  text::{Line, Span},
  widgets::{Block, Borders, Cell, Paragraph, Row, Table},
};
use std::io;

pub fn run_dataset_tui(mut lf: LazyFrame) -> Result<()> {
  // Setup terminal
  enable_raw_mode()?;
  let mut stdout = io::stdout();
  execute!(stdout, EnterAlternateScreen)?;
  let backend = CrosstermBackend::new(stdout);
  let mut terminal = Terminal::new(backend)?;

  // Determine schema to get column names
  let schema = lf.schema()?;
  let column_names: Vec<String> = schema.iter_names().map(|n| n.to_string()).collect();

  let mut offset: i64 = 0;
  let page_size: u32 = 50;

  // Run the TUI loop
  let res = run_loop(
    &mut terminal,
    &mut lf,
    &column_names,
    &mut offset,
    page_size,
  );

  // Restore terminal
  disable_raw_mode()?;
  execute!(terminal.backend_mut(), LeaveAlternateScreen)?;
  terminal.show_cursor()?;

  res
}

fn run_loop(
  terminal: &mut Terminal<CrosstermBackend<std::io::Stdout>>,
  lf: &mut LazyFrame,
  column_names: &[String],
  offset: &mut i64,
  page_size: u32,
) -> Result<()> {
  loop {
    // Slice the lazyframe
    let current_chunk = lf.clone().slice(*offset, page_size).collect()?;

    terminal.draw(|f| {
      let rects = Layout::default()
        .direction(Direction::Vertical)
        .constraints([Constraint::Min(5), Constraint::Length(3)].as_ref())
        .split(f.area());

      // Header row
      let header_cells = column_names.iter().map(|h| {
        Cell::from(h.as_str()).style(
          Style::default()
            .fg(Color::Yellow)
            .add_modifier(Modifier::BOLD),
        )
      });
      let header = Row::new(header_cells)
        .style(Style::default().bg(Color::DarkGray))
        .height(1)
        .bottom_margin(1);

      // Data rows
      let mut rows = Vec::new();
      for i in 0..current_chunk.height() {
        let mut row_cells = Vec::new();
        for col_name in column_names {
          let series = current_chunk.column(col_name).unwrap();
          let val_str = series.get(i).unwrap().to_string();
          row_cells.push(Cell::from(val_str));
        }
        rows.push(Row::new(row_cells).height(1));
      }

      // Constraints for columns (equal width)
      let constraints: Vec<Constraint> = column_names
        .iter()
        .map(|_| Constraint::Percentage((100 / column_names.len().max(1)) as u16))
        .collect();

      let t = Table::new(rows, constraints)
        .header(header)
        .block(
          Block::default()
            .borders(Borders::ALL)
            .title("Simian Data Explorer"),
        )
        .row_highlight_style(Style::default().add_modifier(Modifier::REVERSED))
        .highlight_symbol(">> ");

      f.render_widget(t, rects[0]);

      let info = Paragraph::new(Line::from(vec![
        Span::raw(format!(
          " Rows {}-{} ",
          *offset,
          *offset + current_chunk.height() as i64
        )),
        Span::styled(
          " | Use Up/Down/PageUp/PageDown to scroll | 'q' to quit ",
          Style::default().fg(Color::Cyan),
        ),
      ]))
      .block(Block::default().borders(Borders::ALL));

      f.render_widget(info, rects[1]);
    })?;

    if event::poll(std::time::Duration::from_millis(250))?
      && let Event::Key(key) = event::read()?
      && key.kind == KeyEventKind::Press
    {
      match key.code {
        KeyCode::Char('q') | KeyCode::Esc => return Ok(()),
        KeyCode::Down | KeyCode::Char('j') => {
          *offset += 1;
        }
        KeyCode::Up | KeyCode::Char('k') => {
          if *offset > 0 {
            *offset -= 1;
          }
        }
        KeyCode::PageDown => {
          *offset += page_size as i64;
        }
        KeyCode::PageUp => {
          if *offset >= page_size as i64 {
            *offset -= page_size as i64;
          } else {
            *offset = 0;
          }
        }
        _ => {}
      }
    }
  }
}
