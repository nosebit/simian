import { useDebounce } from "@uidotdev/usehooks";
import clsx from "clsx";
import _ from "lodash";
import { FC, useEffect, useMemo, useRef, useState } from "react";
import TextareaAutosize from "react-textarea-autosize";

import { useMode } from "@/ui/editor/context";

export interface CaptionProps {
  itemId?: string | null;
  disabled?: boolean;
  value: string | null;
  onValueChange: (newValue: string | null) => void;
  className?: string;
  containerClassName?: string;
}

// export const Caption: FC<CaptionProps> = (props) => {
//   const [value, setValue] = useState<string | null>(props.value);
//   const debouncedValue = useDebounce(value, 0);

//   const textareaRef = useRef<HTMLInputElement>(null);
//   const spanRef = useRef<HTMLSpanElement>(null);
//   const placeholder = useMemo(() => "Add caption...", []);

//   useLayoutEffect(() => {
//     if (!spanRef.current || !textareaRef.current) return;

//     const span = spanRef.current;
//     const input = textareaRef.current;

//     const updateWidth = () => {
//       input.style.width = `${span.offsetWidth + 2}px`;
//     };

//     updateWidth();

//     const observer = new ResizeObserver(updateWidth);
//     observer.observe(span);

//     return () => observer.disconnect();
//   }, []);

//   useEffect(() => {
//     if (debouncedValue != props.value) {
//       props.onValueChange(debouncedValue);
//     }
//   // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [debouncedValue]);

//   useEffect(() => {
//     if (textareaRef.current) {
//       textareaRef.current.value = props.value ?? "";
//     }
//   }, [props.value]);

//   return (
//     <div
//       className={clsx([
//         "flex items-center justify-center",
//         props.containerClassName,
//       ])}
//     >
//       {/* Hidden measuring span */}
//       <span
//         ref={spanRef}
//         className="absolute invisible"
//       >
//         {value || placeholder}
//       </span>

//       <TextareaAutosize
//         ref={textareaRef}
//         placeholder={placeholder}
//         disabled={props.disabled}
//         className={clsx([
//           "bg-transparent text-sm italic",
//           "border-none outline-none",
//           "text-gray-600 dark:text-gray-400",
//           "focus:ring-0",
//           "field-sizing:content",
//           props.className,
//         ])}
//         onChange={(e) => setValue(e.target.value)}
//       />
//     </div>
//   );
// };

export const Caption: FC<CaptionProps> = (props) => {
  const mode = useMode();
  const [value, setValue] = useState<string | null>(props.value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const placeholder = useMemo(() => "Add caption...", []);

  // When props value changes we set the value of the textarea.
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.value = props.value ?? "";
    }
  }, [props.value]);

  if (mode === "read" && _.isEmpty(value)) {
    return null;
  }

  return (
    <div
      className={clsx([
        "flex w-full items-center justify-center px-4", // Added side padding here
        props.containerClassName,
      ])}
    > 
      <TextareaAutosize
        ref={textareaRef}
        placeholder={placeholder}
        disabled={props.disabled}
        className={clsx([
          "w-full max-w-prose resize-none bg-transparent text-center text-sm italic",
          "border-none outline-none focus:ring-0",
          "text-gray-600 dark:text-gray-400",
          "placeholder:text-gray-400 dark:placeholder:text-gray-500",
          "min-h-[24px] py-1",
          props.className,
        ])}
        onChange={(e) => {
          setValue(e.target.value);
        }}
        onBlur={(e) => {
          if (value !== props.value) {
            props.onValueChange(value);
          }
        }}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Enter") {
            // Optional: prevent accidental newlines if you only want wrapping
            e.preventDefault();
            // On enter, we could also blur to save
            textareaRef.current?.blur();
          }
        }}
      />
    </div>
  );
};