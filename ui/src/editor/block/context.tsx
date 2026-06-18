import { createContext, useContext } from 'react'

import { BlockElement } from './types'

interface BlockContextValue {
  blockId: string
  element: BlockElement
  isResizable: boolean
  width?: string
  float?: string
}

export const BlockContext = createContext<BlockContextValue>({
  blockId: 'main',
  isResizable: false,
  element: {} as never,
})

export function useBlock() {
  return useContext(BlockContext)
}
