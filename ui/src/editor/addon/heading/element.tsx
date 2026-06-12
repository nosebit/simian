import { FC } from 'react'
import clsx from 'clsx'
import { Text } from 'slate'

import { ElementProps } from '@/ui/editor/types'

import { Block } from '../../block'
import { contextualize, useMode } from '../../context'

import { useHeading } from './context'
import { useTranslations } from '@/i18n/context'

const HeadingBase: FC<ElementProps<'heading'> & { className?: string }> = ({
  attributes,
  className,
  children,
  element,
}) => {
  switch (element.level) {
    case 1:
      return (
        <Block
          as="h2"
          element={element}
          className={clsx([
            'mb-6 not-first:mt-8 text-2xl font-bold tracking-tight',
            className,
          ])}
          {...attributes}
        >
          {children}
        </Block>
      )
    case 2:
      return (
        <Block
          as="h3"
          element={element}
          className={clsx([
            'mb-4 not-first:mt-6 text-xl font-semibold',
            className,
          ])}
          {...attributes}
        >
          {children}
        </Block>
      )
    case 3:
      return (
        <Block
          as="h4"
          element={element}
          className={clsx([
            'mb-2 not-first:mt-4 text-xl font-semibold',
            className,
          ])}
          {...attributes}
        >
          {children}
        </Block>
      )
  }
}

export const Heading = contextualize<ElementProps<'heading'>>()(
  [],
  ({ children, ...props }) => {
    const { element } = props

    const mode = useMode()
    const t = useTranslations()
    const { emptyPlaceholder } = useHeading()
    const placeholder = emptyPlaceholder?.(element.level, t)

    // Check if the node is empty
    const isEmpty =
      element.children.length === 1 && (element.children[0] as Text).text === ''

    if (mode == 'read' && isEmpty && !emptyPlaceholder) {
      return null
    }

    return (
      <HeadingBase {...props} className={clsx([isEmpty ? 'relative' : ''])}>
        {placeholder && isEmpty && (
          <span
            contentEditable={false}
            className="absolute pointer-events-none opacity-30 select-none"
          >
            {placeholder}
          </span>
        )}

        {children}
      </HeadingBase>
    )
  },
)
