import { elementAddon } from '../base'

import { RootAddon } from './types'

/**
 * The render function.
 */
const render: RootAddon['render'] = ({ attributes, children, element }) => {
  if (element.type == 'root') {
    return <div {...attributes}>{children}</div>
  }

  return null
}

export function root(): RootAddon {
  return elementAddon({
    id: 'root',
    render,
  })
}

export * from './schema'
export * from './types'
