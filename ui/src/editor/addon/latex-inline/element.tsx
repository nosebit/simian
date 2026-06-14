import "katex/dist/katex.min.css";
import katex from "katex";
import { FC, useCallback, useEffect } from "react";
import { Editor, Node, Transforms } from "slate";
import { ReactEditor, useFocused, useSelected } from "slate-react";

import { useEditor } from "@/ui/editor/context";
import { ElementProps } from "@/ui/editor/types";
import clsx from "clsx";

export const LatexInline: FC<ElementProps<"latex-inline">> = ({
  attributes,
  children,
  element,
}) => {
  const { editor } = useEditor();
  const expression = Node.string(element);
  const selected = useSelected();
  const focused = useFocused();

  // Get the first child (which is the Text node) to check for notes
  // const {
  //   activateNotes,
  //   noteIds,
  //   className: noteClassName
  // } = useNotes(element);

  const setMode = useCallback((newMode: 'read' | 'write') => {
    if (editor.mode === "read") return;

    const path = ReactEditor.findPath(editor, element);
    Transforms.setNodes(editor, { mode: newMode }, { at: path });

    // When switching to edit mode, focus the editor and place the cursor inside the node
    if (newMode === 'write') {
      ReactEditor.focus(editor);
      const nodeEnd = Editor.end(editor, path);
      Transforms.select(editor, nodeEnd);
      // Collapse to the end to place cursor at the end of the content
      Transforms.collapse(editor, { edge: 'end' }); 
    }
  }, [editor, element]);

  // Watch for "Click Out" events
  useEffect(() => {
    // If we are currently in view mode, do nothing.
    if (element.mode === "read") return;

    // Logic: If the node is currently editing, but:
    // A) The user selected something else (selected === false)
    // B) The user clicked outside the editor (focused === false)
    // Then switch back to view mode.
    if (!selected || !focused) {
      setMode("read");
    }
  }, [selected, focused, element.mode, setMode]);

  if (element.mode === "write" && editor.mode === "read") {
    return (
      <span
        {...attributes}
        className="
          rounded-md px-1.5 py-0.5 text-sm font-mono 
          dark:bg-zinc-100 dark:text-zinc-800 
          bg-zinc-800 text-zinc-100
          border dark:border-zinc-200 border-zinc-700
        "
      >
        {children}
      </span>
    );
  }

  return (
    <span
      {...attributes}
      // data-note-ids={noteIds?.join(",")}
      contentEditable={false}
      // onClick={() => {
      //   activateNotes();
      // }}
      onDoubleClick={() => setMode("write")}
      className={clsx([
        "inline-block relative",
        //noteClassName,
      ])}
    >
      <span
        dangerouslySetInnerHTML={{
          __html: katex.renderToString(expression, {
            throwOnError: false,
            displayMode: false,
          }),
        }}
      />

      {/* Hidden children are CRUCIAL because
          Slate needs the text in the DOM to maintain the model. */}
      <span className="sr-only pointer-events-none opacity-0">
        {children}
      </span>
    </span>
  );
}