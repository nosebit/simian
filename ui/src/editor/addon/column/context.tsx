import { createContext, useContext } from 'react'

export const ColumnSlotContext = createContext<{
  isFirst: boolean
  isLast: boolean
} | null>(null)

export const useColumnSlotContext = () => {
  const ctx = useContext(ColumnSlotContext)

  if (!ctx) {
    throw new Error(
      'useColumnSlotContext should be used inside ColumnSlotContext.',
    )
  }

  return ctx
}
