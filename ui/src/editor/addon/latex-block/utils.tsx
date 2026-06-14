import katex from "katex";

export function renderKaTeX(text: string, num: number | null) {
  let latex = text.trim();

  if (num) {
    // CHECK: Does the string end with an environment closing tag?
    // e.g. \end{equation}, \end{align}, \end{gather}
    const envMatch = latex.match(/(\\end\{[a-zA-Z0-9\*]+\})\s+$/)

    if (envMatch) {
      // CASE A: Environment used
      // We must inject \tag{N} before the closing brace.
      // From: ... x=y \end{equation}
      // To: .. x=y \tag{5} \end{equation}
      latex = latex.replace(
        /(\\end\{[a-zA-Z0-9\*]+\})\s+$/,
        `\\tag{${num}} $1`,
      );
    } else {
      // Case B: Plain math
      // Just append the tag at the end.
      latex = `${latex} \\tag{${num}}`
    }
  }

  try {
    return katex.renderToString(latex, {
      displayMode: true,
      throwOnError: false,
      trust: true,
    });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch(err) {
    return text;
  }
}