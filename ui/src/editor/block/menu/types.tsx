import { FC, JSX, PropsWithChildren } from 'react'

import { ButtonProps } from '@/components/ui/button'

//////////////////////////////////////////////////
// Types
//////////////////////////////////////////////////
export interface BlockMenuItem {
  id: string
  isActive?: boolean
  icon: JSX.Element
  tooltip?: ButtonProps['tooltip']
  onClick?: (evt: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void
}

export type BlockMenuButtonProps = Omit<ButtonProps, 'size' | 'variant'> & {
  item: BlockMenuItem
}

export type DefaultMenuButtonFC = FC<BlockMenuButtonProps>

export type BlockMenuProps = PropsWithChildren<{
  items?:
    | boolean
    | null
    | BlockMenuItem[]
    | BlockMenuItem[][]
    | ((baseItems: BlockMenuItem[][]) => BlockMenuItem[][])
  MenuButton?: FC<
    Omit<BlockMenuButtonProps, 'children'> & {
      DefaultMenuButton: DefaultMenuButtonFC
    }
  >
}>
