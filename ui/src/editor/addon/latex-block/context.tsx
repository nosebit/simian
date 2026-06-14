import { createContext, useContext } from 'react'

export interface LatexBlockContextValue {
  equationMap: Map<string, number>
}

export const LatexBlockContext = createContext<LatexBlockContextValue>({
  equationMap: new Map(),
})

export function useLatexBlock() {
  return useContext(LatexBlockContext)
}

export const useEquationNumber = (id: string) => {
  const { equationMap } = useLatexBlock()
  return equationMap.get(id) ?? null
}
