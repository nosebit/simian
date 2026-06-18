'use client'

import { nanoid } from 'nanoid'
import { Editor, Element, Node, Path, Transforms } from 'slate'

import { isInsideElement } from '@/ui/editor/utils'
import { isInsideMark } from '../text/utils'
import { elementAddon } from '../base'
import { ImageBlockContext } from './context'
import { ImageBlock } from './element'
import { ImageBlockAddon, ImageBlockAddonParams } from './types'
import { slashCommands } from './slash'
import { useEditor } from '../../context'

/**
 * The render function.
 */
const render: ImageBlockAddon['render'] = ({ element, ...props }) => {
  if (element.type == 'image-block') {
    return <ImageBlock {...props} element={element} />
  }

  return null
}

/**
 * The context provider component.
 */
const ContextProvider: ImageBlockAddon['ContextProvider'] = ({
  addon,
  children,
}) => (
  <ImageBlockContext.Provider
    value={{
      fileUploadAction: addon.fileUploadAction,
    }}
  >
    {children}
  </ImageBlockContext.Provider>
)

const Companion: ImageBlockAddon['Companion'] = () => {
  const { editor } = useEditor()

  return <div id={`image-fullscreen-root-${editor.id}`} />
}

/**
 * Handle image keyboard shortcut.
 */
const insertText: ImageBlockAddon['insertText'] = (
  { editor, selection },
  text,
) => {
  // Detect when user types [alt](src). When src is empty we should
  // show the upload box; otherwise we should render the image directly.

  // 1. Check if the user typed the closing parenthesis
  if (text === ')') {
    // Skip detection if we are inside some special elements.
    if (
      isInsideElement(editor, ['code-block', 'latex-block', 'latex-inline']) ||
      isInsideMark(editor, 'code')
    ) {
      return false
    }

    // 2. Get the current text block
    if (selection?.isCollapsed) {
      const { anchor } = selection
      const blockEntry = Editor.above(editor, {
        match: (n) => Element.isElement(n) && Editor.isBlock(editor, n),
      })

      if (!blockEntry) return false
      const [, blockPath] = blockEntry

      const start = Editor.start(editor, blockPath)
      const end = Editor.end(editor, blockPath)
      const rangeBefore = { anchor, focus: start }
      const beforeText = Editor.string(editor, rangeBefore) + text

      const imageMatch = beforeText.match(/!\[([^\]]*)\]\(([^)]*)\)$/)

      if (imageMatch) {
        const [fullMatch, alt, url] = imageMatch
        const matchStartOffset = anchor.offset - (fullMatch.length - 1)

        // Conditions for cleaner logic
        const isAtStart = matchStartOffset === 0
        const isAtEnd = anchor.offset === end.offset // No text after the pattern
        const nextPath = Path.next(blockPath)
        const hasNextNode = Node.has(editor, nextPath)

        const imageNode = {
          id: nanoid(),
          type: 'image-block',
          items: url ? [{ id: nanoid(), alt, url, mime: '' }] : [],
          children: [{ text: '' }],
        }

        Editor.withoutNormalizing(editor, () => {
          if (isAtStart && isAtEnd) {
            /**
             * CASE A: Pattern is the ONLY content of the paragraph
             */
            // Delete the pattern text
            Transforms.delete(editor, {
              at: { anchor: start, focus: anchor },
            })

            if (hasNextNode) {
              // CONVERT: Change this paragraph to image-block since one exists below
              Transforms.setNodes(editor, imageNode, { at: blockPath })
              // Move cursor to the existing paragraph below
              Transforms.select(editor, Editor.start(editor, nextPath))
            } else {
              // SHIFT: Insert image here, which pushes this empty paragraph down as a spacer
              Transforms.insertNodes(editor, imageNode as Node, {
                at: blockPath,
              })
              Transforms.select(editor, Editor.start(editor, nextPath))
            }
          } else {
            /**
             * CASE B: Pattern is in the middle, or at start/end with other text
             */
            // Split exactly at the start of the pattern
            const splitPoint = { path: anchor.path, offset: matchStartOffset }
            Transforms.splitNodes(editor, { at: splitPoint })

            const newBlockPath = Path.next(blockPath)

            // Delete pattern in the new split block
            const patternStart = Editor.start(editor, newBlockPath)
            const patternRange = {
              anchor: patternStart,
              focus: { path: patternStart.path, offset: fullMatch.length - 1 },
            }
            Transforms.delete(editor, { at: patternRange })

            // Insert image
            Transforms.insertNodes(editor, imageNode as Node, {
              at: newBlockPath,
            })

            // Handle suffix/spacer
            const suffixPath = Path.next(newBlockPath)
            if (!Node.has(editor, suffixPath)) {
              Transforms.insertNodes(
                editor,
                { id: nanoid(), type: 'paragraph', children: [{ text: '' }] },
                { at: suffixPath },
              )
            }

            Transforms.select(editor, Editor.start(editor, suffixPath))
          }
        })

        return true
      }
    }
  }

  return false
}

