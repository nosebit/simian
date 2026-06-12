import { TextMark } from '../types'
import { applyMarkOnHotKey } from '../utils/keyboard'

export const BoldMark: TextMark = (props) => {
  return <strong {...props} className="font-bold" />
}

BoldMark.onKeyDown = ({ editor }, evt) => {
  if (applyMarkOnHotKey(editor, evt, 'mod+b', 'bold')) {
    return true
  }

  return false
}
