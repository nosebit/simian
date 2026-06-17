import { DecoratedRange, Editor, Element, Node, Transforms } from 'slate'

import { isInsideElement } from '@/ui/editor/utils'

import { elementAddon } from '../base'
import { paragraphAfter } from '../paragraph/utils'
import { isInsideMark } from '../text/utils'

import highlighter from './utils/highlighter'
import { handleIndentKeyDown } from './utils/indent'
import { CodeBlock } from './element'
import { slashCommands } from './slash'
import { CodeBlockAddon } from './types'
import { executeCodeBlock } from './utils/execute'

/**
 * The render function.
 */
const render: CodeBlockAddon['render'] = ({ element, ...props }) => {
  if (element.type == 'code-block') {
    return <CodeBlock {...props} element={element} />
  }

  return null
}

/**
 * Highlight code-block text.
 */
const decorate: CodeBlockAddon['decorate'] = (ctx, [node, path]) => {
  if (!Element.isElement(node) || node.type !== 'code-block') {
    return []
  }

  const text = Node.string(node)
  const language = (node as any).language || 'rust'

  const { tokens } = highlighter.codeToTokens(text, {
    lang: language,
    themes: { light: 'github-dark-high-contrast', dark: 'github-dark-dimmed' },
  })

  const ranges: DecoratedRange[] = []
  let globalOffset = 0

  for (const line of tokens) {
    for (const token of line) {
      const length = token.content.length
      if (!length) continue

      const tokenStart = globalOffset
      const tokenEnd = globalOffset + length

      // --- NEW LOGIC: Map global offsets to Slate leaves ---
      let charCount = 0
      node.children.forEach((child, index) => {
        const childText = Node.string(child)
        const childStart = charCount
        const childEnd = charCount + childText.length

        // Check if the Shiki token overlaps with this specific Slate Leaf
        const overlapStart = Math.max(tokenStart, childStart)
        const overlapEnd = Math.min(tokenEnd, childEnd)

        if (overlapStart < overlapEnd) {
          ranges.push({
            anchor: {
              path: [...path, index],
              offset: overlapStart - childStart,
            },
            focus: {
              path: [...path, index],
              offset: overlapEnd - childStart,
            },
            style: token.htmlStyle,
          })
        }
        charCount = childEnd
      })
      // -----------------------------------------------------

      globalOffset = tokenEnd
    }
    globalOffset += 1 // Account for the \n character
  }

  return ranges
}

/**
 * Detect code-block markdown shortcut.
 */
const insertText: CodeBlockAddon['insertText'] = (
  { editor, selection },
  text,
) => {
  if (text === '`' && selection?.isCollapsed) {
    // Skip detection if we are inside some special elements.
    if (
      isInsideElement(editor, [
        'code-block' /*"latex-block", "latex-inline"*/,
      ]) ||
      isInsideMark(editor, 'code')
    ) {
      return false
    }

    if (
      Editor.above(editor, {
        match: (n) =>
          Element.isElement(n) &&
          ['code-inline', 'latex-block', 'latex-inline'].includes(n.type),
      })
    ) {
      return false
    }

    const [block, path] =
      Editor.above(editor, {
        match: (n) => Element.isElement(n) && Editor.isBlock(editor, n),
      }) || []

    if (block && path) {
      const start = Editor.start(editor, path)
      const range = { anchor: selection.anchor, focus: start }
      const beforeText = Editor.string(editor, range)

      // If we currently have "``" and the user type "`", total becomes "```"
      if (beforeText.endsWith('``')) {
        // Delete all three backticks
        const deleteRange = {
          anchor: selection.anchor,
          focus: {
            path: selection.anchor.path,
            offset: selection.anchor.offset - 2, // already had 2 ticks before typing the 3rd
          },
        }

        // Cleanup
        Transforms.delete(editor, { at: deleteRange })

        // Turn current block into code block
        Transforms.setNodes(editor, { type: 'code-block' })

        // Prevent the 3rd backtick from being inserted
        return true
      }
    }
  }

  return false
}

/**
 * Handle pasted data into code-blocks.
 */
const insertData: CodeBlockAddon['insertData'] = ({ editor }, data) => {
  const text = data.getData('text/plain')
  const entry = Editor.above(editor, {
    match: (n) => Element.isElement(n) && n.type === 'code-block',
  })

  if (text && entry) {
    // When pasting into a code-block, insert text exactly as-is
    // instead of letting Slate's default behavior split the block.
    Transforms.insertText(editor, text)
    return { break: true }
  }

  return false
}

/**
 * Normalize code-blocks.
 */
const normalizeNode: CodeBlockAddon['normalizeNode'] = (
  { editor },
  [node, path],
) => {
  if (
    editor.hasAddon('paragraph') &&
    Element.isElement(node) &&
    node.type === 'code-block'
  ) {
    paragraphAfter(editor, [node, path])
  }

  return false
}

/**
 * Handle key down on code-blocks.
 */
const onKeyDown: CodeBlockAddon['onKeyDown'] = ({ editor, selection }, evt) => {
  const entry = Editor.above(editor, {
    match: (n) => Element.isElement(n) && n.type === 'code-block',
  })

  if (entry && selection) {
    const [, path] = entry

    if (selection.isCollapsed) {
      switch (evt.key) {
        case 'Enter': {
          if (evt.shiftKey) {
            evt.preventDefault()

            executeCodeBlock(editor, path)
            break
          }

          // When user hits enter inside a code-block we want to
          // stay within the code-block.
          evt.preventDefault()

          // Get the range from the start of the code-block to the cursor
          const startOfBlock = Editor.start(editor, path)
          const cursorPoint = selection.anchor

          const rangeFromStartToCursor = {
            anchor: startOfBlock,
            focus: cursorPoint,
          }

          // Plain text from start of code block up to cursor
          const textBeforeCursor = Editor.string(editor, rangeFromStartToCursor)

          // Find last newline; the previous line starts after it (or at 0 if none)
          const lastNewlineIndex = textBeforeCursor.lastIndexOf('\n')
          const prevLineStartIndex = lastNewlineIndex + 1
          const prevLineText = textBeforeCursor.slice(prevLineStartIndex)

          // Extract indentation (spaces or tabs) at start of that previous line
          const indentMatch = prevLineText.match(/^[ \t]*/)
          const indent = indentMatch ? indentMatch[0] : ''

          // Insert newline + indentation at cursor
          Transforms.insertText(editor, '\n' + indent)

          break
        }

        default: {
          break
        }
      }
    }

    // Handle identation via Tab key.
    handleIndentKeyDown(editor, entry, evt)
  }

  return false
}

/**
 * The addon builder.
 *
 * @param params - Initial set of params.
 */
export function codeBlock(): CodeBlockAddon {
  return elementAddon({
    id: 'code-block',
    render,
    decorate,
    insertData,
    insertText,
    normalizeNode,
    onKeyDown,
    slashCommands,
  })
}

export * from './schema'
export * from './types'
