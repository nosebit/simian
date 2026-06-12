import { useMemo } from 'react'
import { useReadOnly } from 'slate-react'

import { TextMark } from '../types'

export const LinkMark: TextMark<{ href: string }> = (props) => {
  const readOnly = useReadOnly()

  // @todo - This is not very great but we need to add the data-canny-link to
  // cany links in order to make it work.
  const isCannyLink = useMemo(() => {
    const url = new URL(props.href)
    if (url.hostname.match(/.canny.io$/)) {
      return true
    }

    return false
  }, [props.href])

  return (
    <a
      {...props}
      {...(isCannyLink
        ? {
            'data-canny-link': true,
          }
        : {})}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-500 underline cursor-pointer hover:text-blue-600 dark:text-blue-300 dark:hover:text-blue-400"
      onClick={(e) => {
        if (!readOnly) {
          e.preventDefault()
        }
        // In some editors, you want Cmd+Click to open, otherwise just select
        // if (!e.metaKey) e.preventDefault();
      }}
    />
  )
}

export default LinkMark
