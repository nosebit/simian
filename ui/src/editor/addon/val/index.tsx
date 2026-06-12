import { elementAddon } from '../base'

import { Val } from './element'
import { ValAddon } from './types'

/**
 * The render function.
 */
const render: ValAddon['render'] = ({ element, ...props }) => {
  if (element.type === 'val') {
    return <Val {...props} element={element} />
  }

  return null
}

/**
 * Identify this element as an inline element.
 */
const isInline: ValAddon['isInline'] = (ctx, element) => {
  return element.type === 'val' ? 'yes' : 'no'
}

/**
 * The addon builder.
 */
export function val(): ValAddon {
  return elementAddon({
    id: 'val',
    render,
    isInline,
  })
}

export * from './schema'
export * from './types'
