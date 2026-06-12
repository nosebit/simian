import { z } from 'zod'

export const BlockBaseSchema = z.object({
  blocks: z
    .record(
      z.string(),
      z.object({
        width: z
          .string()
          .optional()
          .nullable()
          .describe(
            'This defines how much space this specific block should take on the full width of the editor.' +
              'It can be set as standard, wide and full for predefined values but it also can be any valid css size value (like 50% or 100vw). ' +
              "It's preferable to use the the predefined values. " +
              'The standard predefined value means the block is going to be fully contained by the editor width.' +
              'The wide predefined value means the block is going to overflow a little bit more out from the editor own width. ' +
              'The full predefined value means the block is going to take the whole available window width.',
          ),
      }),
    )
    .optional()
    .describe('Config of each block presented in this element.'),
})
