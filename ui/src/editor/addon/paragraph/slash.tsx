import { Image } from 'lucide-react'
import { nanoid } from 'nanoid'

import { blockApply } from '@/ui/editor/utils'

import { SlashAddonCommandFactory } from '../types'

export const paragraph: SlashAddonCommandFactory<'paragraph', 'text'> = ({
  t,
  ...ctx
}) => ({
  id: 'paragraph',
  icon: <Image />,
  group: 'text', // TypeScript keeps this as "text" instead of string
  shortcut: '![]()',
  title: t.title('@editor.@slash.paragraph'),

  run: () =>
    blockApply({
      ...ctx,
      focus: 'block',
      block: {
        id: nanoid(),
        children: [{ text: '' }],
        type: 'paragraph',
      },
    }),
})

export const slashCommands = [paragraph]
export type ParagraphSlashCommandIds = ReturnType<
  (typeof slashCommands)[number]
>['id']
