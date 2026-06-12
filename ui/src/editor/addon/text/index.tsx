'use client'

import { useLayoutEffect, useMemo } from 'react'
import _ from 'lodash'

import { useEditor } from '../../context'
import {
  AddonHandlerArgs,
  AddonHandlerContext,
  AddonHandlerReturn,
  leafAddon,
} from '../base'

import { TextContext } from './context'
import { Text } from './element'
import * as marks from './marks'
import { TextMenu } from './menu'
import { BaseMarkId, baseMarkIds, TextAddon, TextMark } from './types'

/**
 * Auxiliary function to run a handler for all available marks.
 */
export const runMarkHandler = <K extends keyof TextMark>(
  ctx: AddonHandlerContext<TextAddon, K>,
  handlerName: K,
  ...args: AddonHandlerArgs<K>
): {
  break?: boolean
  result?: AddonHandlerReturn<K> | undefined
} => {
  const { baseMarkIds } = ctx.addon

  for (const markId of baseMarkIds) {
    const mark = marks[`${_.upperFirst(markId)}Mark`] as
      | TextMark<object>
      | undefined

    if (!mark) {
      continue
    }

    if (typeof mark[handlerName] == 'function') {
      const rawResponse = mark[handlerName](ctx, ...args)
      const response =
        typeof rawResponse === 'boolean'
          ? { break: rawResponse }
          : (rawResponse as { break?: boolean })

      if (response.break) {
        return response
      }
    }
  }

  return { break: false }
}

/**
 * The render function.
 */
const render: TextAddon['render'] = (props) => {
  return <Text {...props} />
}

/**
 * The context provider component.
 */
const ContextProvider: TextAddon['ContextProvider'] = ({ addon, children }) => {
  const { editor } = useEditor()
  const markIds = useMemo(() => [...addon.baseMarkIds], [addon])

  // Handle Global Portal Host creation
  useLayoutEffect(() => {
    const hostId = `text-menu-root-${editor.id}`
    let hostElement = document.getElementById(hostId)

    if (!hostElement) {
      hostElement = document.createElement('div')
      hostElement.id = hostId
      document.body.appendChild(hostElement)
    }

    return () => {
      // Cleanup: Remove the div when the editor/provider unmounts
      if (hostElement && document.body.contains(hostElement)) {
        document.body.removeChild(hostElement)
      }
    }
  }, [editor.id])

  return (
    <TextContext.Provider value={{ markIds }}>{children}</TextContext.Provider>
  )
}

/**
 * The root element.
 */
const Companion: TextAddon['Companion'] = () => <TextMenu />

/**
 * Handle insert text.
 */
const insertText: TextAddon['insertText'] = (ctx, ...rest) => {
  if (runMarkHandler(ctx, 'insertText', ...rest).break) {
    return true
  }

  return false
}

/**
 * Handle keyboard events.
 */
const onKeyDown: TextAddon['onKeyDown'] = (ctx, ...rest) => {
  if (runMarkHandler(ctx, 'onKeyDown', ...rest).break) {
    return true
  }

  return false
}

/**
 * The addon builder.
 *
 * @param params - Initial set of params.
 */
export function text(params?: { marks?: BaseMarkId[] }): TextAddon {
  return leafAddon({
    id: 'text',
    baseMarkIds: params?.marks ?? [...baseMarkIds],
    render,
    insertText,
    onKeyDown,

    ContextProvider,
    Companion,
  })
}

export * from './schema'
export * from './types'
