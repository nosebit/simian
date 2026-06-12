import { isHotkey } from 'is-hotkey'
import { nanoid } from 'nanoid'
import { Editor, Element, Node, Range } from 'slate'

import {
  AddonBase,
  AddonHandlerArgs,
  AddonHandlerReturn,
  AddonOriginalHandler,
} from './addon/types'
import { EditorAddon } from './addon'

//////////////////////////////////////////////////
// Utilitary Types
//////////////////////////////////////////////////
interface ExtensionProps {
  id: string
  mode: Editor['mode']
  addons: EditorAddon[]
}

//////////////////////////////////////////////////
// Utilitary Functions
//////////////////////////////////////////////////
/**
 * Base extend function.
 */
const extend =
  <TKey extends keyof Editor>(
    key: TKey,
    fn: (editor: Editor, before: Editor[TKey]) => Editor[TKey],
  ) =>
  (editor: Editor) => {
    const before = editor[key]
    const after = fn(editor, before)
    editor[key] = after
  }

export const runAddonHandler = <K extends keyof AddonBase>(
  opts: {
    editor: Editor
    parseResponse?: (response: AddonHandlerReturn<K>) => {
      break?: boolean
      result: AddonHandlerReturn<K> | undefined
    }
  },
  handlerName: K,
  original: AddonOriginalHandler<K>,
  ...args: AddonHandlerArgs<K>
): {
  break?: boolean
  result?: AddonHandlerReturn<K> | undefined
} => {
  const { editor } = opts
  const { addons } = editor

  const ctx = {
    editor,
    selection: editor.selection
      ? {
          ...editor.selection,
          isCollapsed:
            !!editor.selection && Range.isCollapsed(editor.selection),
        }
      : undefined,
    [handlerName]: original,
  }

  const parseResponse =
    opts.parseResponse ??
    ((rawResponse) => {
      const response =
        typeof rawResponse === 'boolean'
          ? { break: rawResponse }
          : (rawResponse as {
              break?: boolean
              result: AddonHandlerReturn<K> | undefined
            })

      return response
    })

  for (const addon of addons) {
     
    const handler = addon[handlerName] as any

    if (typeof handler === 'function') {
      const rawResponse = handler(
        {
          addon,
          ...ctx,
        },
        ...args,
      )

      // We have two options here:
      // (1) Response is a simple boolean indicating if we should break following execution;
      // (2) Response if of type {break?: boolean; result: any}.
      const response = parseResponse(rawResponse)

      // First responder strategy: the first addon able to
      // handle the data wins.
      if (response.break) {
        return response
      }
    }
  }

  return { break: false }
}

//////////////////////////////////////////////////
// Extended Editor Functions
//////////////////////////////////////////////////
/**
 * Extended the apply function.
 * @param apply
 * @returns
 */
const apply = extend('apply', (editor, apply) => (operation) => {
  if (operation.type === 'insert_node') {
    const { node } = operation

    // If it's an Element (not a text node) and missing an ID
    if (Element.isElement(node) && !node.id) {
      // We create a copy with the ID
      const nodeWithId = { ...node, id: nanoid() }

      // Replace the original operation node
      operation.node = nodeWithId
    }
  }

  if (operation.type === 'split_node') {
    const { path, properties } = operation

    // Get the node that is being split
    const node = Node.get(editor, path)

    // We only care if we are splitting an Element (Paragraph, Heading, etc.)
    // Slate also splits Text nodes, which we want to ignore here.
    if (Element.isElement(node)) {
      // Force a new ID into the properties of the NEW node being created
      operation.properties = {
        ...properties,
        id: nanoid(),
      }
    }
  }

  apply(operation)
})

/**
 * Extend the deleteBackward function.
 */
const deleteBackward = extend(
  'deleteBackward',
  (editor, deleteBackward) => (unit) => {
    if (editor.mode == 'read') {
      return
    }

    if (
      runAddonHandler({ editor }, 'deleteBackward', deleteBackward, unit).break
    ) {
      return
    }

    deleteBackward(unit)
  },
)

/**
 * Extend the deleteForward function.
 */
const deleteForward = extend(
  'deleteForward',
  (editor, deleteForward) => (unit) => {
    if (editor.mode == 'read') {
      return
    }

    if (
      runAddonHandler({ editor }, 'deleteForward', deleteForward, unit).break
    ) {
      return
    }

    deleteForward(unit)
  },
)

/**
 * Extend the insertBreak function.
 */
const insertBreak = extend('insertBreak', (editor, insertBreak) => () => {
  if (editor.mode == 'read') {
    return
  }

  if (runAddonHandler({ editor }, 'insertBreak', insertBreak).break) {
    return
  }

  insertBreak()
})

/**
 * Extend the insertData function.
 */
const insertData = extend('insertData', (editor, insertData) => (data) => {
  if (editor.mode == 'read') {
    return
  }

  if (runAddonHandler({ editor }, 'insertData', insertData, data).break) {
    return
  }

  insertData(data)
})

