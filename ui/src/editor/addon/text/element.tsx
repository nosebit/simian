import { FC } from 'react'

import { LeafProps } from '@/ui/editor/types'

import { useText } from './context'
import {
  BoldMark,
  CodeMark,
  ItalicMark,
  LinkMark,
  SlashMark,
  StrikethroughMark,
  UnderlineMark,
} from './marks'

export const Text: FC<LeafProps> = ({ attributes, children, leaf }) => {
  useText()

  if (leaf.bold) {
    children = <BoldMark>{children}</BoldMark>
  }

  if (leaf.code) {
    children = <CodeMark>{children}</CodeMark>
  }

  if (leaf.italic) {
    children = <ItalicMark>{children}</ItalicMark>
  }

  if (leaf.slash) {
    children = <SlashMark>{children}</SlashMark>
  }

  if (leaf.strikethrough) {
    children = <StrikethroughMark>{children}</StrikethroughMark>
  }

  if (leaf.underline) {
    children = <UnderlineMark>{children}</UnderlineMark>
  }

  if (leaf.link) {
    children = <LinkMark href={leaf.link}>{children}</LinkMark>
  }

  return (
    <span {...attributes} style={leaf.style}>
      {children}
    </span>
  )
}
