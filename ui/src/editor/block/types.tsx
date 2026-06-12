import { ComponentPropsWithoutRef, ElementType } from 'react'
import { Element } from 'slate'

import { TooltipContent } from '@/components/ui/tooltip'

import { BlockMenuProps } from './menu/types'

export type ResizableElement = Element & { width?: string | null }
export type BlockElement = Element & {
  blocks?: Record<
    string,
    {
      width?: string | null
    }
  >
}

export interface ActionItem {
  id?: string
  icon: React.ReactNode
  tooltip?: {
    content: React.ReactNode
    side?: React.ComponentProps<typeof TooltipContent>['side']
    sideOffset?: number
  }
  onClick: (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void
}

export type BlockProps<T extends ElementType = 'div'> = {
  id?: string
  as?: T
  children: React.ReactNode
  actionItems?: false | ((items: ActionItem[]) => ActionItem[])
  actionClassName?: string
  menuItems?: BlockMenuProps['items']
  MenuButton?: BlockMenuProps['MenuButton']
  width?: string

  element: BlockElement
  isResizable?: boolean
} & Omit<
  ComponentPropsWithoutRef<T>,
  'id' | 'isResizable' | 'element' | 'editor'
>
