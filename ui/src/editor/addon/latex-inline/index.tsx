import { nanoid } from 'nanoid'
import { Editor, Element, Node, Point, Range, Transforms } from 'slate'

import { isInsideElement } from '@/ui/editor/utils'
import { elementAddon } from '../base'
import { LatexInline } from './element'
import { LatexInlineAddon } from './types'
import { isInsideMark } from '../text/utils'

/**
 * The render function.
 */
const render: LatexInlineAddon['render'] = ({ element, ...props }) => {
  if (element.type == 'latex-inline') {
    return <LatexInline {...props} element={element} />
  }

  return null
}

/**
 * Handle deletion.
 */
const deleteBackward: LatexInlineAddon['deleteBackward'] = ({
  editor,
  selection,
}) => {
  if (selection?.isCollapsed) {
    const { anchor } = selection

    // 1. Strict adjacency check
    // We only want to intercept if the cursor is at the very start of
    // the current text node. If offset > 0, the user is deleting a char
    // in the current text (e.g., "abc|"), so we should let the default
    // behavior happen.
    if (anchor.offset === 0) {
      // 2. Find the immediate previous node
      // Important: Do NOT pass a `match` property here.
      // We want to know exactly what is right next door.
      const previous = Editor.previous(editor, {
        at: anchor,
      })

      if (previous) {
        // The previous is actually the text node hold by the latex-inline.
        // So in order to get the latex-inline we need to get the parent of
        // the node.
        const [, previousPath] = previous
        const [node, path] = Editor.parent(editor, previousPath)

        if (
          Element.isElement(node) &&
          node.type === 'latex-inline' &&
          node.mode === 'read'
        ) {
          // Switch to edit mode.
          Transforms.setNodes(editor, { mode: 'write' }, { at: path })

          // Move the cursor to the end of the text inside the now editable
          // node.
          const endPoint = Editor.end(editor, path)
          Transforms.select(editor, endPoint)

          // Prevent default delete behaviour.
          return true
        }
      }
    }
  }

  return false
}

/**
 * Handle insert text to detect keyboard shortcut.
 */
const insertText: LatexInlineAddon['insertText'] = (
  { editor, selection },
  text,
) => {
  if (text == '$' && selection?.isCollapsed) {
    // Skip detection if we are inside some special elements.
    if (
      isInsideElement(editor, ['code-block', 'latex-block', 'latex-inline']) ||
      isInsideMark(editor, 'code')
    ) {
      return false
    }

    const { anchor } = selection

    // Get the text immediately before the cursor in the current block.
    const blockStart = Editor.start(editor, anchor.path)
    const rangeBefore: Range = { anchor, focus: blockStart }
    const beforeText = Editor.string(editor, rangeBefore)

    // --- SCENARIO 1: User types "$$" (Edit Mode) ---
    // Check if the character immediately before is $.
    if (beforeText.endsWith('$')) {
      if (beforeText === '$') {
        // We are at the begining of the block so we let
        // $$ to be inserted so we can check for $$$ to
        // insert the latex-block element.
        return false
      }

      // 1. Delete the existing $.
      Transforms.delete(editor, {
        at: {
          anchor: Editor.before(editor, anchor)!,
          focus: anchor,
        },
      })

      // 2. Insert the LatexInline node in "write" mode.
      Transforms.insertNodes(
        editor,
        {
          id: nanoid(),
          type: 'latex-inline',
          mode: 'write',
          children: [{ text: '' }],
        },
        { select: true },
      )

      // 3. Collapse the selection to a cursor (ensures it's not highlighting the empty text)
      Transforms.collapse(editor, { edge: 'end' })

      // 4. Prevent the second $ from being inserted.
      return true
    }

    // --- SCENARIO 2: User types "$content$" (View Mode) ---
    const match = beforeText.match(/\$([^$]+)$/)

    if (match) {
      const [fullMatch, content] = match
      const matchLength = fullMatch.length
      const startPoint = Editor.before(editor, anchor, {
        distance: matchLength,
      })

      if (startPoint) {
        // 1. Select the whole range "$content" excluding the $ we just typed.
        const rangeToReplace = { anchor: startPoint, focus: anchor }

        // 2. Delete the raw text.
        Transforms.delete(editor, { at: rangeToReplace })

        // 3. Insert the LatexInline in "read" mode.
        Transforms.insertNodes(editor, {
          id: nanoid(),
          type: 'latex-inline',
          mode: 'read',
          children: [{ text: content }],
        })

        // 4. Move the cursor *after* the new node so user can keep typing.
        Transforms.move(editor, { distance: 1, unit: 'offset' })

        // 5. Prevent the closing $ character from being inserted.
        return true
      }
    }
  }

  return false
}

/**
 * Identify this element as an inline element.
 */
const isInline: LatexInlineAddon['isInline'] = (ctx, element) => {
  return element.type === 'latex-inline' ? 'yes' : 'no'
}

/**
 * Handle onChange event.
 */
