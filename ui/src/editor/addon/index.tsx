import { codeBlock, CodeBlockAddon } from './code-block'
import { column, ColumnAddon } from './column'
import { heading, HeadingAddon } from './heading'
import { latexBlock, LatexBlockAddon } from './latex-block'
import { latexInline, LatexInlineAddon } from './latex-inline'
import { paragraph, ParagraphAddon } from './paragraph'
import { root, RootAddon } from './root'
import { subtitle, SubTitleAddon } from './subtitle'
import { text, TextAddon } from './text'
import { title, TitleAddon } from './title'
import { val, ValAddon } from './val'
import { slash, SlashAddon } from './slash'
import { imageBlock, ImageBlockAddon } from './image-block'

export {
  codeBlock,
  column,
  heading,
  latexBlock,
  latexInline,
  paragraph,
  root,
  subtitle,
  text,
  title,
  val,
  slash,
  imageBlock,
}

//////////////////////////////////////////////////
// 1. The Registry Interface
//////////////////////////////////////////////////
export type AddonRegistry = {
  codeBlock: CodeBlockAddon
  column: ColumnAddon
  heading: HeadingAddon
  latexBlock: LatexBlockAddon
  latexInline: LatexInlineAddon
  paragraph: ParagraphAddon
  root: RootAddon
  subtitle: SubTitleAddon
  text: TextAddon
  title: TitleAddon
  val: ValAddon
  slash: SlashAddon
  imageBlock: ImageBlockAddon
}

//////////////////////////////////////////////////
// 2. The Dynamic Union
//////////////////////////////////////////////////
// This will automatically become the union of all addons in the registry
export type EditorAddon = AddonRegistry[keyof AddonRegistry]
