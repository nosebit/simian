import { z } from 'zod'

// This is used in note system.
export const BlockPointSchema = z.object({
  blockId: z.string().length(21).describe('The NanoID of the block'),
  offset: z
    .number()
    .int()
    .min(0)
    .describe('The character index within that block'),
})

export const BlockSelectionSchema = z.object({
  anchor: BlockPointSchema,
  focus: BlockPointSchema,
})
