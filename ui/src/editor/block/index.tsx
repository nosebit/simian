import { ElementType, FC, JSX, useEffect, useMemo } from 'react'
import clsx from 'clsx'
import { Plus } from 'lucide-react'
import { Node, Path, Text, Transforms } from 'slate'
import { ReactEditor } from 'slate-react'

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

import { contextualize, EditorContextValue } from '../context'
import { useTranslations } from '@/i18n/context'

import { BlockContext } from './context'
import { BlockMenu } from './menu'
import { ActionItem, BlockProps } from './types'
import { useResizer } from './utils'

//////////////////////////////////////////////////
// Utilitary Types
//////////////////////////////////////////////////
type BlockFC = (<T extends ElementType = 'div'>(
  props: BlockProps<T>,
) => JSX.Element) & {
  Menu: typeof BlockMenu
}

//////////////////////////////////////////////////
// Utilitary Components
//////////////////////////////////////////////////
const ActionTrigger: FC<{ item: ActionItem }> = ({ item }) => {
  const btn = (
    <button
      className="flex items-center justify-center p-1 rounded text-zinc-400 hover:bg-zinc-100 hover:text-zinc-800 transition-colors"
      onClick={item.onClick}
    >
      {item.icon}
    </button>
  )

  if (item.tooltip) {
    return (
      <Tooltip delayDuration={1000}>
        <TooltipTrigger asChild>{btn}</TooltipTrigger>
        <TooltipContent
          side={item.tooltip.side ?? 'right'}
          sideOffset={item.tooltip.sideOffset}
        >
          {item.tooltip.content}
        </TooltipContent>
      </Tooltip>
    )
  }

  return btn
}

//////////////////////////////////////////////////
// Utilitary Components
//////////////////////////////////////////////////

