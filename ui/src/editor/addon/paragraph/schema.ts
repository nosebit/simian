import { z } from 'zod'

import { BlockBaseSchema } from '@/ui/editor/block/schema'
import { TextElementSchema } from '@/ui/editor/schema/inline'

export const ParagraphElementSchema = BlockBaseSchema.extend({
  id: z
    .string()
    .describe(
      'A unique id representing this paragraph element inside the editor content',
    ),
  children: z
    .array(TextElementSchema)
    .describe('Inline elements that compose this paragraph content'),
  type: z.literal('paragraph'),
})
