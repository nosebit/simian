import { nanoid } from 'nanoid'
import { Editor, Element, Node, Path, Transforms } from 'slate'

import { getBlockContainer } from '@/ui/editor/utils'

import { elementAddon } from '../base'

import { TitleContext, TitleContextValue } from './context'
import { Title } from './element'
import { TitleAddon } from './types'

/**
 * The render function.
 */
const render: TitleAddon['render'] = ({ element, ...props }) => {
  if (element.type == 'title') {
    return <Title {...props} element={element} />
  }

  return null
}

/**
 * The context provider component.
 */
const ContextProvider: TitleAddon['ContextProvider'] = ({
  addon,
  children,
}) => (
  <TitleContext.Provider
    value={{
      emptyPlaceholder: addon.emptyPlaceholder,
    }}
  >
    {children}
  </TitleContext.Provider>
)

/**
 * Prevent deleting the title node.
 */
const deleteBackward: TitleAddon['deleteBackward'] = ({
  editor,
  selection,
}) => {
  if (selection?.isCollapsed) {
    const entry = Editor.above(editor, {
      match: (n) => Element.isElement(n) && Editor.isBlock(editor, n),
    })

    if (entry) {
      const [cell, path] = entry

      // Check if we are at the start of a paragraph
      if (
        Element.isElement(cell) &&
        cell.type === 'paragraph' &&
        Editor.isStart(editor, selection.anchor, path)
      ) {
        const container = getBlockContainer(editor)
        const indexInContainer = path[path.length - 1]

        // If the current element is at the "Mandatory Body Start" index
        const hasSubtitle =
          Element.isElement(container.node.children[1]) &&
          container.node.children[1].type === 'subtitle'
        const bodyIndex = hasSubtitle ? 2 : 1

        if (indexInContainer === bodyIndex) {
          // Instead of merging, jump cursor to the node above
          const prevPath = Path.previous(path)
          Transforms.select(editor, Editor.end(editor, prevPath))
          return true
        }
      }
    }
  }

  return false
}

/**
 * Prevent deleting the title node.
 */
const deleteForward: TitleAddon['deleteForward'] = ({ editor, selection }) => {
  if (selection?.isCollapsed) {
    const [title] =
      Editor.above(editor, {
        match: (n) => Element.isElement(n) && n.type === 'title',
      }) || []

    if (
      title &&
      Editor.isEnd(editor, selection.anchor, selection.anchor.path)
    ) {
      return true // Block deleting forward at the end of title
    }
  }

  return false
}

/**
 * Prevent user from inserting multiple titles on break.
 */
const insertBreak: TitleAddon['insertBreak'] = ({ editor }) => {
  const { selection } = editor
  if (!selection) return false

  const titleEntry = Editor.above(editor, {
    match: (n) => Element.isElement(n) && n.type === 'title',
  })

  if (titleEntry) {
    const container = getBlockContainer(editor)
    const { children } = container.node

    // Determine the "Body Start" index (where the user should land)
    const hasSubtitle =
      Element.isElement(children[1]) && children[1].type === 'subtitle'
    const bodyStartIndex = hasSubtitle ? 2 : 1

    const targetPath = [...container.path, bodyStartIndex]

    // Safety: If the target paragraph exists, move focus there.
    // If it doesn't, the Normalizer will create it, so we can just insert one.
    if (Node.has(editor, targetPath)) {
      Transforms.select(editor, Editor.start(editor, targetPath))
    } else {
      // This handles the edge case where the normalizer hasn't run yet
      Transforms.insertNodes(
        editor,
        { id: nanoid(), type: 'paragraph', children: [{ text: '' }] },
        { at: targetPath },
      )
      Transforms.select(editor, Editor.start(editor, targetPath))
    }

    return true // Prevent the default "split-node" behavior
  }

  return false
}

// const normalizeNode: TitleAddon["normalizeNode"] = ({ editor }, entry) => {
//   const [, path] = entry;

//   // 1. Get the container (either Editor root or 'root' element)
//   const container = getBlockContainer(editor);

