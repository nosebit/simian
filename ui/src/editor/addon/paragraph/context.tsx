import { createContext, useContext } from 'react'

export interface ParagraphContextValue {
  emptyPlaceholder?: React.ReactNode
}

export const ParagraphContext = createContext<ParagraphContextValue>({})

export function useParagraph() {
  return useContext(ParagraphContext)
}
