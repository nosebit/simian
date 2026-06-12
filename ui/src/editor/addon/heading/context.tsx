import { createContext, useContext } from 'react'

export interface HeadingContextValue {
  emptyPlaceholder?:
    | ((level: number, t: ExtendedTranslator) => React.ReactNode)
    | null
}

export const HeadingContext = createContext<HeadingContextValue>({})

export function useHeading() {
  return useContext(HeadingContext)
}
