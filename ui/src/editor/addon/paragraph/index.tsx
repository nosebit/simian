import { nanoid } from 'nanoid'
import { Path, Transforms } from 'slate'

import { getBlockContainer } from '@/ui/editor/utils'

import { elementAddon } from '../base'

import { ParagraphContext, ParagraphContextValue } from './context'
import { Paragraph } from './element'
import { slashCommands } from './slash'
import { ParagraphAddon } from './types'

/**
 * The render function.
 */
const render: ParagraphAddon['render'] = ({ element, ...props }) => {
  if (element.type == 'paragraph') {
    return <Paragraph {...props} element={element} />
  }

  return null
}

/**
 * The context provider component.
 */
const ContextProvider: ParagraphAddon['ContextProvider'] = ({
  addon,
  children,
}) => (
  <ParagraphContext.Provider
    value={{
      emptyPlaceholder: addon.emptyPlaceholder,
    }}
  >
    {children}
  </ParagraphContext.Provider>
)

const normalizeNode: ParagraphAddon['normalizeNode'] = ({ editor }, entry) => {
  const [, path] = entry

  const container = getBlockContainer(editor)

  // Only run when normalizing the container (root) itself
  if (!Path.equals(path, container.path)) return false

  const { children } = container.node

  /**
   * ENFORCEMENT: Ensure the document is never truly empty.
   * We don't care WHAT the first child is (Title, Image, Paragraph, etc.),
   * as long as SOMETHING exists.
   */
  if (children.length === 0) {
    Transforms.insertNodes(
      editor,
      { id: nanoid(), type: 'paragraph', children: [{ text: '' }] },
      { at: [...container.path, 0] },
    )
    return true
  }

  return false
}

/**
 * The addon builder.
 *
 * @param params - Initial set of params.
 */
export function paragraph(params?: ParagraphContextValue): ParagraphAddon {
  return elementAddon({
    ...params,
    id: 'paragraph',
    render,
    normalizeNode,
    slashCommands,

    ContextProvider,
  })
}

export * from './schema'
export * from './types'
