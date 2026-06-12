import { Editor, Node, NodeEntry, Range, Transforms } from 'slate'

const INDENT = '  '

const getLineStartOffsets = (
  fullText: string,
  startOffset: number,
  endOffset: number,
): number[] => {
  const offsets: number[] = []

  // ---- 1. Find the start of the first touched line
  let firstLineStart = fullText.lastIndexOf('\n', startOffset - 1)
  firstLineStart = firstLineStart === -1 ? 0 : firstLineStart + 1
  offsets.push(firstLineStart)

  // ---- 2. Walk forward through fullText from firstLineStart,
  // collecting all newline boundaries up to endOffset
  for (let i = firstLineStart; i < endOffset; i++) {
    if (fullText[i] === '\n') {
      offsets.push(i + 1)
    }
  }

  // Deduplicate and sort
  return Array.from(new Set(offsets)).sort((a, b) => a - b)
}

function indent(
  editor: Editor,
  [block, path]: NodeEntry,
  event: React.KeyboardEvent<HTMLDivElement>,
) {
  const { selection } = editor
  if (!selection) return

  event.preventDefault()

  const fullText = Node.string(block)
  const blockStart = Editor.start(editor, path)

  const anchorOffset =
    Editor.point(editor, selection.anchor).offset -
    Editor.point(editor, blockStart).offset

  const focusOffset =
    Editor.point(editor, selection.focus).offset -
    Editor.point(editor, blockStart).offset

  const startOffset = Math.min(anchorOffset, focusOffset)
  const endOffset = Math.max(anchorOffset, focusOffset)
  const hasRange = startOffset !== endOffset

  if (!hasRange) {
    Transforms.insertText(editor, INDENT)
    return
  }

  // ---- Collapsed selection → indent the current line
  if (Range.isCollapsed(selection)) {
    const lineStarts = getLineStartOffsets(fullText, startOffset, startOffset)
    const lineStart = lineStarts[0]

    Transforms.insertText(editor, INDENT, {
      at: { path: blockStart.path, offset: lineStart },
    })

    return
  }

  // ---- Multi-line indent
  const lineStarts = getLineStartOffsets(fullText, startOffset, endOffset)

  // Insert indent *in reverse order* to avoid offset shifting
  for (let i = lineStarts.length - 1; i >= 0; i--) {
    const absoluteOffset = lineStarts[i]

    Transforms.insertText(editor, INDENT, {
      at: { path: blockStart.path, offset: absoluteOffset },
    })
  }
}

function unindent(
  editor: Editor,
  [block, path]: NodeEntry,
  event: React.KeyboardEvent<HTMLDivElement>,
) {
  const { selection } = editor
  if (!selection) return

  event.preventDefault()

  const fullText = Node.string(block)
  const blockStart = Editor.start(editor, path)

  const anchorOffset =
    Editor.point(editor, selection.anchor).offset -
    Editor.point(editor, blockStart).offset
  const focusOffset =
    Editor.point(editor, selection.focus).offset -
    Editor.point(editor, blockStart).offset

  const startOffset = Math.min(anchorOffset, focusOffset)
  const endOffset = Math.max(anchorOffset, focusOffset)

  const hasRange = startOffset !== endOffset

  if (!hasRange) {
    return
  }

  // ---- Collapsed selection → unindent current line
  if (Range.isCollapsed(selection)) {
    const lineStarts = getLineStartOffsets(fullText, startOffset, startOffset)
    const lineStart = lineStarts[0]

    const two = fullText.slice(lineStart, lineStart + 2)
    const one = fullText.charAt(lineStart)

    let del = 0
    if (one === '\t') del = 1
    else if (two === '  ') del = 2
    else if (one === ' ') del = 1

    if (del > 0) {
      Transforms.delete(editor, {
        at: {
          anchor: { path: blockStart.path, offset: lineStart },
          focus: { path: blockStart.path, offset: lineStart + del },
        },
      })
    }
    return
  }

  // ---- Multi-line unindent
  const lineStarts = getLineStartOffsets(fullText, startOffset, endOffset)

  // Apply deletions in reverse order
  for (let i = lineStarts.length - 1; i >= 0; i--) {
    const absoluteOffset = lineStarts[i]

    const two = fullText.slice(absoluteOffset, absoluteOffset + 2)
    const one = fullText.charAt(absoluteOffset)

    let del = 0
    if (one === '\t') del = 1
    else if (two === '  ') del = 2
    else if (one === ' ') del = 1

    if (del > 0) {
      Transforms.delete(editor, {
        at: {
          anchor: { path: blockStart.path, offset: absoluteOffset },
          focus: { path: blockStart.path, offset: absoluteOffset + del },
        },
      })
    }
  }
}

export function handleIndentKeyDown(
  editor: Editor,
  entry: NodeEntry,
  event: React.KeyboardEvent<HTMLDivElement>,
) {
  if (
    (event.key === 'Tab' && !event.shiftKey) ||
    (event.metaKey && event.key == ']')
  ) {
    indent(editor, entry, event)
  }
  if (
    (event.key === 'Tab' && event.shiftKey) ||
    (event.metaKey && event.key == '[')
  ) {
    unindent(editor, entry, event)
  }
}
