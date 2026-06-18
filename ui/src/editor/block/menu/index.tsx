import { FC, Fragment, useCallback, useMemo, useRef, useState } from 'react'
import clsx from 'clsx'
import { Node, Transforms } from 'slate'
import { ReactEditor, useSlateStatic } from 'slate-react'
import { TbFloatLeft, TbFloatRight } from 'react-icons/tb'

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

import { WidthFull, WidthStandard, WidthWide } from './icons'
import { Button } from '@/components/ui/button'

import { useMode } from '../../context'
import { useBlock } from '../context'

import { BlockMenuButtonProps, BlockMenuItem, BlockMenuProps } from './types'

//////////////////////////////////////////////////
// Utilitary Components
//////////////////////////////////////////////////
const DefaultMenuButton: FC<BlockMenuButtonProps> = ({ item, ...props }) => {
  const button = (
    <Button
      {...props}
      onMouseDown={(e: any) => {
        e.preventDefault()
        e.stopPropagation()
        if (item.onClick) {
          item.onClick(e)
        } else if (props.onClick) {
          props.onClick(e)
        }
      }}
      variant="ghost"
      size="icon"
      className={clsx(
        'h-8 w-8 rounded-full transition-colors duration-200',

        // LIGHT MODE (Dark Menu):
        // We use a light overlay with very low opacity so it looks like
        // a subtle "lift" from the dark background.
        'text-zinc-400 hover:text-white hover:bg-white/10',

        // DARK MODE (Light Menu):
        // Standard subtle dark tint.
        'dark:text-zinc-500 dark:hover:text-zinc-950 dark:hover:bg-zinc-100',

        // ACTIVE STATE:
        // When the button represents the current width, we make it slightly more visible.
        item.isActive &&
          'text-white bg-white/20 dark:text-zinc-950 dark:bg-zinc-200',
      )}
    >
      {props.children}
    </Button>
  )

  if (!item.tooltip) {
    return button
  }

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          {button}
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs px-2 py-1">
          {item.tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

//////////////////////////////////////////////////
// Main Component
//////////////////////////////////////////////////
export const BlockMenu: FC<BlockMenuProps> = ({
  children,
  MenuButton,
  items,
}) => {
  const ctx = useBlock()
  const mode = useMode()
  const editor = useSlateStatic()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const setWidth = useCallback(
    (width: string) => {
      const newBlocks = {
        ...(ctx.element.blocks ?? {}),
        [ctx.blockId]: {
          ...(ctx.element.blocks?.[ctx.blockId] ?? {}),
          width,
          float: undefined,
        },
      }

      console.info(
        {
          element: ctx.element,
          blockId: ctx.blockId,
          width,
          newBlocks,
        },
        'setWidh',
      )

      const path = ReactEditor.findPath(editor, ctx.element)

      Transforms.setNodes(
        editor,
        {
          blocks: newBlocks,
        } as Partial<Node>,
        { at: path },
      )

      if ('width' in ctx.element) {
        Transforms.unsetNodes(editor, 'width', { at: path })
      }
    },
    [editor, ctx.blockId, ctx.element],
  )

  const handleMouseEnter = useCallback(() => {
    console.info('handling mouse enter')
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setIsMenuOpen(true)
  }, [])

  const setFloat = useCallback(
    (float: string | null) => {
      const newBlocks = {
        ...(ctx.element.blocks ?? {}),
        [ctx.blockId]: {
          ...(ctx.element.blocks?.[ctx.blockId] ?? {}),
          float: float === null ? undefined : float,
          ...(float && !ctx.float ? { width: '50%' } : {}),
        },
      }

      const path = ReactEditor.findPath(editor, ctx.element)
      Transforms.setNodes(
        editor,
        { blocks: newBlocks } as Partial<Node>,
        { at: path },
      )
    },
    [editor, ctx.blockId, ctx.element, ctx.float],
  )

  const handleMouseLeave = useCallback(() => {
    console.info('handling mouse leave')
    // Small delay (200ms) prevents the menu from flickering if the
    // mouse just grazes the edge of the buffer
    timeoutRef.current = setTimeout(() => {
      setIsMenuOpen(false)
    }, 0)
  }, [])

  const baseItems = useMemo<BlockMenuItem[][]>(
    () => [
      ...(ctx.isResizable
        ? [
            [
              {
                id: 'width-standard',
                icon: <WidthStandard className="h-4 w-4" />,
                isActive: !ctx.width || ctx.width === 'standard',
                onClick: () => setWidth('standard'),
                tooltip: 'Standard Width',
              },
              ...(!ctx.float
                ? [
                    {
                      id: 'width-wide',
                      icon: <WidthWide className="h-4 w-4" />,
                      isActive: ctx.width === 'wide',
                      onClick: () => setWidth('wide'),
                      tooltip: 'Wide Width',
                    },
                    {
                      id: 'width-full',
                      icon: <WidthFull className="h-4 w-4" />,
                      isActive: ctx.width === 'full',
                      onClick: () => setWidth('full'),
                      tooltip: 'Full Width',
                    },
                  ]
                : []),
            ] satisfies BlockMenuItem[],
          ]
        : []),
      ...(ctx.isResizable
        ? [
            [
              {
                id: 'float-left',
                icon: <TbFloatLeft className="h-4 w-4" />,
                isActive: ctx.float === 'left',
                onClick: () => setFloat('left'),
                tooltip: 'Float Left',
              },
              {
                id: 'float-right',
                icon: <TbFloatRight className="h-4 w-4" />,
                isActive: ctx.float === 'right',
                onClick: () => setFloat('right'),
                tooltip: 'Float Right',
              },
            ] satisfies BlockMenuItem[],
          ]
        : []),
    ],
    [ctx, setWidth, setFloat],
  )

  const resolvedItems = useMemo(() => {
    if (!items) {
      return null
    }
    if (items === true) {
      return baseItems
    }
    if (typeof items === 'function') {
      return items(baseItems)
    }
    if (items.length === 0) {
      return baseItems
    }

    const groups: BlockMenuItem[][] = []
    let currGroup: BlockMenuItem[] = []

    for (const item of items) {
      if (Array.isArray(item)) {
        if (item.length) {
          if (currGroup.length > 0) {
            groups.push(currGroup)
            currGroup = []
          }

          groups.push(item)
        }
      } else {
        currGroup.push(item)
      }
    }

    if (currGroup.length) {
      groups.push(currGroup) // Push the last group if needed.
    }

    return groups
  }, [baseItems, items])

  // Skip rendering the menu.
  if (!resolvedItems || resolvedItems.length === 0) {
    return <>{children}</>
  }

  return (
    <div className="relative" onMouseLeave={handleMouseLeave}>
      {/* Floating Menu */}
      {mode !== 'read' && (
        <div
          className={clsx(
            // "bg-yellow-400",
            'absolute -top-12 left-0 w-full h-12 z-10',
            'flex items-start justify-center', // Centering logic
            isMenuOpen ? 'pointer-events-auto' : 'pointer-events-none',
          )}
          contentEditable={false}
          onMouseEnter={handleMouseEnter}
        >
          {/* THE ACTUAL MENU */}
          <div
            className={clsx(
              'flex items-center gap-1 p-1 rounded-full border shadow-xl',
              'transition-all duration-200 ease-out',

              // Inverted Colors
              'bg-zinc-950/90 text-white border-zinc-800 backdrop-blur-md',
              'dark:bg-white/95 dark:text-zinc-950 dark:border-white',

              // Visibility
              isMenuOpen
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-2',
            )}
            onMouseLeave={handleMouseLeave}
          >
            {resolvedItems.map((items, idx) => (
              <Fragment key={`group-${items[0].id}`}>
                {idx > 0 ? (
                  <div
                    className={clsx([
                      'w-px h-4 bg-zinc-200 dark:bg-zinc-800 mx-1',
                    ])}
                  />
                ) : null}

                {items.map((item) =>
                  MenuButton ? (
                    <MenuButton
                      key={item.id}
                      item={item}
                      DefaultMenuButton={DefaultMenuButton}
                    />
                  ) : (
                    <DefaultMenuButton key={item.id} item={item}>
                      {item.icon}
                    </DefaultMenuButton>
                  ),
                )}
              </Fragment>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div
        onMouseEnter={handleMouseEnter}
      >
        {children}
      </div>
    </div>
  )
}

export * from './types'
