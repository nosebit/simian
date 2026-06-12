import { FC, useEffect, useMemo, useRef } from 'react'
import clsx from 'clsx'
import {
  Bold,
  Code,
  Italic,
  Link,
  Strikethrough,
  Underline,
} from 'lucide-react'
import { Editor } from 'slate'

import { useEditor } from '@/ui/editor/context'

import { useText } from '../../context'
import { toggleMark } from '../utils'

import { BarButton } from './button'

export interface Position {
  top: number
  left: number
}

interface Props {
  position?: Position
  onMount?: (el: HTMLDivElement) => void
}

export const TextMenuBar: FC<Props> = ({ position, onMount }) => {
  const ref = useRef<HTMLDivElement | null>(null)
  const { editor } = useEditor()
  const { markIds } = useText()

  const isWriteMode = editor.mode === 'write'
  const marks = Editor.marks(editor)

  const markIdsSet = useMemo(() => new Set(markIds), [markIds])
  const addonsWithTextMenuItem = useMemo(
    () => editor.addons.filter((addon) => !!addon.TextMenuItem),
    [editor],
  )

  useEffect(() => {
    if (ref.current) {
      onMount?.(ref.current)
    }
  }, [onMount])

  if (!isWriteMode && addonsWithTextMenuItem.length === 0) {
    return null
  }

  return (
    <div
      ref={ref}
      className={clsx([
        'absolute z-50 flex p-1 text-white rounded-lg shadow-xl transition-opacity duration-200',
        'bg-black dark:bg-zinc-800',
      ])}
      style={position ? { top: position.top, left: position.left } : {}}
      onMouseDown={(e) => e.preventDefault()} // Prevents losing focus from editor
    >
      {isWriteMode && markIdsSet.has('bold') ? (
        <BarButton
          id="bold"
          icon={<Bold size={18} />}
          isActive={marks?.bold}
          onClick={() => toggleMark(editor, 'bold')}
        />
      ) : null}

      {isWriteMode && markIdsSet.has('italic') ? (
        <BarButton
          id="italic"
          icon={<Italic size={18} />}
          isActive={marks?.italic}
          onClick={() => toggleMark(editor, 'italic')}
        />
      ) : null}

      {isWriteMode && markIdsSet.has('underline') ? (
        <BarButton
          id="underline"
          icon={<Underline size={18} />}
          isActive={marks?.underline}
          onClick={() => toggleMark(editor, 'underline')}
        />
      ) : null}

      {isWriteMode && markIdsSet.has('underline') ? (
        <BarButton
          id="strikethrough"
          icon={<Strikethrough size={18} />}
          isActive={marks?.strikethrough}
          onClick={() => toggleMark(editor, 'strikethrough')}
        />
      ) : null}

      {isWriteMode && markIdsSet.has('code') ? (
        <BarButton
          id="code"
          icon={<Code size={18} />}
          isActive={marks?.code}
          onClick={() => toggleMark(editor, 'code')}
        />
      ) : null}

      {isWriteMode && markIdsSet.has('link') ? (
        <BarButton
          id="link"
          icon={<Link size={18} />}
          isActive={Boolean(marks?.link)}
          onClick={() => {
            if (marks?.link) {
              Editor.removeMark(editor, 'link')
            } else {
              const url = window.prompt('Enter URL:') // Or a custom input field
              if (url) Editor.addMark(editor, 'link', url)
            }
          }}
        />
      ) : null}

      {/* Iterate over addons to render their buttons. */}
      {addonsWithTextMenuItem.map(({ id, TextMenuItem }) =>
        TextMenuItem ? <TextMenuItem key={id} MenuButton={BarButton} /> : null,
      )}
    </div>
  )
}
