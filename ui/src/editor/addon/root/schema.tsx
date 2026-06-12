import { z } from 'zod'

import { BlockBaseSchema } from '@/ui/editor/block/schema'
import { BlockElementSchema } from '@/ui/editor/schema/block'

export const RootElementSchema = BlockBaseSchema.extend({
  id: z
    .string()
    .describe(
      'A unique id representing the whole editor instance which has this root element as its root node.',
    ),
  children: z
    .array(BlockElementSchema)
    .describe('All the block elements that compose the editor document.'),
  type: z.literal('root'),
}).describe('This is the root node of the editor document tree.')
