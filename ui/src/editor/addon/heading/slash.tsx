import { Heading1, Heading2, Heading3 } from 'lucide-react'
import { nanoid } from 'nanoid'

import { blockApply } from '@/ui/editor/utils'

import { SlashAddonCommandFactory } from '../types'

export const h1: SlashAddonCommandFactory<'h1', 'text'> = ({ t, ...ctx }) => ({
  id: 'h1', // TypeScript keeps this as "h1" instead of string
  icon: <Heading1 />,
  group: 'text', // TypeScript keeps this as "text" instead of string
  shortcut: '#',
  title: `${t.title('@editor.@slash.heading')} 1`,
  run: () =>
    blockApply({
      ...ctx,
      focus: 'block',
      block: {
        id: nanoid(),
        level: 1,
        children: [{ text: '' }],
        type: 'heading',
      },
    }),
})

export const h2: SlashAddonCommandFactory<'h2', 'text'> = ({ t, ...ctx }) => ({
  id: 'h2',
  icon: <Heading2 />,
  group: 'text',
  shortcut: '##',
  title: `${t.title('@editor.@slash.heading')} 2`,
  run: () =>
    blockApply({
      ...ctx,
      block: {
        id: nanoid(),
        level: 2,
        children: [{ text: '' }],
        type: 'heading',
      },
    }),
})

export const h3: SlashAddonCommandFactory<'h3', 'text'> = ({ t, ...ctx }) => ({
  id: 'h3',
  icon: <Heading3 />,
  group: 'text',
  shortcut: '###',
  title: `${t.title('@editor.@slash.heading')} 3`,
  run: () =>
    blockApply({
      ...ctx,
      block: {
        id: nanoid(),
        level: 3,
        children: [{ text: '' }],
        type: 'heading',
      },
    }),
})

export const slashCommands = [h1, h2, h3]
export type HeadingSlashCommandIds = ReturnType<
  (typeof slashCommands)[number]
>['id']
