import { FC, useCallback, useState } from 'react'
import { createPortal } from 'react-dom'
import { Editor, Range } from 'slate'
import { ReactEditor, useFocused } from 'slate-react'

import { useEditor } from '@/ui/editor/context'

import { Position, TextMenuBar } from './bar'

////////////////////////////////////////////////////////////
// Utilitary Functions
////////////////////////////////////////////////////////////
// function getPosition(editor: Editor, barEl: HTMLElement) {
//   if (!editor.selection) { return; }

//   try {
//     const domRange = ReactEditor.toDOMRange(editor, editor.selection);
//     const rect = domRange.getBoundingClientRect();

//     const editorEl = document.getElementById(`editor-${editor.id}`) as HTMLElement;
//     const editorRect = editorEl.getBoundingClientRect();

//     return {
//       // We use rect.top and subtract the menu height + a small offset (8px)
//       top: rect.top - editorRect.top + editorEl.scrollTop - barEl.offsetHeight - 8,
//       // Center the menu horizontally relative to the selection
//       left: rect.left - editorRect.left + editorEl.scrollLeft + rect.width / 2 - barEl.offsetWidth / 2,
//     };
//   } catch {
//     // Do nothing.
//   }

//   return { top: 0, left: 0 };
// }
function getPosition(editor: Editor, barEl: HTMLElement) {
  if (!editor.selection) return

  try {
    const domRange = ReactEditor.toDOMRange(editor, editor.selection)
    const rect = domRange.getBoundingClientRect()

    return {
      // viewport top + current page scroll - menu height - offset
      top: rect.top + window.scrollY - barEl.offsetHeight - 8,
      // viewport left + current page scroll + half selection width - half menu width
      left: rect.left + window.scrollX + rect.width / 2 - barEl.offsetWidth / 2,
    }
  } catch {
    return { top: 0, left: 0 }
  }
}

////////////////////////////////////////////////////////////
// Floating Menu (For Desktop)
////////////////////////////////////////////////////////////
export const TextFloatingMenu: FC = () => {
  const { editor } = useEditor()
  const [position, setPosition] = useState<Position | undefined>()
  const isFocused = useFocused()

  const { selection } = editor

  const shouldShow =
    isFocused &&
    selection &&
    Range.isExpanded(selection) &&
    Editor.string(editor, selection).trim() !== ''

  const onBarMount = useCallback(
    (barEl: HTMLDivElement) => {
      if (!selection) {
        return
      }

      setPosition(getPosition(editor, barEl))
    },
    [editor, selection, setPosition],
  )

  return shouldShow
    ? createPortal(
        <TextMenuBar position={position} onMount={onBarMount} />,
        document.getElementById(`text-menu-root-${editor.id}`)!,
      )
    : null
}
