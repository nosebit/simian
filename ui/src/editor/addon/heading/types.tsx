import { z } from 'zod'

import { ElementAddon } from '../types'

import { HeadingContextValue } from './context'
import { HeadingElementSchema } from './schema'

export type HeadingElement = z.infer<typeof HeadingElementSchema>

export type HeadingAddon = ElementAddon<'heading', HeadingContextValue>
