import { z } from 'zod'

import { CodeBlockElementSchema } from '../addon/code-block/schema'
import { HeadingElementSchema } from '../addon/heading/schema'
import { LatexBlockElementSchema } from '../addon/latex-block/schema'
import { ParagraphElementSchema } from '../addon/paragraph/schema'
import { SubTitleElementSchema } from '../addon/subtitle/schema'
import { TitleElementSchema } from '../addon/title/schema'

export const blockSchemas = [
  CodeBlockElementSchema,
  HeadingElementSchema,
  LatexBlockElementSchema,
  ParagraphElementSchema,
  SubTitleElementSchema,
  TitleElementSchema,
] as const

export const BlockElementSchema = z.discriminatedUnion('type', blockSchemas)
