import { useState } from 'react'
import { Element, Transforms } from 'slate'

import { getBlockContainer } from '@/ui/editor/utils'

import { elementAddon } from '../base'

import { SubTitleContext } from './context'
import { SubTitle } from './element'
import { SubTitleAddon, SubTitleAddonParams } from './types'

/**
 * The render function.
 */
const render: SubTitleAddon['render'] = ({ element, ...props }) => {
  if (element.type == 'subtitle') {
    return <SubTitle {...props} element={element} />
  }

  return null
}

/**
 * The context provider component.
 */
const ContextProvider: SubTitleAddon['ContextProvider'] = ({
  addon,
  children,
}) => {
  const [isMounted, setIsMounted] = useState(false)

  return (
    <SubTitleContext.Provider
      value={{
        emptyPlaceholder: addon.emptyPlaceholder,
        isMounted,
        setIsMounted,
      }}
    >
      {children}
    </SubTitleContext.Provider>
  )
}

// const normalizeNode: SubTitleAddon["normalizeNode"] = ({ editor }, entry) => {
//   const [node, path] = entry;

//   // 1. Identify if the node is a subtitle
//   if (Element.isElement(node) && node.type === 'subtitle') {
//     const container = getBlockContainer(editor);
//     const { children } = container.node;

//     // 2. Define the "Legal Path" for a subtitle
//     const legalPath = [...container.path, 1];
//     const isAtLegalPath = Path.equals(path, legalPath);

//     if (!isAtLegalPath) {
//       /**
//        * Scenario A: Duplicate Subtitle
//        * If there is already a subtitle at the legal position, delete this one.
//        */
//       const existingNodeAtLegalPath = children[1];
//       const hasExistingSubtitle =
//         Element.isElement(existingNodeAtLegalPath) &&
//         existingNodeAtLegalPath.type === 'subtitle';

//       if (hasExistingSubtitle) {
//         Transforms.removeNodes(editor, { at: path });
//         return true;
//       }

//       /**
//        * Scenario B: Misplaced Subtitle
//        * Move the subtitle to index 1 of the container.
//        */
//       Transforms.moveNodes(editor, {
//         at: path,
//         to: legalPath
//       });
//       return true;
//     }
//   }

//   return false;
// };

// const normalizeNode: SubTitleAddon["normalizeNode"] = ({ editor }, entry) => {
//   const [node, path] = entry;

//   if (Element.isElement(node) && node.type === 'subtitle') {
//     const container = getBlockContainer(editor);
//     const { children } = container.node;
//     const targetPath = [...container.path, 1];

//     // 1. If it's already at index 1, we're good.
//     if (Path.equals(path, targetPath)) return false;

//     // 2. Check the context of index 1
//     const nodeAtTarget = children[1];
//     const isTargetSubtitle = Element.isElement(nodeAtTarget) && nodeAtTarget.type === 'subtitle';
//     const isFirstNodeTitle = Element.isElement(children[0]) && children[0].type === 'title';

//     if (isTargetSubtitle || !isFirstNodeTitle) {
//       /** * Remove if:
//        * - There's already a subtitle at index 1
//        * - OR there's no title at index 0 (Subtitle cannot exist without Title)
//        */
//       Transforms.removeNodes(editor, { at: path });
//       return true;
//     } else {
//       // Move to index 1
//       Transforms.moveNodes(editor, { at: path, to: targetPath });
//       return true;
//     }
//   }

//   return false;
// };

const normalizeNode: SubTitleAddon['normalizeNode'] = ({ editor }, entry) => {
  const [node, path] = entry

  if (Element.isElement(node) && node.type === 'subtitle') {
    const container = getBlockContainer(editor)
    const { children } = container.node
    const index = path[path.length - 1]

    // 1. Find the first subtitle in the container
    const firstSubtitleIndex = children.findIndex(
      (n) => Element.isElement(n) && n.type === 'subtitle',
    )

    // 2. If this isn't the first subtitle found, delete it.
    if (firstSubtitleIndex !== -1 && index !== firstSubtitleIndex) {
      Transforms.removeNodes(editor, { at: path })
      return true
    }

    // 3. Now check the "Legal" position for the first subtitle
    const hasTitleAtTop =
      Element.isElement(children[0]) && children[0].type === 'title'

    if (!hasTitleAtTop) {
      // Subtitle cannot exist without a Title at 0.
      Transforms.removeNodes(editor, { at: path })
      return true
    }

    if (index !== 1) {
      // If index 0 is a title, move this subtitle to index 1.
      Transforms.moveNodes(editor, { at: path, to: [...container.path, 1] })
      return true
    }
  }
  return false
}

export function subtitle(params?: SubTitleAddonParams): SubTitleAddon {
  return elementAddon({
    emptyPlaceholder: (t) => t.title('subtitle'),
    ...params,
    id: 'subtitle',
    render,
    normalizeNode,

    ContextProvider,
  })
}

export * from './schema'
export * from './types'
