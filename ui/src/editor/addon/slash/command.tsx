import _ from 'lodash'
import { useMemo } from 'react'

// Import slash commands from all addons.
import { CodeBlockSlashCommandIds } from '@/ui/editor/addon/code-block/slash'
import { ColumnSlashCommandIds } from '@/ui/editor/addon/column/slash'
import { HeadingSlashCommandIds } from '@/ui/editor/addon/heading/slash'
import { ImageBlockSlashCommandIds } from '@/ui/editor/addon/image-block/slash'
import { LatexBlockSlashCommandIds } from '@/ui/editor/addon/latex-block/slash'
import { ParagraphSlashCommandIds } from '@/ui/editor/addon/paragraph/slash'

import { useAddons } from '@/ui/editor/context'
import { useTranslations } from '@/i18n/context'
import { SlashCommandGroup } from './types'
import { useSlateStatic } from 'slate-react'

export type CommandId =
  | CodeBlockSlashCommandIds
  | ColumnSlashCommandIds
  | HeadingSlashCommandIds
  | ImageBlockSlashCommandIds
  | LatexBlockSlashCommandIds
  | ParagraphSlashCommandIds

/**
 * Hook to use specific command groups.
 */
export const useCommandGroups = (cmdIds?: Set<CommandId>) => {
  const editor = useSlateStatic()
  const addons = useAddons()
  const t = useTranslations()

  const ctx = useMemo(
    () => ({
      editor,
      t,
    }),
    [editor, t],
  )

  const groups = useMemo(
    () =>
      _.orderBy(
        Object.values(
          addons.reduce(
            (groupsMap, addon) => {
              if (!addon.slashCommands) {
                return groupsMap
              }

              for (const commandFactory of addon.slashCommands) {
                const command = commandFactory({ ...ctx, addon })

                // Optional: Filter by cmdIds if provided
                if (cmdIds && !cmdIds.has(command.id as CommandId)) continue

                const group = groupsMap[command.group] ?? {
                  id: command.group,
                  title: t.title(`${command.group}`),
                  commands: [],
                }

                group.commands.push({ ...command, addon })

                groupsMap = { ...groupsMap, [command.group]: group }
              }

              return groupsMap
            },
            {} as { [groupdId: string]: SlashCommandGroup },
          ),
        ),
        'title',
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [addons, cmdIds],
  )

  return groups
}
