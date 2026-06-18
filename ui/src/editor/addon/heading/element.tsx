import { FC } from 'react'
import clsx from 'clsx'
import { Text, Editor, Path } from 'slate'
import { ReactEditor } from 'slate-react'

import { ElementProps } from '@/ui/editor/types'
import { useEditor } from '@/ui/editor/context'

import { Block } from '../../block'
import { contextualize } from '../../context'

import { useHeading } from './context'
import { useTranslations } from '@/i18n/context'

const HeadingBase: FC<
  ElementProps<'heading'> & { className?: string; omitTopMargin?: boolean }
> = ({ attributes, className, children, element, omitTopMargin }) => {
  switch (element.level) {
    case 1:
      return (
        <Block
          as="h2"
          element={element}
          className={clsx([
            'mb-5 border-b dark:border-white/10 pb-2 text-3xl font-semibold tracking-tight',
            !omitTopMargin && 'mt-12',
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
            'mb-4 text-2xl font-semibold tracking-tight',
            !omitTopMargin && 'mt-10',
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
            'mb-4 text-xl font-semibold tracking-tight',
            !omitTopMargin && 'mt-8',
            className,
          ])}
          {...attributes}
        >
          {children}
        </Block>
      )
    case 4:
      return (
        <Block
          as="h5"
          element={element}
          className={clsx([
            'mb-3 text-lg font-semibold tracking-tight',
            !omitTopMargin && 'mt-8',
            className,
          ])}
          {...attributes}
        >
          {children}
        </Block>
      )
    case 5:
      return (
        <Block
          as="h6"
          element={element}
          className={clsx([
            'mb-3 text-base font-semibold tracking-tight text-gray-500 dark:text-gray-400',
            !omitTopMargin && 'mt-6',
            className,
          ])}
          {...attributes}
        >
          {children}
        </Block>
      )
    case 6:
    default:
      return (
        <Block
          as="h6"
          element={element}
          className={clsx([
            'mb-3 text-sm font-semibold tracking-tight text-gray-500 dark:text-gray-400 uppercase tracking-widest',
            !omitTopMargin && 'mt-6',
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

    const { editor, mode } = useEditor()
    const t = useTranslations()
    const { emptyPlaceholder } = useHeading()
    const placeholder = emptyPlaceholder?.(element.level, t)

    // Check if the node is empty
    const isEmpty =
      element.children.length === 1 && (element.children[0] as Text).text === ''

    if (mode == 'read' && isEmpty && !emptyPlaceholder) {
      return null
    }

    const path = ReactEditor.findPath(editor, element)
    const isFirst = path.length > 0 && path[0] === 0
    let isAfterTitle = false

    if (!isFirst && path.length > 0) {
      try {
        const prevPath = Path.previous(path)
        const [prevNode] = Editor.node(editor, prevPath)
        if (prevNode && (prevNode as any).type === 'title') {
          isAfterTitle = true
        }
      } catch {
        // Just in case Path.previous fails
      }
    }

    const omitTopMargin = isFirst || isAfterTitle

    return (
      <HeadingBase
        {...props}
        omitTopMargin={omitTopMargin}
        className={clsx([isEmpty ? 'relative' : ''])}
      >
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
