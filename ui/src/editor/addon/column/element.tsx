import { Children, useCallback, useRef, useState } from 'react'
import clsx from 'clsx'
import { Transforms } from 'slate'
import { useSlateStatic } from 'slate-react'

import { Block } from '@/ui/editor/block'
import { contextualize, useMode } from '@/ui/editor/context'
import { ElementProps } from '@/ui/editor/types'

import { findNodeById } from '../../utils'

import { ColumnSlotContext, useColumnSlotContext } from './context'
import { ColumnSlotElement } from './types'

export type Breakpoint = 'base' | 'sm' | 'md' | 'lg' | 'xl'

// const ResizeHandle: React.FC<{
//   slotId: string;
//   currentFlex: ColumnSlotElement["flex"]
// }> = ({
//   slotId,
//   currentFlex
// }) => {
//   const editor = useSlateStatic();
//   const [isDragging, setIsDragging] = useState(false);
//   const rafRef = useRef<number | null>(null);

//   /**
//    * Identifies which breakpoint we are currently manipulating based on
//    * the browser's viewport. This should ideally match your Tailwind config.
//    */
//   const getCurrentBreakpoint = (): Breakpoint => {
//     const width = window.innerWidth;
//     if (width < 640) return "base";
//     if (width < 768) return "sm";
//     if (width < 1024) return "md";
//     return "lg";
//   };

//   const onMouseDown = useCallback((e: React.MouseEvent) => {
//     // Prevent Slate from gaining focus/moving cursor when clicking the handle
//     e.preventDefault();
//     e.stopPropagation();

//     setIsDragging(true);

//     const handleEl = e.currentTarget as HTMLElement;
//     const slotEl = handleEl.parentElement as HTMLElement;
//     const gridEl = slotEl.parentElement as HTMLElement;

//     if (!slotEl || !gridEl) return;

//     const startX = e.pageX;
//     const startWidth = slotEl.offsetWidth;
//     const gridWidth = gridEl.offsetWidth;
//     const activeBreakpoint = getCurrentBreakpoint();

//     const onMouseMove = (moveEvent: MouseEvent) => {
//       if (rafRef.current) cancelAnimationFrame(rafRef.current);

//       rafRef.current = requestAnimationFrame(() => {
//         const deltaX = moveEvent.pageX - startX;
//         const newWidthPx = startWidth + deltaX;

//         // 1. Calculate the percentage
//         const newPercentage = Math.max(10, Math.min(90, (newWidthPx / gridWidth) * 100));
//         const newFlexValue = `${newPercentage.toFixed(2)}%`;

//         // 2. IMMEDIATE FEEDBACK: Update the CSS variable on the GRID directly
//         // This bypasses React/Slate re-renders for the visual movement
//         gridEl.style.setProperty('--grid-md',
//           element.children.map((c, i) => i === idx ? newFlexValue : "1fr").join(" ")
//         );

//         // 3. DEBOUNCED SLATE UPDATE: Only update the actual Slate state occasionally
//         // or on MouseUp to prevent the "jumping" re-renders.
//         updateSlateNode(newFlexValue);
//       });
//     };

//     const onMouseUp = () => {
//       setIsDragging(false);
//       if (rafRef.current) cancelAnimationFrame(rafRef.current);
//       document.removeEventListener("mousemove", onMouseMove);
//       document.removeEventListener("mouseup", onMouseUp);
//       document.body.style.cursor = "";
//     };

//     // UI Feedback: Set global cursor so it doesn't flicker while dragging
//     document.body.style.cursor = "col-resize";
//     document.addEventListener("mousemove", onMouseMove);
//     document.addEventListener("mouseup", onMouseUp);
//   }, [editor, slotId, currentFlex]);

//   // Determine current display value for the tooltip
//   const activeBreakpoint = getCurrentBreakpoint();
//   const displayValue = currentFlex[activeBreakpoint] || "1fr";

//   return (
//     <div
//       contentEditable={false}
//       onMouseDown={onMouseDown}
//       className="absolute inset-0 flex justify-center items-center cursor-col-resize group/handle"
//     >
//       {/* The Blue Line from your screenshot */}
//       <div className={clsx(
//         "w-1 h-full transition-all duration-150",
//         isDragging
//           ? "bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.6)]"
//           : "bg-zinc-200 opacity-0 group-hover/handle:opacity-100"
//       )} />

