import { z } from 'zod'

import { ElementAddon } from '../types'

import { TitleContextValue } from './context'
import { TitleElementSchema } from './schema'

export type TitleElement = z.infer<typeof TitleElementSchema>

export type TitleAddon = ElementAddon<'title', TitleContextValue>
