import latexLang from '@shikijs/langs/latex'
import rustLang from '@shikijs/langs/rust'
import ghDarkDimmed from '@shikijs/themes/github-dark-dimmed'
import ghDarkHighContrast from '@shikijs/themes/github-dark-high-contrast'
import { createHighlighterCoreSync } from 'shiki/core'
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'

const highlighter = createHighlighterCoreSync({
  themes: [ghDarkDimmed, ghDarkHighContrast],
  langs: [rustLang, latexLang],
  engine: createJavaScriptRegexEngine(),
})

export default highlighter
export { ghDarkDimmed, ghDarkHighContrast }