//       {/* Value Tooltip while dragging */}
//       {isDragging && (
//         <div className="absolute -top-10 bg-zinc-900 text-white text-[10px] px-2 py-1 rounded shadow-xl">
//           {displayValue}
//         </div>
//       )}
//     </div>
//   );

//   // return (
//   //   <div
//   //     contentEditable={false} // CRITICAL: Stop Slate from trying to edit this UI element
//   //     onMouseDown={onMouseDown}
//   //     className={clsx(
//   //       "absolute top-0 bottom-0 -right-[13px] w-[26px] z-50 cursor-col-resize",
//   //       "flex justify-center items-center select-none group/handle"
//   //     )}
//   //   >
//   //     {/* The Visual Line */}
//   //     <div className={clsx(
//   //       "w-0.5 h-12 rounded-full transition-all duration-150",
//   //       isDragging
//   //         ? "bg-blue-500 scale-x-[2.5] shadow-[0_0_10px_rgba(59,130,246,0.4)]"
//   //         : "bg-zinc-200 opacity-0 group-hover/handle:opacity-100"
//   //     )} />

//   //     {/* Value Tooltip: Appears only while dragging */}
//   //     {isDragging && (
//   //       <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-zinc-900 text-white text-[10px] px-2 py-1 rounded font-bold whitespace-nowrap shadow-xl">
//   //         {displayValue}
//   //       </div>
//   //     )}
//   //   </div>
//   // );
// };

const ResizeHandle: React.FC<{
  slotId: string
  currentFlex: ColumnSlotElement['flex']
}> = ({ slotId, currentFlex }) => {
  const editor = useSlateStatic()
  const [isDragging, setIsDragging] = useState(false)
  const rafRef = useRef<number | null>(null)

  const getCurrentBreakpoint = (): Breakpoint => {
    const width = window.innerWidth
    if (width < 768) return 'base'
    return 'md'
  }

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()

      const handleEl = e.currentTarget as HTMLElement
      // Walk up to find the Slot and the Grid
      const slotEl = handleEl.closest('[data-is-slot="true"]') as HTMLElement
      const gridEl = slotEl?.parentElement as HTMLElement

      if (!slotEl || !gridEl) return

      setIsDragging(true)

      const startX = e.clientX
      const startWidth = slotEl.offsetWidth
      const gridWidth = gridEl.offsetWidth
      const activeBreakpoint = getCurrentBreakpoint()

      // We store the "current" calculated value in a ref to avoid
      // stale closures in the mouseup handler
      let finalFlexValue = currentFlex[activeBreakpoint] || '1fr'

      const onMouseMove = (moveEvent: MouseEvent) => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current)

        rafRef.current = requestAnimationFrame(() => {
          const deltaX = moveEvent.clientX - startX
          const newWidthPx = startWidth + deltaX

          // Calculate percentage clamped between 10% and 90%
          const newPercentage = Math.max(
            10,
            Math.min(90, (newWidthPx / gridWidth) * 100),
          )
          finalFlexValue = `${newPercentage.toFixed(2)}%`

          /**
           * PERFORMANCE WIN:
           * Instead of telling Slate to re-render, we manually override
           * the CSS Variable on the Grid element for instant visual feedback.
           */
          gridEl.style.setProperty('--grid-md', finalFlexValue)
        })
      }

      const onMouseUp = () => {
        setIsDragging(false)
        if (rafRef.current) cancelAnimationFrame(rafRef.current)

        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
        document.body.style.cursor = ''

        // NOW we save the final result to Slate state once the drag is over
        const entry = findNodeById(editor, slotId)
        if (entry) {
          const [, path] = entry
          Transforms.setNodes(
            editor,
            {
              flex: {
                ...currentFlex,
                [activeBreakpoint]: finalFlexValue,
              },
            },
            { at: path },
          )
        }
      }

      document.body.style.cursor = 'col-resize'
      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
    },
    [editor, slotId, currentFlex],
  )

  const activeBreakpoint = getCurrentBreakpoint()
  const displayValue = currentFlex[activeBreakpoint] || '1fr'

  return (
    <div
      contentEditable={false}
      onMouseDown={onMouseDown}
      className="absolute inset-0 flex justify-center items-center cursor-col-resize group/handle"
    >
      {/* Visual Line */}
      <div
        className={clsx(
          'w-1 h-full transition-all duration-150',
          isDragging
            ? 'bg-blue-500 scale-x-150 shadow-[0_0_10px_rgba(59,130,246,0.4)]'
            : 'bg-zinc-200 opacity-0 group-hover/column:opacity-100',
        )}
      />

      {/* Tooltip */}
      {isDragging && (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-zinc-900 text-white text-[10px] px-2 py-1 rounded font-bold whitespace-nowrap shadow-xl">
          {displayValue}
        </div>
      )}
    </div>
  )
}

