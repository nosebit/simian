import { FC, useEffect } from 'react'
import clsx from 'clsx'
import { Text } from 'slate'

import { ElementProps } from '@/ui/editor/types'

import { Block } from '../../block'

import { useSubTitle } from './context'
import { useTranslations } from '@/i18n/context'

export const SubTitle: FC<ElementProps<'subtitle'>> = ({
  attributes,
  children,
  element,
}) => {
  const t = useTranslations()
  const { emptyPlaceholder, setIsMounted } = useSubTitle()

  useEffect(() => {
    setIsMounted(true)

    return () => {
      setIsMounted(false)
    }
  }, [setIsMounted])

  // Check if the title node is empty
  const isEmpty =
    element.children.length === 1 && (element.children[0] as Text).text === ''

  return (
    <Block
      element={element}
      className={clsx([
        'outline-none text-xl font-bold mb-6 -mt-4',
        'min-h-[1.2em]',
        'text-gray-500 dark:text-gray-400',
        isEmpty ? 'relative' : '',
      ])}
      {...attributes}
    >
      {emptyPlaceholder && isEmpty && (
        <span
          contentEditable={false}
          className="absolute pointer-events-none opacity-70 select-none"
        >
          {emptyPlaceholder(t)}
        </span>
      )}

      {children}
    </Block>
  )
}