//   /** * 2. Trigger Check:
//    * We only run structural normalization when Slate is looking at the CONTAINER.
//    * If container is root element [0], we trigger when path is [0].
//    * If container is editor [], we trigger when path is [].
//    */
//   if (!Path.equals(path, container.path)) return false;

//   const children = container.node.children;

//   // 3. Force Title at index 0 of the container
//   const firstChild = children[0];

//   // Bypass structural rules if the document is a Widget
//   if (Element.isElement(firstChild) && firstChild.type === 'widget') {
//     // If there are other children besides the widget, remove them (Force single-child)
//     if (children.length > 1) {
//       Transforms.removeNodes(editor, {
//         at: container.path,
//         match: (n, p) => p.length === container.path.length + 1 && p[p.length - 1] > 0,
//       });
//     }

//     return true; // Valid Widget mode, stop here.
//   }

//   if (Element.isElement(firstChild) && firstChild.type !== 'title') {
//     Transforms.setNodes(
//       editor,
//       { type: 'title' },
//       { at: [...container.path, 0] }
//     );
//     return true;
//   }

//   // 4. Ensure there's a second node (the "healing" logic)
//   // If the document is just a title, add the mandatory paragraph.
//   if (editor.hasAddon("paragraph") && children.length < 2) {
//     Transforms.insertNodes(
//       editor,
//       { id: nanoid(), type: 'paragraph', children: [{ text: '' }] },
//       { at: [...container.path, 1] }
//     );

//     return true;
//   }

//   return false;
// };

// const normalizeNode: TitleAddon["normalizeNode"] = ({ editor }, entry) => {
//   const [node, path] = entry;

//   // Rule: If a title exists, it MUST be at the top (index 0)
//   if (Element.isElement(node) && node.type === 'title' && path[path.length - 1] !== 0) {
//     Transforms.moveNodes(editor, { at: path, to: [path[0], 0] });
//     return true;
//   }
//   return false;
// };
// const normalizeNode: TitleAddon["normalizeNode"] = ({ editor }, entry) => {
//   const [node, path] = entry;

//   if (Element.isElement(node) && node.type === 'title') {
//     const container = getBlockContainer(editor);
//     const targetPath = [...container.path, 0];

//     // 1. If it's already at the top, we're good.
//     if (Path.equals(path, targetPath)) return false;

//     // 2. Check if there's ALREADY a title at the top.
//     const firstChild = container.node.children[0];
//     const hasTitleAtTop = Element.isElement(firstChild) && firstChild.type === 'title';

//     if (hasTitleAtTop) {
//       // If there is already a title at index 0, this current one is a duplicate. Remove it.
//       Transforms.removeNodes(editor, { at: path });
//       return true;
//     } else {
//       // If index 0 is NOT a title, move this one there.
//       Transforms.moveNodes(editor, { at: path, to: targetPath });
//       return true;
//     }
//   }
//   return false;
// };

const normalizeNode: TitleAddon['normalizeNode'] = ({ editor }, entry) => {
  const [node, path] = entry

  if (Element.isElement(node) && node.type === 'title') {
    const container = getBlockContainer(editor)
    const { children } = container.node
    const index = path[path.length - 1]

    // 1. Find the first title in the container
    const firstTitleIndex = children.findIndex(
      (n) => Element.isElement(n) && n.type === 'title',
    )

    // 2. If this isn't the first title found, it's a duplicate.
    if (firstTitleIndex !== -1 && index !== firstTitleIndex) {
      Transforms.removeNodes(editor, { at: path })
      return true
    }

    // 3. If it is the first title but not at index 0, move it to the top.
    if (index !== 0) {
      Transforms.moveNodes(editor, { at: path, to: [...container.path, 0] })
      return true
    }
  }
  return false
}

export function title(params?: TitleContextValue): TitleAddon {
  return elementAddon({
    emptyPlaceholder: (t) => t.title('title'),
    ...params,
    id: 'title',
    render,
    deleteBackward,
    deleteForward,
    insertBreak,
    normalizeNode,

    ContextProvider,
  })
}

export * from './schema'
export * from './types'