export const ColumnSlot = contextualize<ElementProps<'column-slot'>>()(
  [],
  ({ element, attributes, children }) => {
    const mode = useMode()

    // We need to know if this is the last slot in the parent Column
    // You can pass this via context or find the index from the parent element
    const { isLast } = useColumnSlotContext()

    return (
      <div
        {...attributes}
        data-is-slot="true"
        className={clsx(
          'relative group/slot min-w-0 h-full transition-all',
          // This padding matches the -ml-12 expansion.
          // It keeps text perfectly aligned with the editor while
          // providing a "lane" for the nested plus buttons.
          mode === 'write' && 'md:pl-12',

          //"relative group/slot min-w-0 h-full transition-all",
          // isFirst && "md:pl-12",
          // "relative group/slot min-w-0 h-full p-2 rounded-lg transition-all duration-200",
          // // In Write Mode, show the boundaries
          // mode === "write" && [
          //   "bg-zinc-50/50 dark:bg-zinc-900/50", // Subtle background
          //   "border border-dashed border-zinc-200 dark:border-zinc-800", // Dashed border
          //   "hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50", // Hover lift
          //   "hover:border-zinc-300 dark:hover:border-zinc-700"
          // ],
          // // In Read Mode, remove boundaries
          // mode === "read" && "bg-transparent border-transparent"
        )}
      >
        {/* (2) THE GHOST BOX: Only visible on hover */}
        {/* {mode === "write" && (
        <div className="absolute inset-0 pointer-events-none border border-transparent group-hover/column:border-dashed group-hover/column:border-zinc-200 group-hover/column:bg-zinc-50/30 rounded-lg -m-2" />
      )} */}

        <div className="relative">
          {mode === 'write' && (
            <>
              {/* GHOST BOX */}
              <div
                className={clsx(
                  'absolute -inset-x-5 -inset-y-4 pointer-events-none rounded-xl transition-all duration-300 -z-10',
                  'border border-transparent',
                  'group-hover/column:border-dashed group-hover/column:border-zinc-200 group-hover/column:bg-zinc-50/40',
                )}
              />

              {/* THE HANDLER: Positioned exactly in the middle of the gap */}
              {!isLast && (
                <div className="absolute left-full ml-6 top-0 bottom-0 w-5 z-50">
                  <ResizeHandle
                    slotId={element.id}
                    currentFlex={element.flex}
                  />
                </div>
              )}
            </>
          )}

          {children}
        </div>
      </div>
    )
  },
)

export const Column = contextualize<ElementProps<'column'>>()(
  [],
  ({ element, attributes, children }) => {
    const mode = useMode()

    // Create grid template strings for each breakpoint
    const getTemplate = (bp: keyof ColumnSlotElement['flex']) => {
      return element.children.map((c) => c.flex[bp] || '1fr').join(' ')
    }

    return (
      <Block
        element={element}
        {...attributes}
        actionClassName="md:-translate-x-15"
        isResizable={true}
        menuItems={true}
      >
        <div
          className={clsx(
            mode === 'write' && 'md:-ml-12 md:w-[calc(100%+3rem)]',
            'grid w-full group/column',
            // Offset the entire grid to the left to "eat" the gutter space
            // Map breakpoints to CSS variables
            'grid-cols-[var(--grid-base)]',
            'md:grid-cols-[var(--grid-md)]',
            'lg:grid-cols-[var(--grid-lg)]',
          )}
          style={
            {
              '--grid-base': getTemplate('base'),
              '--grid-md': getTemplate('md'),
              '--grid-lg': getTemplate('lg'),
              gap: `${element.gap ?? 24}px`,
            } as React.CSSProperties
          }
        >
          {Children.map(children, (child, idx) => (
            <ColumnSlotContext.Provider
              value={{
                isFirst: idx === 0,
                isLast: idx === element.children.length - 1,
              }}
            >
              {child}
            </ColumnSlotContext.Provider>
          ))}
        </div>
      </Block>
    )
  },
)
