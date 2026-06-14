import type { PhrasingContent, Root, RootContent } from 'mdast'
import { nanoid } from 'nanoid'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import remarkParse from 'remark-parse'
import { Descendant, Element, Text } from 'slate'
import { unified } from 'unified'

import { CodeBlockElement } from '../addon/code-block/types'

interface Math {
  type: 'math'
  value: string
}

interface InlineMath {
  type: 'inlineMath'
  value: string
}

type MdNode = RootContent | Math | InlineMath

function inlineChildren<
  TNode extends {
    children: PhrasingContent[]
  },
>(node: TNode): (Text | Element)[] {
  return node.children.flatMap((child) => {
    switch (child.type) {
      case 'text': {
        const parts = child.value.split(/(\{\{val:[a-zA-Z0-9_-]+\}\})/g)
        return parts
          .flat()
          .filter(Boolean)
          .map((part) => {
            const valMatch = part.match(/^\{\{val:([a-zA-Z0-9_-]+)\)\}$/)
            if (valMatch) {
              return {
                id: nanoid(),
                type: 'val',
                name: valMatch[1],
                children: [{ text: '' }],
              } as unknown as Element
            }
            return { text: part } satisfies Text
          })
      }
      case 'inlineCode':
        return [
          {
            text: child.value,
            code: true,
          },
        ] satisfies Text[]
      case 'emphasis':
        return inlineChildren(child).map((c) => {
          if ('text' in c) return { ...c, italic: true }
          return c
        })
      case 'strong':
        return inlineChildren(child).map((c) => {
          if ('text' in c) return { ...c, bold: true }
          return c
        })
      default: {
        return [{ text: '' }] satisfies Text[]
      }
    }
  })
}

function nodeToSlate(node: MdNode, isFirstH1: boolean): Element[] {
  switch (node.type) {
    case 'paragraph':
      return [
        {
          id: nanoid(),
          type: 'paragraph',

          children: inlineChildren(node) as any,
        },
      ]

    case 'heading': {
      if (isFirstH1) {
        // Handle title (+ optional subtitle) extraction
        const combinedText = node.children
          .map((child) => ('value' in child ? child.value : ''))
          .join('')

        const separatorMatch = combinedText.match(/^(.*?)\s*[-:]\s*(.*)$/)
        if (separatorMatch) {
          return [
            {
              id: nanoid(),
              type: 'title',
              children: [{ text: separatorMatch[1].trim() }],
            },
            {
              id: nanoid(),
              type: 'subtitle',
              children: [{ text: separatorMatch[2].trim() }],
            },
          ]
        }

        return [
          {
            id: nanoid(),
            type: 'title',
            children: [{ text: combinedText.trim() }],
          },
        ]
      }

      // Standard heading mapping:
      // Depth 1 -> Level 1 (H2)
      // Depth 2 -> Level 1 (H2)
      // Depth 3 -> Level 2 (H3)
      // Depth 4+ -> Level 3 (H4)
      const level =
        node.depth === 1 || node.depth === 2 ? 1 : node.depth === 3 ? 2 : 3

      return [
        {
          id: nanoid(),
          type: 'heading',
          level,

          children: inlineChildren(node) as any,
        },
      ]
    }

    case 'code':
      return [
        {
          id: nanoid(),
          type: 'code-block',
          language: (node.lang as CodeBlockElement['language']) || 'javascript',
          children: [{ text: node.value }],
        },
      ]

    default: {
      return []
    }
  }
}

function treeToSlate(root: Root): Descendant[] {
  let firstH1Consumed = false

  return root.children.flatMap((node) => {
    let isFirstH1 = false
    if (!firstH1Consumed && node.type === 'heading' && node.depth === 1) {
      firstH1Consumed = true
      isFirstH1 = true
    }
    return nodeToSlate(node as MdNode, isFirstH1)
  })
}

export function deserialize(markdown: string): Descendant[] {
  const tree = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .parse(markdown)

  return treeToSlate(tree)
}
