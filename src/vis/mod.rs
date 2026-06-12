use anyhow::Result;
use plotly::Plot;

pub fn handle_plot_html(mut html: String, out_path: Option<&str>) -> Result<()> {
  html = html.replace(
    "<head>",
    "<head>\n    <style>html, body { height: 100%; margin: 0; padding: 0; overflow: hidden; } .plotly-graph-div { height: 100vh !important; width: 100vw !important; }</style>"
  );
  if std::env::var("SIMIAN_STUDIO_DIR").is_ok() {
    crate::paper::render(crate::paper::RenderFormat::Html, &html);
  } else {
    if let Some(p) = out_path {
      std::fs::write(p, html)?;
      println!("Saved plot to {}", p);
      let _ = std::process::Command::new("open").arg(p).spawn();
    }
  }

  Ok(())
}

pub fn generate_plot_html(plot: &Plot) -> String {
  let mut html = plot.to_html();

  let css_injection = "<style>html, body { height: 100%; margin: 0; padding: 0; overflow: hidden; } .plotly-graph-div { height: 100vh !important; width: 100vw !important; }</style>";

  let js_injection = r#"
<script>
    window.addEventListener('load', function() {
        var graph = document.getElementsByClassName('plotly-graph-div')[0];
        if (graph && typeof Plotly !== 'undefined') {
            if (window.location.hash) {
                try {
                    var state = JSON.parse(atob(window.location.hash.slice(1)));
                    Plotly.relayout(graph, state);
                } catch(e) { console.error('Failed to restore plot state', e); }
            }
            var timeoutId = null;
            graph.on('plotly_relayout', function(eventData) {
                if (timeoutId) clearTimeout(timeoutId);
                timeoutId = setTimeout(function() {
                    window.parent.postMessage({ type: 'SIMIAN_PLOT_STATE', state: eventData }, '*');
                }, 500);
            });
        }
    });
</script>
"#;

  if html.contains("</head>") {
    html = html.replace("</head>", &format!("{}\n</head>", css_injection));
  } else {
    html = format!("{}\n{}", css_injection, html);
  }

  if html.contains("</body>") {
    html = html.replace("</body>", &format!("{}\n</body>", js_injection));
  } else {
    html = format!("{}\n{}", html, js_injection);
  }

  html
}
