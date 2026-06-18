import { createContext, useContext } from 'react'

import {
  Slash,
  SlashCommandGroupWithIndex,
  SlashCommandWithIndex,
} from './types'

export interface SlashContextValue {
  commands: SlashCommandWithIndex[]
  cmdIdx: number
  groups: SlashCommandGroupWithIndex[]
  runSlashCmd: (cmd: SlashCommandWithIndex) => void
  slash: Slash | null
  setCmdIdx: React.Dispatch<React.SetStateAction<number>>
  setSlash: (slash: Slash | null) => void
}

export const SlashContext = createContext<SlashContextValue>({
  commands: [],
  cmdIdx: 0,
  groups: [],
  runSlashCmd: () => {},
  slash: null,
  setCmdIdx: () => {},
  setSlash: () => {},
})

export const useSlash = () => {
  return useContext(SlashContext)
}
