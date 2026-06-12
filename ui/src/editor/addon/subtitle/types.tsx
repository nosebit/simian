import { z } from 'zod'

import { ElementAddon } from '../types'

import { SubTitleContextValue } from './context'
import { SubTitleElementSchema } from './schema'

export type SubTitleElement = z.infer<typeof SubTitleElementSchema>

export type SubTitleAddonParams = Pick<SubTitleContextValue, 'emptyPlaceholder'>

export type SubTitleAddon = ElementAddon<'subtitle', SubTitleAddonParams>
