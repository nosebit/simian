import { TextMark } from '../types'
import { applyMarkOnHotKey } from '../utils/keyboard'

export const UnderlineMark: TextMark = (props) => {
  return <u {...props} className="underline underline-offset-2" />
}

UnderlineMark.onKeyDown = ({ editor }, evt) => {
  if (applyMarkOnHotKey(editor, evt, 'mod+u', 'underline')) {
    return true
  }

  return false
}
