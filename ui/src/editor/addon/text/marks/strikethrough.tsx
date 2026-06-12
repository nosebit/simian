import { TextMark } from '../types'
import { applyMarkOnHotKey } from '../utils/keyboard'

export const StrikethroughMark: TextMark = (props) => {
  return <span {...props} className="line-through" />
}

StrikethroughMark.onKeyDown = ({ editor }, evt) => {
  if (applyMarkOnHotKey(editor, evt, 'mod+shift+u', 'strikethrough')) {
    return true
  }

  return false
}
