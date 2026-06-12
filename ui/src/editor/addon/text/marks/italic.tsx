import { TextMark } from '../types'
import { applyMarkOnHotKey } from '../utils/keyboard'

export const ItalicMark: TextMark = (props) => {
  return <em {...props} className="italic" />
}

ItalicMark.onKeyDown = ({ editor }, evt) => {
  if (applyMarkOnHotKey(editor, evt, 'mod+i', 'italic')) {
    return true
  }

  return false
}