/**
 * Extend the insertText function.
 */
const insertText = extend('insertText', (editor, insertText) => (text) => {
  if (editor.mode == 'read') {
    return
  }

  if (runAddonHandler({ editor }, 'insertText', insertText, text).break) {
    return
  }

  insertText(text)
})

/**
 * Extend the isBlock function.
 */
const isBlock = extend('isBlock', (editor, isBlock) => (element) => {
  // Check if any addon identifies this element as a block
  const { result } = runAddonHandler(
    {
      editor,
      parseResponse: (rawResponse) => ({
        break: rawResponse === 'yes',
        result: rawResponse,
      }),
    },
    'isBlock',
    isBlock,
    element,
  )

  // If an addon says "yes", it's a block.
  // Otherwise, fallback to slate's default isBlock.
  return result === 'yes' || isBlock(element)
})

/**
 * Extend the isInline function.
 */
const isInline = extend('isInline', (editor, isInline) => (element) => {
  const { result } = runAddonHandler(
    {
      editor,
      parseResponse: (rawResponse) => ({
        break: rawResponse == 'yes',
        result: rawResponse,
      }),
    },
    'isInline',
    isInline,
    element,
  )

  return result == 'yes' || isInline(element)
})

/**
 * Extend the normalizeNode function.
 */
const normalizeNode = extend(
  'normalizeNode',
  (editor, normalizeNode) => (entry) => {
    if (editor.mode == 'read') {
      return
    }

    if (
      runAddonHandler({ editor }, 'normalizeNode', normalizeNode, entry).break
    ) {
      return
    }

    normalizeNode(entry)
  },
)

/**
 * Extend the onKeyDown function.
 */
const onKeyDown = extend('onKeyDown', (editor, onKeyDown) => (evt) => {
  if (editor.mode == 'read') {
    return
  }

  if (runAddonHandler({ editor }, 'onKeyDown', onKeyDown, evt).break) {
    return
  }

  // Undo & Redo
  if (isHotkey('mod+z')(evt)) {
    evt.preventDefault()
    editor.undo()
  } else if (isHotkey(['mod+y', 'mod+shift+z'])(evt)) {
    evt.preventDefault()
    editor.redo()
  }
})

/**
 * Extend the onChange function.
 */
const onChange = extend('onChange', (editor, onChange) => (...rest) => {
  if (
    editor.mode == 'write' &&
    runAddonHandler({ editor }, 'onChange', onChange, ...rest).break
  ) {
    return
  }

  onChange(...rest)
})

//////////////////////////////////////////////////
// Entrypoint to Extend the Editor
//////////////////////////////////////////////////
/**
 * Extend the editor with the extended functions defined above and
 * with custom props passed in.
 *
 * @param editor -
 * @param props -
 */
export function withAddons(
  editor: Editor,
  props: {
    id: string
    mode: Editor['mode']
    addons: EditorAddon[]
  },
) {
  editor.addons = props.addons
  editor.mode = props.mode

  // Define the getAddon utility function.
  editor.getAddon = (id) => {
    // We cast to EditorAddon[] to allow the .find logic to work smoothly
     
    return (editor.addons as EditorAddon[]).find((a) => a.id === id) as any
  }

  // Define the hasAddon utility function.
  editor.hasAddon = (id) => {
    return Boolean(editor.getAddon(id))
  }

  // Extend editor functions.
  apply(editor)
  deleteBackward(editor)
  deleteForward(editor)
  insertBreak(editor)
  insertData(editor)
  insertText(editor)
  isBlock(editor)
  isInline(editor)
  normalizeNode(editor)
  onChange(editor)
  onKeyDown(editor)

  // Return the extended editor.
  return editor
}

/**
 * Set editor props.
 */
export function setExtensionProps(
  editor: Editor,
  props: Partial<ExtensionProps>,
) {
  editor.id = props.id ?? editor.id
  editor.addons = props.addons ?? editor.addons
  editor.mode = props.mode ?? editor.mode
}

/**
 * Extend the editor with the extended functions defined above and
 * with custom props passed in.
 *
 * @param editor -
 * @param props -
 */
export function withExtensions(editor: Editor, props: ExtensionProps) {
  setExtensionProps(editor, props)

  // Define the getAddon utility function.
  editor.getAddon = (id) => {
    // We cast to EditorAddon[] to allow the .find logic to work smoothly
     
    return (editor.addons as EditorAddon[]).find((a) => a.id === id) as any
  }

  // Define the hasAddon utility function.
  editor.hasAddon = (id) => {
    return Boolean(editor.getAddon(id))
  }

  // Extend editor functions.
  apply(editor)
  deleteBackward(editor)
  deleteForward(editor)
  insertBreak(editor)
  insertData(editor)
  insertText(editor)
  isInline(editor)
  normalizeNode(editor)
  onChange(editor)
  onKeyDown(editor)

  // Return the extended editor.
  return editor
}
