import { FC, forwardRef, useEffect, useImperativeHandle, useMemo } from 'react'
import _ from 'lodash'
import { nanoid } from 'nanoid'
import { createEditor, Descendant, Editor, Transforms } from 'slate'
import { withHistory } from 'slate-history'
import { ReactEditor, Slate, withReact } from 'slate-react'

import { EditorAddon } from './addon'
import { EditorContextProvider } from './context'
import { setExtensionProps, withExtensions } from './extension'
import { EditorProps } from './types'

//////////////////////////////////////////////////
// Utilitary Types
//////////////////////////////////////////////////
export interface EditorRef {
  editor: Editor
  reset: (value: Descendant[]) => void
  focus: () => void
}

//////////////////////////////////////////////////
// Addon Provider
//////////////////////////////////////////////////
export const AddonProviders: FC<{
  addons: EditorAddon[]
  children: React.ReactNode
}> = ({ addons, children }) => {
  // Start with the base children (the Editor/Editable)
  // and wrap them layer by layer with addon contexts.
  return addons.reduceRight((acc, addon) => {
    // 1. Safe check: does the property exist?
    const ContextProvider = addon.ContextProvider as
      | FC<{
           
          addon: any
           
          setAddon: (cb: (addon: any) => any) => void
          children: React.ReactNode
        }>
      | undefined

    if (ContextProvider) {
      // 2. Cast the function to a version that accepts the broad union
      // This bypasses the 'never' conflict caused by the 'type' property
      //const ContextProvider = (providerFactory as (a: typeof addon) => FC<PropsWithChildren>)(addon);

      return (
        <ContextProvider
          addon={addon}
          setAddon={(cb) => _.assign(addon, cb(addon))}
        >
          {acc}
        </ContextProvider>
      )
    }

    return acc
  }, children)
}

//////////////////////////////////////////////////
// Addon Companions
//////////////////////////////////////////////////
/**
 * Renders all high-level UI components provided by the addons.
 */
export const AddonCompanions: FC<{ addons: EditorAddon[] }> = ({ addons }) => {
  return (
    <>
      {addons.map((addon) => {
         
        const Companion = addon.Companion as FC<{ addon: any }> | undefined

        if (!Companion) return null

        return <Companion key={addon.id} addon={addon} />
      })}
    </>
  )
}

//////////////////////////////////////////////////
// Main Component
//////////////////////////////////////////////////
export const EditorProvider = forwardRef<EditorRef, EditorProps>(
  (
    {
      addons,
      blockClass,
      children,
      emptyPlaceholder,
      initialValue,
      onContentChange,
      readOnly,
      ...props
    },
    ref,
  ) => {
    const editorId = useMemo(() => props.id ?? nanoid(), [props.id])

    const mode = props.mode ?? 'write'

    const editor = useMemo(
      () => {
        return withExtensions(withReact(withHistory(createEditor())), {
          id: editorId,
          addons,
          mode,
        })
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [],
    )

    // Reset editor props.
    useEffect(() => {
      setExtensionProps(editor, {
        id: editorId,
        addons,
        mode,
      })
    }, [editor, editorId, addons, mode])

    // Auto focus the editor.
    useEffect(() => {
      if (mode === 'write') {
        // 1. Ensure the editor has a selection if it doesn't have one
        // (Focusing without a selection can sometimes fail to show the cursor)
        if (!editor.selection) {
          const end = Editor.end(editor, [])
          Transforms.select(editor, end)
        }

        // 2. Wrap in a timeout or requestAnimationFrame to ensure the
        // Editable component has finished its re-render (readOnly -> false)
        const timeout = setTimeout(() => {
          ReactEditor.focus(editor)
        }, 0)

        return () => clearTimeout(timeout)
      }
    }, [mode, editor])

    // EXPOSE THE REF API
    useImperativeHandle(
      ref,
      () => ({
        editor,
        focus: () => ReactEditor.focus(editor),
        reset: (newValue: Descendant[]) => {
          editor.children = newValue
          editor.selection = null
          editor.onChange()
        },
      }),
      [editor],
    )

    return (
      <Slate
        editor={editor}
        initialValue={initialValue}
        onChange={(value) => {
          // Check if any operation in this change cycle modified the content
          const isContentChange = editor.operations.some(
            (op) => op.type !== 'set_selection',
          )

          if (isContentChange) {
            onContentChange?.(value)
          }
        }}
      >
        <EditorContextProvider
          editor={editor}
          value={{
            addons,
            blockClass,
            editor,
            emptyPlaceholder,
            mode,
            readOnly,
          }}
        >
          <AddonProviders addons={addons}>
            <div id={`editor-${editorId}`} className="relative editor-root">
              <AddonCompanions addons={addons} />

              {children}
            </div>
          </AddonProviders>
        </EditorContextProvider>
      </Slate>
    )
  },
)

EditorProvider.displayName = 'EditorProvider'
