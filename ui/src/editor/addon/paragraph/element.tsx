import { FC, useMemo } from 'react'
import clsx from 'clsx'
import { Path, Text } from 'slate'
import { ReactEditor, useFocused, useSelected } from 'slate-react'

import { useEditor } from '@/ui/editor/context'
import { ElementProps } from '@/ui/editor/types'
import { getBlockContainer } from '@/ui/editor/utils'

import { Block } from '../../block'

import { useParagraph } from './context'

export const Paragraph: FC<ElementProps<'paragraph'>> = ({
  attributes,
  children,
  element,
}) => {
  const { editor, emptyPlaceholder: editorEmptyPlaceholder } = useEditor()
  const selected = useSelected()
  const focused = useFocused()
  const { emptyPlaceholder: paragraphEmptyPlaceholder } = useParagraph()

  const isFirstParagraph = useMemo(() => {
    // 1. Get the path of the current element
    let path: number[] = []

    try {
      path = ReactEditor.findPath(editor, element)
    } catch {
      // findPath can throw if the node is being unmounted
    }

    // 2. Get the "logical" container (Root or Editor)
    const container = getBlockContainer(editor)

    // 3. Check if it's the first child of that container
    // If nested: [rootIndex, 0]
    // If flat: [0]
    const expectedFirstPath = [...container.path, 0]
    return Path.equals(path, expectedFirstPath)
  }, [editor, element])

  const isOnlyParagraph = useMemo(() => {
    try {
      const container = getBlockContainer(editor)
      const paragraphs = container.node.children.filter((c: any) => c.type === 'paragraph')
      return paragraphs.length === 1
    } catch {
      return false
    }
  }, [editor])

  // Check if the paragraph node is empty
  const isEmpty =
    element.children.length === 1 && (element.children[0] as Text).text === ''
  const emptyPlaceholder =
    (isFirstParagraph && editorEmptyPlaceholder) || paragraphEmptyPlaceholder
  //const showPlaceholder = emptyPlaceholder && isEmpty && selected && focused;

  // Update the condition to include Hover via a CSS class later
  // We only render the span if the placeholder exists and the block is empty
  const shouldRenderPlaceholder = !!emptyPlaceholder && isEmpty

  // We determine if it should be forced visible by React state
  // (for mobile or keyboard focus, or if it's the only paragraph in the editor)
  const isForcedVisible = (selected && focused) || isOnlyParagraph

  return (
    <Block
      element={element}
      className={clsx(['mb-6 last:mt-0 group', isEmpty ? 'relative' : ''])}
      {...attributes}
    >
      {shouldRenderPlaceholder && (
        <span
          contentEditable={false}
          className={clsx([
            'pointer-events-none opacity-30 select-none inline-block w-0 whitespace-nowrap align-top',
            isForcedVisible ? '' : 'hidden group-hover:inline-block',
          ])}
        >
          {emptyPlaceholder}
        </span>
      )}

      {children}
    </Block>
  )
}
