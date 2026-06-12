import { Ancestor, Editor, Element, Node, Path, Range, Transforms } from 'slate'

export const isInsideElement = (
  editor: Editor,
  type: Element['type'] | Element['type'][],
) => {
  const types = typeof type === 'string' ? [type] : type

  const match = Editor.above(editor, {
    match: (n) => Element.isElement(n) && types.includes(n.type),
  })

  return !!match
}

export const getBlockContainer = (editor: Editor) => {
  const rootEntry = Array.from(
    Editor.nodes(editor, {
      at: [],
      match: (n) => Element.isElement(n) && n.type === 'root',
    }),
  )[0]

  if (rootEntry) {
    // We cast to Ancestor to ensure .children is accessible safely
    return {
      node: rootEntry[0] as Ancestor,
      path: rootEntry[1],
      isNested: true,
    }
  }

  return {
    node: editor as Ancestor,
    path: [],
    isNested: false,
  }
}

export const findNodeById = (
  editor: Editor,
  id: string,
): [Node, Path] | undefined => {
  // We use the generator from Editor.nodes to find the first match
  const [match] = Array.from(
    Editor.nodes(editor, {
      at: [], // Search the whole document
      match: (n) => Element.isElement(n) && 'id' in n && n.id === id,
    }),
  )

  return match
}

export function blockApply(options: {
  editor: Editor
  block: Element
  at?: Path
  focus?: 'block' | 'next'
  afterElement?: () => Element
  removeRange?: Range
  patchBlock?: (targetBlock: Element, existingContent: Node[]) => Element
}) {
  const {
    editor,
    block,
    at,
    focus = 'next',
    afterElement,
    removeRange,
    patchBlock,
  } = options

  Editor.withoutNormalizing(editor, () => {
    const container = getBlockContainer(editor)
    let currentBlockPath: Path | undefined

    // 1. Resolve the target path
    if (at) {
      currentBlockPath = at
    } else {
      const actionPath =
        removeRange?.anchor.path ?? editor.selection?.anchor.path
      if (!actionPath) return

      const blockEntry = Editor.above(editor, {
        at: actionPath,
        match: (n) => Element.isElement(n),
      })
      if (blockEntry) currentBlockPath = blockEntry[1]
    }

    if (!currentBlockPath) return

    // --- NEW: CONTAINER SAFETY CHECK ---
    // Ensure the currentBlockPath is actually INSIDE the container.
    // (e.g., if container is [0], path must start with [0])
    if (
      container.isNested &&
      !Path.isAncestor(container.path, currentBlockPath)
    ) {
      console.warn('Attempted to apply block outside of the root container.')
      return
    }

    const currentText = Editor.string(editor, currentBlockPath)
    const textToDelete = removeRange ? Editor.string(editor, removeRange) : ''
    const isEffectivelyEmpty = currentText.trim() === textToDelete.trim()

    if (removeRange) {
      Transforms.delete(editor, { at: removeRange })
    }

    let finalBlockToInsert = block

    if (patchBlock && !isEffectivelyEmpty) {
      const cleanChildren = (Node.get(editor, currentBlockPath) as Element)
        .children
      finalBlockToInsert = patchBlock(block, cleanChildren)
    }

    let insertedPath = currentBlockPath

    // 2. Execution logic
    // if (isEffectivelyEmpty || patchBlock) {
    //   if (removeRange) Transforms.delete(editor, { at: removeRange });
    //   Transforms.setNodes(editor, block as Partial<Node>, { at: currentBlockPath });
    //   console.log("@@ SET NODES");
    // } else {
    //   console.log("@@ INSERTING NODE");
    //   if (removeRange) Transforms.delete(editor, { at: removeRange });
    //   const nextPath = Path.next(currentBlockPath);
    //   Transforms.insertNodes(editor, block, { at: nextPath });
    //   insertedPath = nextPath;
    // }
    if (isEffectivelyEmpty || patchBlock) {
      // Structural swap: Remove old container, insert new structured one
      Transforms.removeNodes(editor, { at: currentBlockPath })
      Transforms.insertNodes(editor, finalBlockToInsert, {
        at: currentBlockPath,
      })
    } else {
      // Contextual insert: Keep the paragraph we are in, and put the block after
      const nextPath = Path.next(currentBlockPath)
      Transforms.insertNodes(editor, finalBlockToInsert, { at: nextPath })
      insertedPath = nextPath
    }

    // 3. Suffix Logic (Crucial use of container)
    const finalNextPath = Path.next(insertedPath)

    // Check if there is anything after our inserted node WITHIN the container
    const isLastInContainer =
      insertedPath[insertedPath.length - 1] ===
      container.node.children.length - 1

    if (afterElement && isLastInContainer) {
      Transforms.insertNodes(editor, afterElement(), { at: finalNextPath })
    }

    // 4. Selection
    if (!at || options.focus) {
      const selectionPath =
        focus === 'next' && Node.has(editor, finalNextPath)
          ? finalNextPath
          : insertedPath
      Transforms.select(editor, Editor.start(editor, selectionPath))
    }
  })
}

export const nodeReduce = (
  root: Node,
  visit: (node: Node) => Node | null,
): Node | null => {
  const node = visit(root)

  if (node && Element.isElement(node) && node.children) {
    node.children = node.children
      .map((child) => nodeReduce(child, visit))
      .filter((child) => child !== null) as typeof node.children
  }

  return node
}
