import { z } from 'zod'

import { BlockBaseSchema } from '@/ui/editor/block/schema'
import { TextElementSchema } from '@/ui/editor/schema/inline'

export const HeadingElementSchema = BlockBaseSchema.extend({
  id: z
    .string()
    .describe(
      'A unique id representing this heading element inside the editor content',
    ),
  children: z
    .array(TextElementSchema)
    .describe('Inline elements that compose this heading content'),
  level: z.number().int(),
  type: z.literal('heading'),
})
