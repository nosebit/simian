import _ from 'lodash'
import { Columns2 } from 'lucide-react'
import { nanoid } from 'nanoid'

import { blockApply } from '@/ui/editor/utils'

import { SlashAddonCommandFactory } from '../types'

export const column: SlashAddonCommandFactory<'column', 'text'> = ({
  t,
  ...ctx
}) => ({
  id: 'column',
  icon: <Columns2 className="w-8 h-8" />,
  group: 'text',
  title: t.title('@editor.@slash.{n}_columns', { n: 2 }),
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
        children: [
          {
            id: nanoid(),
            children: ctx.editor.hasAddon('paragraph')
              ? [
                  {
                    id: nanoid(),
                    children: [{ text: '' }],
                    type: 'paragraph',
                  },
                ]
              : [],
            flex: {
              base: '1fr',
              sm: '1fr',
              md: '1fr',
              lg: '1fr',
              xl: '1fr',
            },
            type: 'column-slot',
          },
          {
            id: nanoid(),
            children: ctx.editor.hasAddon('paragraph')
              ? [
                  {
                    id: nanoid(),
                    children: [{ text: '' }],
                    type: 'paragraph',
                  },
                ]
              : [],
            flex: {
              base: '1fr',
              sm: '1fr',
              md: '1fr',
              lg: '1fr',
              xl: '1fr',
            },
            type: 'column-slot',
          },
        ],
        gap: 24,
        type: 'column',
      },
      patchBlock: (columnBlock, existingChildren) => {
        // Clone the block to avoid mutating the original template
        const newBlock = _.cloneDeep(columnBlock)

        // Target the first slot
        const firstSlot =
          newBlock.type == 'column' ? newBlock.children[0] : null

        // If the existing content is just a paragraph, we place its children
        // into a new paragraph inside the slot, OR just move the whole node.
        if (firstSlot) {
          firstSlot.children = [
            {
              id: nanoid(),
              type: 'paragraph',

              children: existingChildren as any,
            },
          ]
        }

        return newBlock
      },
    }),
})

export const slashCommands = [column]
export type ColumnSlashCommandIds = ReturnType<
  (typeof slashCommands)[number]
>['id']
