import { z } from 'zod'

import { ElementAddon } from '../types'

import { ColumnElementSchema, ColumnSlotElementSchema } from './schema'

export type ColumnSlotElement = z.infer<typeof ColumnSlotElementSchema>

export type ColumnElement = z.infer<typeof ColumnElementSchema>

export type ColumnAddon = ElementAddon<'column'>
