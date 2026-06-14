import { z } from 'zod'

import { LatexInlineElementSchema } from '../addon/latex-inline/schema'
import { TextSchema } from '../addon/text/schema'
import { ValElementSchema } from '../addon/val/schema'

export const inlineSchemas = [LatexInlineElementSchema, ValElementSchema] as const

export const InlineElementSchema = z.discriminatedUnion('type', inlineSchemas)
export const TextElementSchema = z.union([InlineElementSchema, TextSchema])
