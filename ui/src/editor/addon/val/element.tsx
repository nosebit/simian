import { FC } from 'react'

import { ElementProps } from '../../types'

export const Val: FC<ElementProps<'val'>> = ({
  attributes,
  children,
  element,
}) => {
  return (
    <span
      {...attributes}
      className="mx-0.5 inline-block select-none rounded bg-sky-100 px-1 py-0 text-sky-700 dark:bg-sky-900 dark:text-sky-300"
      contentEditable={false}
    >
      <span className="text-[0.6rem] font-bold opacity-50 uppercase mr-0.5">
        val:
      </span>
      {element.name}
      {children}
    </span>
  )
}
