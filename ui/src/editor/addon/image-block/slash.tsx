import { Image } from 'lucide-react'
import { nanoid } from 'nanoid'

import { blockApply } from '@/ui/editor/utils'
import { SlashAddonCommandFactory } from '../types'

export const imageBlock: SlashAddonCommandFactory<'image-block', 'media'> = ({
  t,
  ...ctx
}) => ({
  id: 'image-block',
  icon: <Image />,
  group: 'media', // TypeScript keeps this as "text" instead of string
  shortcut: '![]()',
  title: t.upperFirst('@editor.@slash.image'),

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
        items: [],
        children: [{ text: '' }],
        type: 'image-block',
      },
    }),
})

export const slashCommands = [imageBlock]
export type ImageBlockSlashCommandIds = ReturnType<
  (typeof slashCommands)[number]
>['id']
