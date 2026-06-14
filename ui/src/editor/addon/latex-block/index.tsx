import 'katex/dist/katex.min.css'
import { useMemo } from 'react'
import {
  DecoratedRange,
  Editor,
  Element,
  Node,
  Path,
  Point,
  Transforms,
} from 'slate'
import { ReactEditor } from 'slate-react'

import highlighter from '@/ui/editor/addon/code-block/utils/highlighter'
import { handleIndentKeyDown } from '@/ui/editor/addon/code-block/utils/indent'
import { paragraphAfter } from '@/ui/editor/addon/paragraph/utils'
import { useEditor } from '@/ui/editor/context'
import { isInsideElement } from '@/ui/editor/utils'
import { elementAddon } from '../base'
import { isInsideMark } from '../text/utils'
import { LatexBlockContext } from './context'
import { LatexBlockElement } from './element'
import { LatexBlockAddon } from './types'
import { slashCommands } from './slash'

/**
 * The render function.
 */
const render: LatexBlockAddon['render'] = ({ element, ...props }) => {
  if (element.type == 'latex-block') {
    return <LatexBlockElement {...props} element={element} />
  }

  return null
}

/**
 * The context provider component.
 */
const ContextProvider: LatexBlockAddon['ContextProvider'] = ({ children }) => {
  const { editor } = useEditor()

  const equationMap = useMemo(() => {
    const map = new Map()
    let index = 1

    // Get all latex blocks in the document.
    const entries = Editor.nodes(editor, {
      at: [], // Search the whole doc
      match: (n) => Element.isElement(n) && n.type === 'latex-block',
    })

    for (const [node] of entries) {
      if (node.id) {
        map.set(node.id, index)
        index++
      }
    }

    return map
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, editor.children])

  return (
    <LatexBlockContext.Provider
      value={{
        equationMap,
      }}
    >
      {children}
    </LatexBlockContext.Provider>
  )
}

/**
 * Apply latext code highlighing.
 */
const decorate: LatexBlockAddon['decorate'] = (ctx, [node, nodePath]) => {
  if (
    !Element.isElement(node) ||
    node.type !== 'latex-block' ||
    node.mode === 'read'
  ) {
    return []
  }

  const text = Node.string(node)

  const { tokens } = highlighter.codeToTokens(text, {
    lang: 'latex',
    themes: {
      light: 'github-dark-high-contrast',
      dark: 'github-dark-dimmed',
    },
    defaultColor: 'light-dark()',
  })

  const ranges: DecoratedRange[] = []
  let start = 0
  let lineIdx = 0

  for (const line of tokens) {
    if (lineIdx > 0) {
      start += 1
    }

    for (const token of line) {
      const length = token.content.length

      if (!length) {
        continue
      }

      const path = [...nodePath, 0]
      const end = start + length

      ranges.push({
        anchor: { path, offset: start },
        focus: { path, offset: end },
        style: token.htmlStyle,
      })

      start = end
    }

    lineIdx++
  }

  return ranges
}

/**
 * Detect keyboard shortcut to insert a latex-block.
 */
const insertText: LatexBlockAddon['insertText'] = (
  { editor, selection },
  text,
) => {
  if (text === '$' && selection?.isCollapsed) {
    // Skip detection if we are inside some special elements.
    if (
      isInsideElement(editor, ['code-block', 'latex-block', 'latex-inline']) ||
      isInsideMark(editor, 'code')
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

      // If we currently have "$$" and the user typed "$", total becomes "$$$"
      if (beforeText.endsWith('$$')) {
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

        // Turn current block into latex block
        Transforms.setNodes(editor, {
          mode: 'write',
          type: 'latex-block',
        })

        return true // Break following execution.
      }
    }
  }

  return false
}

/**
 * Normalize latex-blocks to add a paragraph after it if necessary.
 */
const normalizeNode: LatexBlockAddon['normalizeNode'] = (
  { editor },
  [node, path],
) => {
  if (
    editor.hasAddon('paragraph') &&
    Element.isElement(node) &&
    node.type === 'latex-block'
  ) {
    paragraphAfter(editor, [node, path])
  }

  return false
}

/**
 * Handle key down to correctly format latex code when in edit mode.
 */
const onKeyDown: LatexBlockAddon['onKeyDown'] = (
  { editor, selection },
  evt,
) => {
  const entry = Editor.above(editor, {
    match: (n) => Element.isElement(n) && n.type === 'latex-block',
  })

  // Handle key down inside a latex-block.
  if (entry) {
    const [node, path] = entry

    switch (evt.key) {
      case 'Enter': {
        if (evt.shiftKey) {
          // Shift+Enter is going to change the latex-block from
          // edit to view mode.
          if (selection && node.mode === 'write') {
            evt.preventDefault()

            Transforms.setNodes(editor, { mode: 'read' }, { at: path })

            // Select the next block.
            const nextPath = Path.next(path)
            Transforms.select(editor, Editor.start(editor, nextPath))

            return true // break the following execution
          }
        } else {
          // If just Enter was pressed inside a latex-block we want to
          // stay at latex-block.
          if (selection) {
            evt.preventDefault()
            Transforms.insertText(editor, '\n')
          }
        }

        break
      }
    }

    // Handle the keys that perform identation inside the latex-block.
    handleIndentKeyDown(editor, entry, evt)

    return true // break the following execution
  }

  // Handle key down outside the latex-block but which
  // ends up affecting them.
  switch (evt.key) {
    case 'Backspace': {
      // If the user is at the very begining of an empty paragraph and
      // then hit backspace to delete the paragraph we enter the latex-block
      // edit mode.
      if (selection?.isCollapsed) {
        const [node, path] = Editor.node(editor, selection.anchor)

        if (
          editor.hasAddon('paragraph') &&
          Element.isElement(node) &&
          node.type === 'paragraph' &&
          Editor.isEmpty(editor, node) &&
          Point.isBefore(selection.anchor, Editor.start(editor, path))
        ) {
          const prevPath = Path.previous(path)

          if (prevPath) {
            const [prevNode] = Editor.node(editor, prevPath)

            if (
              Element.isElement(prevNode) &&
              prevNode.type === 'latex-block' &&
              prevNode.mode === 'read'
            ) {
              // Prevent the default backspace behavior (which would delete the latex block)
              evt.preventDefault()

              // 1. Switch the LatexBlock to "write" mode
              Transforms.setNodes(editor, { mode: 'write' }, { at: prevPath })

              // 2. Place the cursor at the end of the LatexBlock's content field
              // You'll need to figure out where the *editable area* within your component is.
              // Since the 'content' is a property, not a Slate node, we have to
              // re-focus the *external* input element in the React component (Step 3).

              // We can, however, delete the empty paragraph we were just in:
              Transforms.removeNodes(editor, { at: path })

              // We need a mechanism to focus the newly rendered <textarea> in the React component.
              // This requires a ref management strategy that is outside standard Slate Transforms.
              // The best Slate-native way is just to focus the editor, and the React
              // component handles the rest.
              ReactEditor.focus(editor)
            }
          }
        }
      }

      break
    }
  }

  return false
}

/**
 * The addon builder.
 *
 * @param params - Initial set of params.
 */
export function latexBlock(): LatexBlockAddon {
  return elementAddon({
    id: 'latex-block',
    render,
    decorate,
    insertText,
    normalizeNode,
    onKeyDown,
    slashCommands,

    ContextProvider,
  })
}

export * from './schema'
export * from './types'
