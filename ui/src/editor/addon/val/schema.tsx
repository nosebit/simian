import { z } from 'zod'

export const ValElementSchema = z.object({
  type: z.literal('val'),
  name: z.string().min(1),
  children: z.array(z.object({ text: z.literal('') })),
})

export type ValElement = z.infer<typeof ValElementSchema>