//////////////////////////////////////////////////
// Main Component
//////////////////////////////////////////////////
export const Block = contextualize<BlockProps<ElementType>>()(
  ['editor', 'blockClass', 'mode'],
  <T extends ElementType = 'div'>(
    props: BlockProps<T> &
      Pick<EditorContextValue, 'editor' | 'blockClass' | 'mode'>,
  ) => {
    const {
      as: Tag = 'div',
      editor,
      blockClass,
      children,
      mode,
      className,
      style,
      actionItems: customActionItems,
      actionClassName,
      width: forcedWidth,
      isResizable: isResizableProp,
      element,
      menuItems,
      MenuButton,
      ...rest
    } = props

    const t = useTranslations()

    const blockId = props.id ?? 'container'
    const isResizable = forcedWidth ? false : (isResizableProp ?? false)

    // 1. SAFE WIDTH AND FLOAT EXTRACTION (At the top)
    const savedWidth = (element.blocks ?? {})[blockId]?.width ?? undefined
    const float = (element.blocks ?? {})[blockId]?.float ?? undefined

    const isFloatLeft = float === 'left'
    const isFloatRight = float === 'right'
    const isFloating = isFloatLeft || isFloatRight

    // 2. CHECK IF CUSTOM (Percentage/Pixel) vs KEYWORD
    // We use this to decide if useResizer should "own" the initial value
    const isKeyword =
      !savedWidth || ['full', 'wide', 'standard'].includes(savedWidth)

    const { previewWidth, handleResizeStart } = useResizer(
      // If it's a keyword, we pass undefined so the resizer starts from the
      // element's actual current bounding box on the first drag.
      isResizable && !isKeyword ? savedWidth : undefined,
      (finalWidth) => {
        if (isResizable) {
          console.info({ finalWidth }, 'setting via useResizer')
          const path = ReactEditor.findPath(editor, element as Node)

          Transforms.setNodes(
            editor,
            {
              blocks: {
                ...(element.blocks ?? {}),
                [blockId]: { 
                  ...(element.blocks?.[blockId] ?? {}),
                  width: finalWidth 
                },
              },
            } as Partial<Node>,
            { at: path },
          )
        }
      },
    )

    // 3. CURRENT STATE DERIVATION
    const currentWidth =
      forcedWidth ??
      (isResizable && previewWidth !== undefined ? previewWidth : savedWidth)

    const isFull = currentWidth === 'full'
    const isWide = currentWidth === 'wide'
    const isStandard = currentWidth === 'standard' || !currentWidth
    const isCustom = !isFull && !isWide && !isStandard && !!currentWidth

    // 4. DISPLAY CSS WIDTH
    const displayWidth = useMemo(() => {
      if (isFull || isWide || isStandard) return undefined
      return currentWidth
    }, [isFull, isWide, isStandard, currentWidth])

    // const { previewWidth, handleResizeStart } = useResizer(
    //   // Only pass a value to the hook if it's a specific percentage string (e.g., "50%").
    //   // If it's "wide", "full", or "standard", pass undefined so the hook stays "idle".
    //   isResizable && isCustom ? element.width ?? undefined : undefined,
    //   (finalWidth) => {
    //     if (isResizable) {
    //       const path = ReactEditor.findPath(editor, element as Node);
    //       // eslint-disable-next-line @typescript-eslint/no-explicit-any
    //       Transforms.setNodes(editor, { width: finalWidth } as any, { at: path });
    //     }
    //   }
    // );

    const baseActionItems = useMemo(
      () =>
        [
          {
            id: 'add',
            icon: <Plus size={18} />,
            tooltip: {
              content: t.title('@editor.@block.@action.add'),
            },
            onClick: () => {
              const path = ReactEditor.findPath(editor, element)

              // 1. Check if the current element is an empty paragraph
              const isParagraph = element.type === 'paragraph'
              const isEmpty =
                element.children.length === 1 &&
                Text.isText(element.children[0]) &&
                element.children?.[0]?.text === ''

              if (isParagraph && isEmpty) {
                // Just move selection to this empty paragraph
                Transforms.select(editor, path)
              } else {
                // 2. Insert a new empty paragraph below the current path
                const nextPath = Path.next(path)
                Transforms.insertNodes(
                  editor,
                  { type: 'paragraph', children: [{ text: '' }] } as Node,
                  { at: nextPath },
                )
                // Move selection to the start of the new paragraph
                Transforms.select(editor, nextPath)
              }

              // 3. Focus the editor and trigger the Slash Menu
              ReactEditor.focus(editor)

              // To trigger the slash menu, we simulate typing '/'
              // Or, if your slash menu is controlled by a state, toggle that state here.
              editor.insertText('/')
            },
          },
        ] satisfies ActionItem[],
      [editor, element, t],
    )

    const actionItems: ActionItem[] = useMemo(
      () =>
        customActionItems === false
          ? []
          : (customActionItems?.([...baseActionItems]) ?? baseActionItems),
      [customActionItems, baseActionItems],
    )

    // const elementWidth = "width" in element ? element.width : undefined;
    // const currentWidth = (isResizable && previewWidth !== undefined)
    // ? previewWidth
    // : elementWidth;

    // if (element.id === "8gytMmQXfLXcldCZ7pYZU") {
    //   console.log("@@@ CURRENT WIDTH", {
    //     element,
    //     currentWidth,
    //     previewWidth,
    //     elementWidth,
    //   });
    // }

    // const isFull = currentWidth === "full";
    // const isWide = currentWidth === "wide";
    // // IMPORTANT: standard is ONLY true if it's explicitly "standard" OR there is no width at all
    // const isStandard = currentWidth === "standard" || !currentWidth;
    // // Custom is a specific percentage/pixel value
    // const isCustom = !isFull && !isWide && !isStandard && !!currentWidth;

    // const displayWidth = useMemo(() => {
    //   if (isFull || isWide || isStandard) return "100%";
    //   return currentWidth || "100%";
    // }, [isFull, isWide, isStandard, currentWidth]);

    useEffect(() => {
      console.info({ currentWidth, element }, 'currentWidth changed')
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentWidth])

    return (
      <BlockContext.Provider
        value={{
          blockId,
          isResizable,
          element,
          width: currentWidth,
          float,
        }}
      >
        <Tag
          {...rest}
          data-block-id={(element as any).id}
          style={{
            ...style,
            width: displayWidth,
          }}
          // onMouseEnter={(e: React.MouseEvent) => {
          //   e.stopPropagation();
          // }}
          className={clsx(
            'group/block relative mx-auto',
            previewWidth === undefined && 'transition-[width,max-width] duration-200 ease-in-out',

            // WIDTH & CONSTRAINT LOGIC
            // 1. Full: breaks out completely
            isFull && !isFloating && 'relative left-1/2 right-1/2 w-[100vw] max-w-none -translate-x-1/2 !mx-0',

            // 2. Wide: breaks out to a larger predefined limit
            isWide && !isFloating && 'relative left-1/2 right-1/2 w-[100vw] max-w-5xl -translate-x-1/2 !mx-0',

            // 3. Standard: respects the main editor column (blockClass)
            isStandard && !isFloating && blockClass,

            // 4. Custom: breaks out but uses explicit width
            isCustom && !isFloating && 'relative left-1/2 right-1/2 max-w-none -translate-x-1/2 !mx-0',

            // FLOAT LOGIC
            isFloatLeft && 'float-left mr-10 pb-4 !clear-none',
            isFloatRight && 'float-right ml-10 pb-4 !clear-none',

            // Mobile force-full
            isResizable && !isFull && 'max-md:w-full!',

            // Hover Bridge for toolbar/actions
            "before:absolute before:content-[''] before:-left-12 before:top-0 before:w-12 before:h-full before:z-0",

            'min-h-px',
            className,
          )}
        >
          {/* Resize Handles */}
          {isResizable && mode === "write" && !isFull && (
          <div className="hidden md:block" contentEditable={false}>
            <div
              onMouseDown={(e) => handleResizeStart(e, "left")}
              className="absolute left-0 top-0 w-6 h-full cursor-col-resize z-30 flex items-center justify-center opacity-0 group-hover/block:opacity-100 transition-opacity"
            >
              <div className="w-1.5 h-12 rounded-full bg-zinc-950/30 backdrop-blur-md border border-white shadow-sm" />
            </div>
            <div
              onMouseDown={(e) => handleResizeStart(e, "right")}
              className="absolute right-0 top-0 w-6 h-full cursor-col-resize z-30 flex items-center justify-center opacity-0 group-hover/block:opacity-100 transition-opacity"
            >
              <div className="w-1.5 h-12 rounded-full bg-zinc-950/30 backdrop-blur-md border border-white shadow-sm" />
            </div>
          </div>
        )}

          {/* 2. Actions (Plus Button + Custom Actions) */}
          {mode === 'write' && actionItems.length > 0 && (
            <span
              contentEditable={false}
              className={clsx(
                "z-10",
                element.type === 'paragraph'
                  ? "inline-block relative w-0 h-0 align-top"
                  : "absolute left-0 top-0 w-0 h-0"
              )}
            >
              <div
                data-block-actions
                className={clsx(
                  'absolute left-0 translate-x-0',
                  'flex flex-col items-center gap-1',
                  'opacity-0 transition-opacity select-none',

                  'group-hover/block:opacity-100',
                  '[data-is-slot=true]_&_group-hover/slot:opacity-100',
                  !actionClassName && 'md:-translate-x-full pr-2 top-0',
                  actionClassName,
                )}
              >
                {actionItems.map((actionItem) => (
                  <ActionTrigger key={actionItem.id} item={actionItem} />
                ))}
              </div>
            </span>
          )}

          <BlockMenu items={menuItems} MenuButton={MenuButton}>
            {children}
          </BlockMenu>
        </Tag>
      </BlockContext.Provider>
    )
  },
) as BlockFC

Block.Menu = BlockMenu

export * from './menu'
