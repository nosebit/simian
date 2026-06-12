import { z } from 'zod'

import { BlockBaseSchema } from '@/ui/editor/block/schema'
import { BlockElementSchema } from '@/ui/editor/schema/block'

export const ColumnSlotElementSchema = BlockBaseSchema.extend({
  type: z.literal('column-slot'),
  id: z.string(),
  flex: z.record(z.enum(['base', 'sm', 'md', 'lg', 'xl']), z.string()),
  children: z.array(BlockElementSchema),
})

export const ColumnElementSchema = BlockBaseSchema.extend({
  id: z
    .string()
    .describe(
      'A unique id representing this column element inside the editor content',
    ),
  children: z
    .array(ColumnSlotElementSchema)
    .min(2)
    .max(3)
    .describe('Specific columns that compose this element.'),
  gap: z.number().optional().describe('The spacing between column items'),
  type: z.literal('column'),
})
