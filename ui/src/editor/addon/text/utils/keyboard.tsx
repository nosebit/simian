import isHotkey from 'is-hotkey'
import { Editor } from 'slate'

import { TextMarks } from '../types'

export function applyMarkOnHotKey(
  editor: Editor,
  event: React.KeyboardEvent<HTMLDivElement>,
  hotkey: string,
  mark: TextMarks,
) {
  if (isHotkey(hotkey, event)) {
    event.preventDefault()

    // Check if the mark is already active
    const marks = Editor.marks(editor)
    const isActive = marks ? marks[mark] === true : false

    if (isActive) {
      Editor.removeMark(editor, mark)
    } else {
      Editor.addMark(editor, mark, true)
    }
    return true
  }

  return false
}
