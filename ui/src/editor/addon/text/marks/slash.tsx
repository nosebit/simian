import { TextMark } from '../types'

export const SlashMark: TextMark = (props) => {
  return (
    <span
      {...props}
      className="bg-blue-100 text-blue-700 rounded-sm px-0.5 font-medium"
    />
  )
}
