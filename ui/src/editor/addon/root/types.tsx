import { z } from 'zod'

import { ElementAddon } from '../types'

import { RootElementSchema } from './schema'

export type RootElement = z.infer<typeof RootElementSchema>

export type RootAddon = ElementAddon<'root'>
