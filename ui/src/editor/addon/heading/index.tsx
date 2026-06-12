import { nanoid } from 'nanoid'
import { Editor, Element, Transforms } from 'slate'

import { isInsideElement } from '@/ui/editor/utils'

import { elementAddon } from '../base'
import { isInsideMark } from '../text/utils'

import { HeadingContext, HeadingContextValue } from './context'
import { Heading } from './element'
import { slashCommands } from './slash'
import { HeadingAddon } from './types'

/**
 * The render function.
 */
const render: HeadingAddon['render'] = ({ element, ...props }) => {
  if (element.type == 'heading') {
    return <Heading {...props} element={element} />
  }

  return null
}

/**
 * The context provider component.
 */
const ContextProvider: HeadingAddon['ContextProvider'] = ({
  addon,
  children,
}) => (
  <HeadingContext.Provider
    value={{
      emptyPlaceholder: addon.emptyPlaceholder,
    }}
  >
    {children}
  </HeadingContext.Provider>
)

/**
 * Handle insert break to create a paragraph if possible.
 */
const insertBreak: HeadingAddon['insertBreak'] = ({
  editor,
  insertBreak,
  selection,
}) => {
  if (selection && editor.hasAddon('paragraph')) {
    const entry = Editor.above(editor, {
      match: (n) => Element.isElement(n) && Editor.isBlock(editor, n),
    })

    if (entry) {
      const [block, path] = entry

      if (Element.isElement(block) && block.type === 'heading') {
        const isAtEnd = Editor.isEnd(editor, selection.anchor, path)

        if (isAtEnd) {
          Transforms.insertNodes(editor, {
            id: nanoid(),
            type: 'paragraph',
            children: [{ text: '' }],
          })
        } else {
          insertBreak()
          Transforms.setNodes(
            editor,
            { type: 'paragraph' },
            { match: (n) => Element.isElement(n) && Editor.isBlock(editor, n) },
          )
        }

        return true
      }
    }
  }

  return false
}

/**
 * Handle insert text.
 */
const insertText: HeadingAddon['insertText'] = (
  { editor, selection },
  text,
) => {
  if (text === ' ' && selection?.isCollapsed) {
    const blockEntry = Editor.above(editor, {
      match: (n) => Element.isElement(n) && Editor.isBlock(editor, n),
    })

    if (blockEntry) {
      const [, path] = blockEntry
      const start = Editor.start(editor, path)
      const range = { anchor: selection.anchor, focus: start }
      const beforeText = Editor.string(editor, range)

      // ────── HEADINGS ──────
      const headingMap: { [key: string]: number } = {
        '#': 2, // h1 is the title of the page itself
        '##': 3,
        '###': 4,
      }
      if (headingMap[beforeText]) {
        // Skip detection if we are inside some special elements.
        if (
          isInsideElement(editor, [
            'code-block',
            // "latex-block",
            // "latex-inline",
          ]) ||
          isInsideMark(editor, 'code')
        ) {
          return false
        }

        Transforms.delete(editor, { at: range })
        Transforms.setNodes(
          editor,
          { type: 'heading', level: headingMap[beforeText] },
          { match: (n) => Element.isElement(n) },
        )
        return true // break following execution
      }
    }
  }

  return false
}

/**
 * The addon builder.
 *
 * @param params - Initial set of params.
 */
export function heading(params?: HeadingContextValue): HeadingAddon {
  return elementAddon({
    emptyPlaceholder: (level, t) =>
      `${t.title('@editor.heading')} ${level - 1}`,
    ...params,
    id: 'heading',
    render,
    insertBreak,
    insertText,
    slashCommands,

    ContextProvider,
  })
}

export * from './schema'
export * from './types'