const onChange: LatexInlineAddon['onChange'] = ({ editor, selection }) => {
  const resnapPoint = (point: Point, isFocusPoint: boolean) => {
    if (!selection) {
      return null
    }

    // 1. Check if this point is inside a view-mode node.
    const [match] = Editor.nodes(editor, {
      at: point,
      match: (n) =>
        Element.isElement(n) && n.type === 'latex-inline' && n.mode === 'read',
    })

    if (match) {
      const [node, path] = match
      const start = Editor.start(editor, path)
      const end = Editor.end(editor, path)

      // Case A: Logic for the "Focus" (the moving end of a selection)
      // If we are selecting text (range is not collapsed), we want "Momentum".
      if (isFocusPoint && !Range.isCollapsed(selection)) {
        const { anchor } = selection

        // Check direction relative to the node.
        // If anchor is before the node, we are selecting forwards (Down/Right) => Snap to the end.
        if (Point.compare(anchor, start) < 0) {
          return end
        }
        // If anchor is after the node, we are selecting backwards (Up/Left) => Snap to the start.
        else if (Point.compare(anchor, end) > 0) {
          return start
        }
      }
      // Case B: Logic for Clicks or simple cursor movement.
      // Use "Proximity" - snap to the phisically closest edge.
      const text = Node.string(node)
      if (point.offset <= text.length / 2) {
        return start
      } else {
        return end
      }
    }

    return null
  }

  // We must check both anchor (start) and focus (end) of the selection.
  if (selection) {
    const newAnchor = resnapPoint(selection.anchor, false)
    const newFocus = resnapPoint(selection.focus, true) // Pass true to enable momentum logic.

    if (newAnchor || newFocus) {
      Transforms.setSelection(editor, {
        anchor: newAnchor ?? selection.anchor,
        focus: newFocus ?? selection.focus,
      })
    }
  }

  return false
}

/**
 * Handle arrow based navigation through the inline latex element.
 * By default we consider a view mode inline latex as an "inline block"
 * and therefore navigation should "jump" through it as a whole block.
 * Maybe in the future we can consider a UX similar to the Bear editor
 * where navigation go "through" the latex expression by automatically
 * switching the element mode to view/edit.
 */
const onKeyDown: LatexInlineAddon['onKeyDown'] = (
  { editor, selection },
  evt,
) => {
  if (!selection) {
    return false
  }

  const { anchor, focus } = selection

  const entry = Editor.above(editor, {
    match: (n) => Element.isElement(n) && n.type === 'latex-inline',
  })

  switch (evt.key) {
    case 'Enter': {
      if (entry) {
        evt.preventDefault()
        return true
      }

      break
    }

    case 'ArrowLeft': {
      if (entry) {
        // Check if we are moving away from the element from the
        // start of it.
        const [, path] = entry

        const start = Editor.start(editor, path)

        if (Point.equals(anchor, start)) {
          evt.preventDefault()

          // 1. Switch the node to view mode.
          Transforms.setNodes(editor, { mode: 'read' }, { at: path })

          // 2. Get the cursor out from the node.
          const pointBefore = Editor.before(editor, path)
          if (pointBefore) {
            Transforms.select(editor, pointBefore)
          }

          return true
        }
      } else {
        // Check if we are moving towards the element.
        if (focus.offset === 0) {
          // Get the immediate previous node (Do NOT use match here!)
          const previous = Editor.previous(editor, { at: focus })

          if (previous) {
            // Get the parent of the previous node.
            const [, previousPath] = previous
            const [node, path] = Editor.parent(editor, previousPath)

            if (
              Element.isElement(node) &&
              node.type == 'latex-inline' &&
              node.mode === 'read'
            ) {
              evt.preventDefault()

              // Move backward over the node.
              const pointBefore = Editor.before(editor, path)

              if (pointBefore) {
                // If shift is held, we extend the selection (update focus only).
                // If not, we move the whole cursor (update anchor and focus).
                if (evt.shiftKey) {
                  Transforms.setSelection(editor, { focus: pointBefore })
                } else {
                  Transforms.select(editor, pointBefore)
                }
              }

              return true
            }
          }
        }
      }

      break
    }

    case 'ArrowRight': {
      if (entry) {
        // Check if are moving away from the element.
        const [, path] = entry
        const end = Editor.end(editor, path)

        if (Point.equals(anchor, end)) {
          evt.preventDefault()

          // 1. Switch node to view mode.
          Transforms.setNodes(editor, { mode: 'read' }, { at: path })

          // 2. Get the cursor out of node.
          const pointAfter = Editor.after(editor, path)
          if (pointAfter) {
            Transforms.select(editor, pointAfter)
          }

          return true
        }
      } else {
        // Check if we are moving towards the element.
        const pointAfter = Editor.after(editor, focus)

        // Check if we are at the boundary of the current node.
        if (pointAfter && !Point.equals(pointAfter, focus)) {
          const next = Editor.next(editor, { at: focus })

          if (next) {
            const [, nextPath] = next
            const [node, path] = Editor.parent(editor, nextPath)

            if (Element.isElement(node) && node.type === 'latex-inline') {
              // Check if we are truly at the end of the text node before latex inline.
              //const isAtEndOfText = Point.equals(focus, Editor.end(editor, focus.path));

              //if (isAtEndOfText && node.mode === "read") {
              if (node.mode === 'read') {
                evt.preventDefault()

                const pointAfterNode = Editor.after(editor, path)

                if (pointAfterNode) {
                  if (evt.shiftKey) {
                    Transforms.setSelection(editor, { focus: pointAfterNode })
                  } else {
                    Transforms.select(editor, pointAfterNode)
                  }
                }

                return true
              }
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
export function latexInline(): LatexInlineAddon {
  return elementAddon({
    id: 'latex-inline',
    render,
    deleteBackward,
    insertText,
    isInline,
    onChange,
    onKeyDown,
  })
}

export * from './schema'
export * from './types'
