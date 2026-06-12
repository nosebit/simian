import { createContext, useContext } from 'react'

export interface TitleContextValue {
  emptyPlaceholder?: string | ((t: ExtendedTranslator) => React.ReactNode)
}

export const TitleContext = createContext<TitleContextValue>({})

export function useTitle() {
  return useContext(TitleContext)
}
