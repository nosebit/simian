import { Editor, Text } from 'slate'

import { MarkId } from '../types'

export function isInsideMark(editor: Editor, mark: MarkId | MarkId[]) {
  if (!editor.selection) {
    return false
  }

  const marks = typeof mark === 'string' ? [mark] : mark

  const [match] = Editor.nodes(editor, {
    at: editor.selection,
    match: (n) => Text.isText(n) && !!marks.find((mark) => n[mark] === true),
    universal: true, // Ensures all nodes in selection have the mark
  })

  return !!match
}
