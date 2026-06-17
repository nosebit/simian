import { Editor, Range } from "slate";
import { ReactEditor } from "slate-react";

export function getSlash(
  editor: Editor,
  insertedText: string = "", 
  isDeleting: boolean = false
) {
  const { selection } = editor;
  if (!selection || !Range.isCollapsed(selection)) return null;

  const [cursor] = Range.edges(selection);
  const startOfBlock = Editor.start(editor, cursor.path);
  const currentRange = { anchor: startOfBlock, focus: cursor };
  const currentText = Editor.string(editor, currentRange);
  
  // Project the text state
  let projectedText = currentText + insertedText;

  if (isDeleting && projectedText.length > 0) {
    projectedText = projectedText.slice(0, -1);
  }

  const lastSlashIndex = projectedText.lastIndexOf("/");

  if (lastSlashIndex === -1) return null;

  const textAfterSlash = projectedText.slice(lastSlashIndex + 1);
  const charBeforeSlash = projectedText[lastSlashIndex - 1];

  const isValidStart = !charBeforeSlash || charBeforeSlash === " " || charBeforeSlash === "\n";
  const hasNoSpaces = !textAfterSlash.includes(" ");

  if (!isValidStart || !hasNoSpaces) return null;

  // Calculate the projected focus offset
  const newOffset = cursor.offset + insertedText.length - (isDeleting ? 1 : 0);

  // If the user deletes the "/" itself, newOffset might become 
  // less than the lastSlashIndex. In that case, mode is over.
  if (newOffset <= lastSlashIndex && isDeleting) return null;

  return {
    range: {
      anchor: { path: cursor.path, offset: lastSlashIndex },
      focus: { path: cursor.path, offset: newOffset },
    },
    query: textAfterSlash,
  };
}

export function getSlashPosition(editor: Editor, range: Range) {
  const domRange = ReactEditor.toDOMRange(editor, range);
  const rect = domRange.getBoundingClientRect();

  const editorEl = document.getElementById(`editor-${editor.id}`) as HTMLElement;
  const editorRect = editorEl.getBoundingClientRect();

  return {
    top: rect.bottom - editorRect.top + editorEl.scrollTop,
    left: rect.left - editorRect.left + editorEl.scrollLeft,
  };
}