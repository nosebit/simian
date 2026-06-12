// @ts-nocheck
import React, { createContext, useContext } from 'react'

export interface SubTitleContextValue {
  emptyPlaceholder?: (t: ExtendedTranslator) => React.ReactNode
  isMounted: boolean
  setIsMounted: React.Dispatch<React.SetStateAction<boolean>>
}

export const SubTitleContext = createContext<SubTitleContextValue>({
  isMounted: false,
  setIsMounted: () => {},
})

export function useSubTitle() {
  return useContext(SubTitleContext)
}
