import clsx from 'clsx'
import { FC, Fragment, useState, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'

import { useEditor } from '@/ui/editor/context'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandList,
  CommandShortcut,
} from '@/components/ui/command'

import { useSlash } from './context'
import { getSlashPosition } from './utils'

export const SlashMenu: FC = () => {
  const { cmdIdx, groups, slash, runSlashCmd, setCmdIdx } = useSlash()
  const { editor } = useEditor()
  const [position, setPosition] = useState({ top: 0, left: 0 })

  // Position menu on caret
  useLayoutEffect(() => {
    if (!slash?.range) return
    ;(() => {
      const pos = getSlashPosition(editor, slash.range)

      setPosition(pos)
    })()
  }, [editor, slash])

  useEffect(() => {
    if (!slash) return
    const el = document.getElementById(`slash-cmd-${cmdIdx}`)
    if (el) {
      el.scrollIntoView({ block: 'nearest' })
    }
  }, [cmdIdx, slash])

  if (!slash) {
    return null
  }

  return createPortal(
    <Command
      className="absolute z-50 w-56 border shadow-md h-auto overflow-hidden"
      style={{ top: position.top, left: position.left }}
    >
      {/* <CommandInput placeholder="Filter..." className="h-9" /> */}
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {/* <CommandGroup heading="Blocks"> */}

        {groups.map((group, gidx) => (
          <Fragment key={group.id}>
            {gidx > 0 ? <CommandSeparator /> : null}
            <CommandGroup heading={group.title}>
              {group.commands.map((cmd) => (
                <CommandItem
                  key={cmd.id}
                  id={`slash-cmd-${cmd.idx}`}
                  onSelect={() => runSlashCmd(cmd)}
                  className={clsx([
                    'cursor-pointer flex items-center gap-1 px-2 py-1.5 text-sm rounded-sm outline-none',
                    'data-[selected=true]:bg-transparent data-[selected=true]:text-foreground',
                    cmdIdx === cmd.idx
                      ? '!bg-accent !text-accent-foreground'
                      : 'text-foreground',
                  ])}
                  onMouseEnter={() => {
                    setCmdIdx(cmd.idx)
                  }}
                >
                  {cmd.icon}
                  <span>{cmd.title}</span>

                  {cmd.shortcut ? (
                    <CommandShortcut>{cmd.shortcut}</CommandShortcut>
                  ) : null}
                </CommandItem>
              ))}
            </CommandGroup>
          </Fragment>
        ))}
      </CommandList>
    </Command>,
    document.getElementById(`slash-menu-root-${editor.id}`)!,
  )
}
