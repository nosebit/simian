import { codeBlock, CodeBlockAddon } from './code-block'
import { column, ColumnAddon } from './column'
import { heading, HeadingAddon } from './heading'
import { paragraph, ParagraphAddon } from './paragraph'
import { root, RootAddon } from './root'
import { subtitle, SubTitleAddon } from './subtitle'
import { text, TextAddon } from './text'
import { title, TitleAddon } from './title'
import { val, ValAddon } from './val'

export {
  codeBlock,
  column,
  heading,
  paragraph,
  root,
  subtitle,
  text,
  title,
  val,
}

//////////////////////////////////////////////////
// 1. The Registry Interface
//////////////////////////////////////////////////
export type AddonRegistry = {
  codeBlock: CodeBlockAddon
  column: ColumnAddon
  heading: HeadingAddon
  paragraph: ParagraphAddon
  root: RootAddon
  subtitle: SubTitleAddon
  text: TextAddon
  title: TitleAddon
  val: ValAddon
}

//////////////////////////////////////////////////
// 2. The Dynamic Union
//////////////////////////////////////////////////
// This will automatically become the union of all addons in the registry
export type EditorAddon = AddonRegistry[keyof AddonRegistry]
