import clsx from "clsx";
import { useMemo } from "react";
import { Editor, Node, Transforms } from "slate";
import { ReactEditor } from "slate-react";

import {
  ghDarkDimmed,
  ghDarkHighContrast,
} from "@/ui/editor/addon/code-block/utils/highlighter";
import { contextualize } from "@/ui/editor/context";
import { ElementProps } from "@/ui/editor/types";
import { useTheme } from "next-themes";

import { useEquationNumber } from "./context";
import { renderKaTeX } from "./utils";
import { Block } from "../../block";

export const LatexBlockElement = contextualize<ElementProps<"latex-block">>()([
  "editor",
], ({
  attributes,
  children,
  editor,
  element,
}) => {
  const num = useEquationNumber(element.id);
  const { resolvedTheme: themeMode } = useTheme();
  const text = Node.string(element);

  const [fgColor, bgColor] = useMemo(() => {
    if (themeMode === "dark") {
      return [ghDarkDimmed.colors?.["editor.foreground"], ghDarkDimmed.colors?.["editor.background"]];
    }

    return [ghDarkHighContrast.colors?.["editor.foreground"], ghDarkHighContrast.colors?.["editor.background"]];
  }, [themeMode])

  const handleMouseDown = (e: React.MouseEvent) => {
    // detail === 2 means this is the second click in a short duration (Double Click)
    if (e.detail === 2) {
      e.preventDefault(); // Prevent Slate from handling the double-click selection
      
      const path = ReactEditor.findPath(editor, element);

      Transforms.setNodes(
        editor,
        { mode: "write" },
        { at: path }
      );

      // We need a slight delay to ensure the DOM has switched to edit mode
      // before we try to focus the end of the text.
      setTimeout(() => {
        ReactEditor.focus(editor);
        Transforms.select(editor, Editor.end(editor, path));
      }, 0);
    }
  };

  return (
    <Block
      element={element}
      {...attributes}
    >
      {element.mode == "write" ? (
        <div
          className={clsx(["p-3 mb-6 rounded font-mono text-sm"])}
          style={{
            color: fgColor,
            backgroundColor: bgColor
          }}
        >
          {children}
        </div>
      ) : (
        <div
          className="rounded p-3 overflow-x-scroll"
          onMouseDown={handleMouseDown}
          contentEditable={false}
        >
          <div
            dangerouslySetInnerHTML={{
              __html: renderKaTeX(text, num),
            }}
          />

          {/* Hidden children are CRUCIAL because
            Slate needs the text in the DOM to maintain the model. */}
          <span className="sr-only pointer-events-none opacity-0">
            {children}
          </span>
        </div>
      )}
    </Block>
  );
});