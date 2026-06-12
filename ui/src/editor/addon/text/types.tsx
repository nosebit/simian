import { FC, PropsWithChildren } from 'react'
import { z } from 'zod'

import { AddonBase, LeafAddon } from '../base'

import { TextSchema } from './schema'

export type Text = z.infer<typeof TextSchema>
export type TextMarks = keyof Omit<Text, 'text'>

export interface TextMark<Props = object> extends FC<PropsWithChildren<Props>> {
  onKeyDown?: AddonBase['onKeyDown']
  insertText?: AddonBase['insertText']
}

export const addonMarkIds = ['slash'] as const

export const baseMarkIds = [
  'bold',
  'code',
  'italic',
  'strikethrough',
  'underline',
  'link',
] as const

export const allMarkIds = [...addonMarkIds, ...baseMarkIds] as const

export type AddonMarkId = (typeof addonMarkIds)[number]
export type BaseMarkId = (typeof baseMarkIds)[number]
export type MarkId = (typeof allMarkIds)[number]

export type TextAddonParams = {
  baseMarkIds: BaseMarkId[]
}

export type TextAddon = LeafAddon<'text', TextAddonParams>
