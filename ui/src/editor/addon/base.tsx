import { ElementAddon, ForbiddenKeys, LeafAddon, VoidAddon } from './types'

//////////////////////////////////////////////////
// Builders
//////////////////////////////////////////////////
export function elementAddon<Ext = object, Id extends string = string>(
  props: Omit<ElementAddon<Id, ForbiddenKeys<Ext, 'type'>>, 'type'>,
) {
  const addon = {
    ...props,
    type: 'element',
  } as ElementAddon<Id, Ext>

  return addon
}

export function leafAddon<Ext = object, Id extends string = string>(
  props: Omit<LeafAddon<Id, ForbiddenKeys<Ext, 'type'>>, 'type'>,
) {
  const addon = {
    ...props,
    type: 'leaf',
  } as LeafAddon<Id, Ext>

  return addon
}

export function voidAddon<Ext = object, Id extends string = string>(
  props: Omit<VoidAddon<Id, ForbiddenKeys<Ext, 'type'>>, 'type'>,
) {
  const addon = {
    ...props,
    type: 'void',
  } as VoidAddon<Id, Ext>

  return addon
}

export * from './types'
