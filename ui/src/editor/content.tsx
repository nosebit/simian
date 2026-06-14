import { FC, PropsWithChildren, useMemo } from 'react'
import _ from 'lodash'
import { DecoratedRange, Editor, NodeEntry, Range } from 'slate'
import { Editable } from 'slate-react'

import { AddonHandlerContext } from './addon/types'
import { EditorAddon } from './addon'
import { useEditor } from './context'

//////////////////////////////////////////////////
// Utilitary Functions
//////////////////////////////////////////////////
function executeDecorate<T extends EditorAddon>(
  addon: T,
  editor: Editor,
  entry: NodeEntry,
): Range[] {
  if (!addon.decorate) return []

  // Inside this function, 'T' is a specific member of the union.
  // Therefore, 'addon' matches the 'Addon' generic in 'AddonBase<Id, Addon>'

  const ctx: AddonHandlerContext<T, 'decorate', any> = {
    addon,
    editor,
    selection: editor.selection
      ? {
          ...editor.selection,
          isCollapsed: Range.isCollapsed(editor.selection),
        }
      : undefined,
    decorate: () => [], // The "original" handler if needed
  }

  return addon.decorate(ctx as any, entry)
}

//////////////////////////////////////////////////
// Main Component
//////////////////////////////////////////////////
export const EditorContent: FC<PropsWithChildren> = () => {
  const { addons = [], editor, mode } = useEditor()

  const leafAddon = useMemo(
    () => _.first(addons.filter((addon) => addon.type === 'leaf')),
    [addons],
  )

  const elementAddons = useMemo(
    () => addons.filter((addon) => addon.type === 'element'),
    [addons],
  )

  return (
    <Editable
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      enterKeyHint="enter"
      readOnly={mode == 'read'}
      className="outline-none"
      decorate={(entry) => {
        const ranges: DecoratedRange[] = []

        for (const addon of addons) {
          ranges.push(...executeDecorate(addon, editor, entry))
        }

        return ranges
      }}
      renderElement={(props) => {
        for (const addon of elementAddons) {
          const element = addon.render(props)

          if (element) {
            return element
          }
        }

        // Fallback
        return <p {...props.attributes}>{props.children}</p>
      }}
      renderLeaf={(props) => {
        if (leafAddon) {
          const element = leafAddon.render(props)

          if (element) {
            return element
          }
        }

        // Fallback
        return <span {...props.attributes}>{props.children}</span>
      }}
      onKeyDown={editor.onKeyDown}
      // onPaste={editor.onPaste}
    />
  )
}
