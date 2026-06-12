import { elementAddon } from '../base'

import { Column, ColumnSlot } from './element'
import { slashCommands } from './slash'
import { ColumnAddon } from './types'

/**
 * The render function.
 */
const render: ColumnAddon['render'] = ({ element, ...props }) => {
  if (element.type == 'column') {
    return <Column {...props} element={element} />
  } else if (element.type === 'column-slot') {
    return <ColumnSlot {...props} element={element} />
  }

  return null
}

const isBlock: ColumnAddon['isBlock'] = (ctx, element) => {
  if (element.type === 'column' || element.type === 'column-slot') {
    return 'yes'
  }

  return 'no'
}

export function column(): ColumnAddon {
  return elementAddon({
    id: 'column',
    render,
    isBlock,
    slashCommands,
  })
}

export * from './schema'
export * from './types'
