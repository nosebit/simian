// @ts-nocheck
 
import { FC, JSX, PropsWithChildren } from 'react'
import { Editor, Selection } from 'slate'
import { Editable, RenderElementProps, RenderLeafProps } from 'slate-react'

import { EditorAddon } from './index'

////////////////////////////////////////////////////////////
// Utility Types
////////////////////////////////////////////////////////////
type EditableProps = React.ComponentProps<typeof Editable>

type EditorFunctionKeys = {
  [K in keyof Editor]: Editor[K] extends (...args: any) => any ? K : never
}[keyof Editor]

type EditableFunctionKeys = Exclude<
  {
    [K in keyof EditableProps]: EditableProps[K] extends
      | ((...args: any) => any)
      | undefined
      ? K
      : never
  }[keyof EditableProps],
  undefined
>

export type AddonHandlerContext<
  Addon,
  T extends string,
  TFunc = (...args: any[]) => any,
> = {
  addon: Addon
  editor: Editor
  selection:
    | (Selection & {
        isCollapsed: boolean
      })
    | undefined
} & {
  // This creates a property named after the handler (e.g., insertText: (...))
  [K in T]: TFunc
}

export type EditorExtendedFn<
  T extends EditorFunctionKeys,
  Addon = any, // Add Addon as a generic here
  R = '_',
> = Editor[T] extends (...args: infer P) => infer TReturn
  ? (
      ctx: AddonHandlerContext<Addon, T, (...args: P) => TReturn>,
      ...args: P
    ) => R extends '_' ? TReturn : R
  : never

export type EditorExtendedFnWithBreak<
  T extends EditorFunctionKeys,
  Addon = any, // Add Addon as a generic here
  R = '_',
> = Editor[T] extends (...args: infer P) => infer TReturn
  ? (
      ctx: AddonHandlerContext<Addon, T, (...args: P) => TReturn>,
      ...args: P
    ) => R extends '_'
      ? TReturn extends void
        ? { break?: boolean } | boolean
        : { break?: boolean; result: TReturn }
      : R extends void
        ? { break?: boolean } | boolean
        : { break?: boolean; result: R }
  : never

export type EditableExtendedFn<
  T extends EditableFunctionKeys,
  Addon = any, // Add Addon as a generic here
  R = '_',
> = EditableProps[T] extends ((...args: infer P) => infer TReturn) | undefined
  ? (
      ctx: AddonHandlerContext<Addon, T, (...args: P) => TReturn>,
      ...args: P
    ) => R extends '_' ? TReturn : R
  : never

export type EditableExtendedFnWithYield<
  T extends EditableFunctionKeys,
  Addon = any, // Add Addon as a generic here
  R = '_',
> = EditableProps[T] extends ((...args: infer P) => infer TReturn) | undefined
  ? (
      ctx: AddonHandlerContext<Addon, T, (...args: P) => TReturn>,
      ...args: P
    ) => R extends '_'
      ? TReturn extends void
        ? { break?: boolean } | boolean
        : { break?: boolean; result: TReturn }
      : R extends void
        ? { break?: boolean } | boolean
        : { break?: boolean; result: R }
  : never

export type ForbiddenKeys<T, K extends string> = K extends keyof T
  ? "Error: The 'type' property is reserved and cannot be used in Ext."
  : T

export type AddonOriginalHandler<K extends keyof AddonBase> =
  K extends keyof Editor
    ? Editor[K] extends (...args: infer P) => infer R
      ? (...args: P) => R
      : never
    : never

export type AddonHandlerArgs<K> =
  // Strip 'undefined' so the 'extends' check can see the function signature
  K extends keyof AddonBase
    ? NonNullable<AddonBase[K]> extends (ctx: any, ...args: infer P) => any
      ? P
      : never
    : never

export type AddonHandlerReturn<K> =
  // Strip 'undefined' so the 'extends' check can see the function signature
  K extends keyof AddonBase
    ? NonNullable<AddonBase[K]> extends (ctx: any, ...args: infer P) => infer R
      ? R
      : never
    : never

