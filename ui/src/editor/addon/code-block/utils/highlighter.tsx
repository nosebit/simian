import bashLang from '@shikijs/langs/bash'
import javascriptLang from '@shikijs/langs/javascript'
import jsonLang from '@shikijs/langs/json'
import latexLang from '@shikijs/langs/latex'
import pythonLang from '@shikijs/langs/python'
import rustLang from '@shikijs/langs/rust'
import typescriptLang from '@shikijs/langs/typescript'
import ghDarkDimmed from '@shikijs/themes/github-dark-dimmed'
import ghDarkHighContrast from '@shikijs/themes/github-dark-high-contrast'
import { createHighlighterCoreSync } from 'shiki/core'
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'

const highlighter = createHighlighterCoreSync({
  themes: [ghDarkDimmed, ghDarkHighContrast],
  langs: [
    rustLang,
    latexLang,
    bashLang,
    javascriptLang,
    jsonLang,
    pythonLang,
    typescriptLang,
  ],
  engine: createJavaScriptRegexEngine(),
})

export default highlighter
export { ghDarkDimmed, ghDarkHighContrast }
