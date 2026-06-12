import { CSSProperties } from 'react'
import { z } from 'zod'

export const TextSchema = z.object({
  text: z.string(),
  style: z.custom<CSSProperties>().optional(),

  // Marks
  bold: z
    .boolean()
    .optional()
    .describe('Set this to true to make the text to be bold.'),
  code: z
    .boolean()
    .optional()
    .describe(
      'Set this to true to make the text to be presented as an inline code element.',
    ),
  italic: z
    .boolean()
    .optional()
    .describe('Set this to true to make the text to be italic.'),
  slash: z.boolean().optional(),
  strikethrough: z
    .boolean()
    .optional()
    .describe('Set this to true to make the text to be strikethrough.'),
  underline: z
    .boolean()
    .optional()
    .describe('Set this to true to make the text to have an underline.'),
  link: z
    .url()
    .optional()
    .describe('Set this to a url to associate it with the text.'),
})
