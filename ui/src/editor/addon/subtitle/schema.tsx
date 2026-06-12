import { z } from 'zod'

import { BlockBaseSchema } from '@/ui/editor/block/schema'

import { TextSchema } from '../text/schema'

export const SubTitleElementSchema = BlockBaseSchema.extend({
  id: z
    .string()
    .describe(
      'A unique id representing this subtitle element inside the editor content',
    ),
  children: z
    .array(TextSchema)
    .length(1)
    .describe(
      'The unique children of this element should hold the subtitle content.',
    ),
  type: z.literal('subtitle'),
}).describe(
  'This represents the subtitle of the whole slate document that shows up under the title element.',
)
