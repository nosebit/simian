import { createContext, useContext } from 'react'

import { MarkId } from './types'

export interface TextContextValue {
  markIds: MarkId[]
}

export const TextContext = createContext<TextContextValue>({
  markIds: [],
})

export function useText() {
  return useContext(TextContext)
}