// export type AddonHandler<
//   Addon,
//   Name extends string,
//   Original = (...args: any[]) => any,
// > = (ctx: AddonHandlerContext<Addon, Name, Original>, ...args: Parameters<Original>) => ReturnType<Original> | undefined;

////////////////////////////////////////////////////////////
// Slash Command
////////////////////////////////////////////////////////////
export type SlashAddonCommandCtx<Addon> = {
  t: ExtendedTranslator
  addon: Addon
  editor: Editor
}

export interface SlashAddonCommand<
  Id extends string = string,
  GroupId extends string = string,
> {
  id: Id
  description?: string
  group: GroupId
  icon?: React.ReactNode
  shortcut?: React.ReactNode
  title: string
  run: () => void
}

export type SlashAddonCommandFactory<
  Id extends string = string,
  GroupId extends string = string,
  Addon = any,
> = (ctx: SlashAddonCommandCtx<Addon>) => SlashAddonCommand<Id, GroupId>

////////////////////////////////////////////////////////////
// Text Menu Item
////////////////////////////////////////////////////////////
export interface TextMenuItem {
  id: string
  icon: React.ReactNode
  isActive?: boolean
  tooltip?: React.ReactNode
  onClick?: (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>,
  ) => Promise<void> | void
}

////////////////////////////////////////////////////////////
// Addon Types
////////////////////////////////////////////////////////////
type AddonFC<Props> = (props: Props) => JSX.Element | null

export type ContextProviderProps<Addon> = PropsWithChildren<{
  addon: Addon
  setAddon: (cb: (prev: Addon) => Addon) => void
}>

export interface AddonBase<Id extends string = string, Addon = any> {
  id: Id

  ContextProvider?: FC<ContextProviderProps<Addon>>
  Companion?: FC<{ addon: Addon }>
  TextMenuItem?: FC<{ MenuButton: FC<TextMenuItem> }>

  decorate?: EditableExtendedFn<'decorate', Addon>
  deleteBackward?: EditorExtendedFnWithBreak<'deleteBackward', Addon>
  deleteForward?: EditorExtendedFnWithBreak<'deleteForward', Addon>
  insertBreak?: EditorExtendedFnWithBreak<'insertBreak', Addon>
  insertData?: EditorExtendedFnWithBreak<'insertData', Addon>
  insertText?: EditorExtendedFnWithBreak<'insertText', Addon>
  isBlock?: EditorExtendedFn<'isBlock', Addon, 'yes' | 'no'>
  isInline?: EditorExtendedFn<'isInline', Addon, 'yes' | 'no'>
  normalize?: EditorExtendedFnWithBreak<'normalize', Addon>
  normalizeNode?: EditorExtendedFnWithBreak<'normalizeNode', Addon>
  onChange?: EditorExtendedFnWithBreak<'onChange', Addon>
  onKeyDown?: EditorExtendedFnWithBreak<'onKeyDown', Addon>

  slashCommands?: SlashAddonCommandFactory<string, string>[]

  dependencies?: Exclude<EditorAddon['id'], Id>[]
}

// Element Addon
export type ElementAddonBase<Id extends string, Addon> = AddonBase<
  Id,
  Addon
> & {
  type: 'element'
  render: AddonFC<RenderElementProps>
}

export type ElementAddon<Id extends string, Ext = object> = ElementAddonBase<
  Id,
  ElementAddonBase<Id, any> & Ext
> &
  Ext

// Leaf Addon
export type LeafAddonBase<Id extends string, Addon> = AddonBase<Id, Addon> & {
  type: 'leaf'
  render: AddonFC<RenderLeafProps>
}

export type LeafAddon<Id extends string, Ext = object> = LeafAddonBase<
  Id,
  LeafAddonBase<Id, any> & Ext
> &
  Ext

// Void Addon
export type VoidAddonBase<Id extends string, Addon> = AddonBase<Id, Addon> & {
  type: 'void'
}

export type VoidAddon<Id extends string, Ext = object> = VoidAddonBase<
  Id,
  VoidAddonBase<Id, any> & Ext
> &
  Ext
