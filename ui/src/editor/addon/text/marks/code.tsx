import { Editor, Element, Transforms } from 'slate'

//import { isInsideElement } from "@/ui/editor/utils";
import { TextMark } from '../types'
import { isInsideMark } from '../utils'
import { applyMarkOnHotKey } from '../utils/keyboard'

export const CodeMark: TextMark = (props) => {
  return (
    <code
      {...props}
      className="
        rounded-md px-1.5 py-0.5 text-sm font-mono 
        bg-zinc-100 text-zinc-800 
        dark:bg-zinc-800 dark:text-zinc-100
        border border-zinc-200 dark:border-zinc-700
      "
    />
  )
}

/**
 * Handle key down to detect when we should leave the code mark.
 */
CodeMark.onKeyDown = ({ editor, selection }, evt) => {
  if (applyMarkOnHotKey(editor, evt, 'mod+`', 'code')) {
    return true
  }

  if (selection?.isCollapsed) {
    // Check if we are inside the code mark.
    const marks = Editor.marks(editor)

    if (marks?.code) {
      switch (evt.key) {
        // User hits Enter => Leave the code mark and go to next line.
        case 'Enter': {
          evt.preventDefault()
          Editor.removeMark(editor, 'code')
          Editor.insertBreak(editor)
          break
        }

        // User hits Backspace at the very start of the code mark => remove the mark.
        case 'Backspace': {
          if (selection.anchor.offset === 0) {
            Editor.removeMark(editor, 'code')
          }

          break
        }

        default: {
          break
        }
      }
    }
  }

  return false
}

/**
 * Handle code mark markdown shortcut.
 */
CodeMark.insertText = ({ editor, selection }, text) => {
  if (text === '`' && selection?.isCollapsed) {
    // Skip detection if we are inside some special elements.
    if (
      //isInsideElement(editor, ["code-block", "latex-block", "latex-inline"]) ||
      isInsideMark(editor, 'code')
    ) {
      return false
    }

    const { anchor } = selection
    const block = Editor.above(editor, {
      match: (n) => Element.isElement(n) && Editor.isBlock(editor, n),
    })
    const path = block ? block[1] : []
    const start = Editor.start(editor, path)
    const rangeBefore = { anchor, focus: start }
    const beforeText = Editor.string(editor, rangeBefore)

    // Regex to match: `content
    const match = beforeText.match(/`([^`]+)$/)

    if (match) {
      const [fullMatch, content] = match

      // Calculate the start point of the `
      const startPoint = {
        path: anchor.path,
        offset: anchor.offset - fullMatch.length,
      }

      // 1. Select the range to replace: `content
      Transforms.select(editor, { anchor: startPoint, focus: anchor })

      // 2. Insert the node directly at the selection.
      // Without the 'at' property, Slate replaces the selection
      // and moves the cursor to the end of the insertion.
      Transforms.insertNodes(editor, { text: content, code: true })

      // 3. Clear the mark for the next character
      Editor.removeMark(editor, 'code')

      return true
    }
  }
  return false
}
