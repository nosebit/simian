import { z } from 'zod'

import { BlockBaseSchema } from '@/ui/editor/block/schema'

import { TextSchema } from '../text/schema'

export const languages = ['rust'] as const

export const CodeBlockElementSchema = BlockBaseSchema.extend({
  id: z
    .string()
    .describe(
      'A unique id representing this code-block element inside the editor content.',
    ),
  children: z
    .array(TextSchema)
    .describe('Inline elements that compose this code-block content.'),
  isEvaluating: z.boolean().optional().describe('Whether the code block is currently being evaluated.'),
  language: z
    .enum(languages)
    .describe(
      'The programming language in which the code inside this code-block is written in.',
    ),
  output: z
    .object({
      stdout: z.string(),
      stderr: z.string(),
      success: z.boolean(),
      items: z.array(
        z.object({
          url: z.string(),
          state: z.any().optional(),
        })
      ).optional(),
    })
    .nullable()
    .optional(),
  type: z.literal('code-block'),
})
