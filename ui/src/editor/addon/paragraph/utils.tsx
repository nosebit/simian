import { nanoid } from 'nanoid'
import { Editor, Element, Node, NodeEntry, Path, Transforms } from 'slate'

export function paragraphAfter(editor: Editor, [, path]: NodeEntry) {
  const nextPath = Path.next(path)

  // ONLY proceed if path exists
  const hasNext = Node.has(editor, nextPath)

  if (!hasNext) {
    // Safe: this inserts a paragraph after the target block.
    Transforms.insertNodes(
      editor,
      {
        id: nanoid(),
        type: 'paragraph',
        children: [{ text: '' }],
      },
      { at: nextPath },
    )
    return // Prevent double normalization
  }

  const nextNode = Node.get(editor, nextPath)

  if (Element.isElement(nextNode) && nextNode.type !== 'paragraph') {
    Transforms.insertNodes(
      editor,
      {
        id: nanoid(),
        type: 'paragraph',
        children: [{ text: '' }],
      },
      { at: nextPath },
    )
    return
  }
}
