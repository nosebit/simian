 
import { CSSProperties, PropsWithChildren } from 'react'
import { BaseEditor, Descendant } from 'slate'
import { HistoryEditor } from 'slate-history'
import { ReactEditor, RenderElementProps, RenderLeafProps } from 'slate-react'
import { z } from 'zod'

import { Text } from './addon/text'
import { AddonRegistry, EditorAddon } from './addon'
import { EditorContextValue } from './context'
import {
  BlockElementSchema,
  BlockSelectionSchema,
  EditorValueSchema,
  HigherBlockElementSchema,
  InlineElementSchema,
} from './schema'

//////////////////////////////////////////////////
// Schema Based Types
//////////////////////////////////////////////////
export type BlockSelection = z.infer<typeof BlockSelectionSchema>

//////////////////////////////////////////////////
// Utility Types
//////////////////////////////////////////////////
export type ExtractElement<T extends Element['type']> = Extract<
  Element,
  { type: T }
>

// This utility builds the specific Props for that element
export type ElementProps<T extends Element['type']> = Omit<
  RenderElementProps,
  'element'
> & {
  element: ExtractElement<T>
}

export type LeafProps = RenderLeafProps

export type EditorFunctionKeys = {
  [K in keyof Editor]: Editor[K] extends (...args: any) => any ? K : never
}[keyof Editor]

// 2. Updated Utility
export type EditorExtendFn<
  T extends EditorFunctionKeys, // Constraints T to only function names
  R = any, // We'll handle the return type refinement below
> = Editor[T] extends (...args: infer P) => any
  ? (
      editor: Editor,
      ...args: P
    ) => R extends any
      ? ReturnType<Extract<Editor[T], (...args: any) => any>>
      : R
  : never

//////////////////////////////////////////////////
// Main Types
//////////////////////////////////////////////////
export interface Editor extends BaseEditor, ReactEditor, HistoryEditor {
  id: string
  addons: EditorAddon[]

  hasAddon: <K extends keyof AddonRegistry>(id: K) => boolean
  getAddon: <K extends keyof AddonRegistry>(
    id: K,
  ) => AddonRegistry[K] | undefined

  mode: EditorContextValue['mode']
  onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void
}

export type BlockElement =
  | z.infer<typeof BlockElementSchema>
  | z.infer<typeof HigherBlockElementSchema>

export type InlineElement = z.infer<typeof InlineElementSchema>

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface CustomElements {}

export type Element =
  | BlockElement
  | InlineElement
  | CustomElements[keyof CustomElements]

export type EditorValue = z.infer<typeof EditorValueSchema>

//////////////////////////////////////////////////
// Slate Type Overrides
//////////////////////////////////////////////////
declare module 'slate' {
  interface BaseRange {
    slash?: boolean
    style?: CSSProperties
  }

  export type TextElement = Text
  interface CustomTypes {
    Editor: Editor
    Element: Element
    Text: Text
  }
}

//////////////////////////////////////////////////
// Editor Props
//////////////////////////////////////////////////
export interface EditorProps extends PropsWithChildren {
  id?: string
  addons: EditorAddon[]
  blockClass?: string
  emptyPlaceholder?: string
  initialValue: Descendant[]
  mode?: EditorContextValue['mode']
  readOnly?: boolean
  //onChange?: (val: Descendant[]) => void;
  onContentChange?: (val: Descendant[]) => void
}
