import { z } from 'zod'

import {
  ColumnElementSchema,
  ColumnSlotElementSchema,
} from '../addon/column/schema'
import { RootElementSchema } from '../addon/root/schema'
import { TextSchema } from '../addon/text/schema'

import { blockSchemas } from './block'
import { inlineSchemas } from './inline'

//////////////////////////////////////////////////
// Block Selection
//////////////////////////////////////////////////
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

//////////////////////////////////////////////////
// Finalize Schama Definitions
//
// We must do this here since RootElementSchema
// depends on the BlockElementSchema.
//////////////////////////////////////////////////
export const higherBlockSchemas = [
  ColumnElementSchema,
  ColumnSlotElementSchema,
  RootElementSchema,
] as const

export const elementSchemas = [
  ...higherBlockSchemas,
  ...blockSchemas,
  ...inlineSchemas,
] as const

export const HigherBlockElementSchema = z.discriminatedUnion('type', [
  ...higherBlockSchemas,
])

export const ElementSchema = z.discriminatedUnion('type', [...elementSchemas])

export const DescendantSchema = z.union([ElementSchema, TextSchema])

export const EditorValueSchema = z.array(DescendantSchema)

export * from './block'
export * from './inline'
export * from './selection'
