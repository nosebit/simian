import { FC, useState } from 'react'

import { Spinner } from '@/components/ui/spinner'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface MenuButtonProps {
  icon: React.ReactNode
  isActive?: boolean
  tooltip?: React.ReactNode
  onClick?: (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>,
  ) => Promise<void> | void
}

export const MenuButton: FC<MenuButtonProps> = (props) => {
  const { icon, isActive, onClick } = props
  const [isLoading, setIsLoading] = useState(false)

  const btn = (
    <button
      disabled={isLoading}
      onClick={async (evt) => {
        if (onClick) {
          setIsLoading(true)
          try {
            await Promise.resolve(onClick(evt))
          } catch {
            // ignore
          }

          setIsLoading(false)
        }
      }}
      className={`p-2 rounded hover:bg-gray-800 transition-colors ${
        isActive ? 'text-blue-400' : 'text-white'
      }`}
    >
      {isLoading ? <Spinner /> : icon}
    </button>
  )

  if (props.tooltip) {
    return (
      <Tooltip delayDuration={1000}>
        <TooltipTrigger asChild>{btn}</TooltipTrigger>
        <TooltipContent side="top" sideOffset={5}>
          {props.tooltip}
        </TooltipContent>
      </Tooltip>
    )
  }

  return btn
}
