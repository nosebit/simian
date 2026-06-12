import { Editor } from 'slate'

import { MarkId } from '../types'

export function toggleMark(editor: Editor, mark: MarkId) {
  const marks = Editor.marks(editor)

  if (marks && marks[mark]) {
    Editor.removeMark(editor, mark)
  } else {
    Editor.addMark(editor, mark, true)
  }
}
