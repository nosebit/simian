import { z } from 'zod'

import { BlockBaseSchema } from '@/ui/editor/block/schema'

import { TextSchema } from '../text/schema'

export const TitleElementSchema = BlockBaseSchema.extend({
  id: z
    .string()
    .describe(
      'A unique id representing this title element inside the editor content',
    ),
  children: z
    .array(TextSchema)
    .length(1)
    .describe(
      'The unique children of this element should hold the title content.',
    ),
  type: z.literal('title'),
}).describe('This represents the title of the whole slate document.')
