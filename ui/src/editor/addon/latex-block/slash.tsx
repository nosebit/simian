import { SquareSigma } from 'lucide-react'
import { nanoid } from 'nanoid'

import { blockApply } from '@/ui/editor/utils'
import { SlashAddonCommandFactory } from '../types'

export const latexBlock: SlashAddonCommandFactory<'latex-block', 'nerd'> = ({
  t,
  ...ctx
}) => ({
  id: 'latex-block',
  icon: <SquareSigma />,
  group: 'nerd', // TypeScript keeps this as "text" instead of string
  shortcut: '$$$',
  title: `${t.upperFirst('@editor.@slash.latex')} 1`,
  run: () =>
    blockApply({
      ...ctx,
      focus: 'block',
      afterElement: ctx.editor.hasAddon('paragraph')
        ? () => ({
            id: nanoid(),
            type: 'paragraph',
            children: [{ text: '' }],
          })
        : undefined,
      block: {
        id: nanoid(),
        children: [{ text: '' }],
        mode: 'write',
        type: 'latex-block',
      },
    }),
})

export const slashCommands = [latexBlock]
export type LatexBlockSlashCommandIds = ReturnType<
  (typeof slashCommands)[number]
>['id']
