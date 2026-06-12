import {
  createContext,
  FC,
  PropsWithChildren,
  useContext,
  useEffect,
} from 'react'
import { Editor, Transforms } from 'slate'
import { useFocused, useSlate } from 'slate-react'

import { contextualizeBuilder } from './utils/context'

import { EditorAddon } from './addon'

//////////////////////////////////////////////////
// Types
//////////////////////////////////////////////////
export interface EditorContextValue {
  editor: Editor
  emptyPlaceholder?: string
  mode: 'read' | 'write'
  blockClass?: string
  addons: EditorAddon[]
  readOnly?: boolean
}

//////////////////////////////////////////////////
// Context
//////////////////////////////////////////////////
export const EditorContext = createContext<EditorContextValue | null>(null)

export const contextualize =
  contextualizeBuilder<EditorContextValue>(EditorContext)

//////////////////////////////////////////////////
// Utilitary Hooks
//////////////////////////////////////////////////
export function useEditor() {
  const editor = useSlate()
  const ctx = useContext(EditorContext)

  return { ...ctx, editor }
}

export function useAddons() {
  const ctx = useContext(EditorContext)

  if (!ctx) {
    throw new Error('useAddons must be used within EditorContext')
  }

  return ctx.addons
}

export function useMode() {
  const ctx = useContext(EditorContext)

  if (!ctx) {
    throw new Error('useAddons must be used within EditorContext')
  }

  return ctx.mode
}

//////////////////////////////////////////////////
// Context Provider
//////////////////////////////////////////////////
export const EditorContextProvider: FC<
  PropsWithChildren<{
    editor: Editor
    value: EditorContextValue
  }>
> = ({ children, editor, value }) => {
  const isFocused = useFocused()

  // Remove selected range when editor is blured.
  useEffect(() => {
    if (!isFocused) {
      // Deselect the editor logicially
      Transforms.deselect(editor)
    }
  }, [isFocused, editor])

  return (
    <EditorContext.Provider value={value}>{children}</EditorContext.Provider>
  )
}