// /**
//  * Normalizer for image-block to migrate legacy width to blocks object.
//  */
// const normalizeNode: ImageBlockAddon["normalizeNode"] = ({ editor }, entry) => {
//   const [node, path] = entry;

//   // 1. Check if the node is an image-block and has the legacy 'width' property
//   if (
//     Element.isElement(node) &&
//     node.type === "image-block" &&
//     "width" in node
//   ) {
//     const legacyWidth = node.width as string | undefined;
//     const currentBlocks = node.blocks ?? {};

//     // 2. Wrap in withoutNormalizing to prevent infinite loops during the transform
//     Editor.withoutNormalizing(editor, () => {
//       // Migrate top-level width to blocks.container.width
//       Transforms.setNodes(
//         editor,
//         {
//           blocks: {
//             ...currentBlocks,
//             ...legacyWidth ? {
//               container:
//             }

//             // container: typeof currentBlocks.container === "object"
//             //   ? { ...currentBlocks.container, width: legacyWidth }
//             //   : { width: legacyWidth },
//           },
//         },
//         { at: path }
//       );

//       // 3. Remove the legacy property key
//       Transforms.unsetNodes(editor, "width", { at: path });
//     });

//     // Return true to indicate normalization occurred
//     return true;
//   }

//   return false;
// };

/**
 * Handles key down on image-block.
 */
const onKeyDown: ImageBlockAddon['onKeyDown'] = (
  { editor, selection },
  evt,
) => {
  if (evt.key === 'Enter' && selection) {
    // 1. Check if we are selecting an image-block
    const entry = Editor.above(editor, {
      match: (n) => Element.isElement(n) && n.type === 'image-block',
    })

    if (entry) {
      const [, path] = entry
      evt.preventDefault()

      const nextPath = Path.next(path)
      const hasNextNode = Node.has(editor, nextPath)

      if (hasNextNode) {
        // CASE: There is already a node after the image
        const [nextNode] = Editor.node(editor, nextPath)

        if (Element.isElement(nextNode) && nextNode.type === 'paragraph') {
          // If it's a paragraph, just move the cursor there
          Transforms.select(editor, Editor.start(editor, nextPath))
        } else {
          // If the next node isn't a paragraph (e.g., another image),
          // insert a paragraph in between them
          Transforms.insertNodes(
            editor,
            { id: nanoid(), type: 'paragraph', children: [{ text: '' }] },
            { at: nextPath },
          )
          Transforms.select(editor, Editor.start(editor, nextPath))
        }
      } else {
        // CASE: This is the last node in the document, create a new paragraph
        Transforms.insertNodes(
          editor,
          { id: nanoid(), type: 'paragraph', children: [{ text: '' }] },
          { at: nextPath },
        )
        Transforms.select(editor, Editor.start(editor, nextPath))
      }

      return true // Stop other addons from handling Enter
    }
  }

  return false
}

export function imageBlock(props: ImageBlockAddonParams): ImageBlockAddon {
  return elementAddon({
    ...props,
    id: 'image-block',
    render,
    insertText,
    onKeyDown,
    slashCommands,

    Companion,
    ContextProvider,
  })
}

export * from './schema'
export * from './types'
