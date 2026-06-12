import { z } from 'zod'

import { ElementAddon } from '../types'

import { ParagraphContextValue } from './context'
import { ParagraphElementSchema } from './schema'

export type ParagraphElement = z.infer<typeof ParagraphElementSchema>

export type ParagraphAddon = ElementAddon<'paragraph', ParagraphContextValue>
