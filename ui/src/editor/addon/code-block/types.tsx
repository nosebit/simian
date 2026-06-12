import { z } from 'zod'

import { ElementAddon } from '../types'

import { CodeBlockElementSchema } from './schema'

export type CodeBlockElement = z.infer<typeof CodeBlockElementSchema>

export type CodeBlockAddon = ElementAddon<'code-block'>
