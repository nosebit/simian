// @ts-nocheck
import { Code } from 'lucide-react'
import { nanoid } from 'nanoid'

import { blockApply } from '@/ui/editor/utils'

import { SlashAddonCommandFactory } from '../types'

export const codeBlock: SlashAddonCommandFactory<'code-block', 'nerd'> = ({
  t,
  ...ctx
}) => ({
  id: 'code-block',
  icon: <Code />,
  group: 'nerd', // TypeScript keeps this as "text" instead of string
  shortcut: '```',
  title: t.title('@editor.@slash.code'),
  run: () =>
    blockApply({
      ...ctx,
      focus: 'block',
      block: {
        id: nanoid(),
        children: [{ text: '' }],
        language: 'javascript',
        type: 'code-block',
      },
    }),
})

export const slashCommands = [codeBlock]
export type CodeBlockSlashCommandIds = ReturnType<
  (typeof slashCommands)[number]
>['id']
