import { Descendant, Element, Node, Text } from 'slate'
import type { RenderElementProps } from 'slate-react'

// import * as minio from "@/utils/minio";

export type ElementType = RenderElementProps['element']['type']

export function serializeNode(node: Node, exclude?: ElementType[]) {
  const excludedTypes = exclude ?? []

  if (Text.isText(node)) {
    return node.text
  }

  const children: string = node.children.map((n) => serializeNode(n)).join('')

  if (Element.isElement(node)) {
    if (excludedTypes.includes(node.type)) {
      return ''
    }

    switch (node.type) {
      case 'title':
      case 'subtitle':
        return children

      case 'paragraph':
        return `${children}\n\n`

      case 'heading': {
        // Mapping:
        // Level 1 -> ## (H2)
        // Level 2 -> ### (H3)
        // Level 3 -> #### (H4)
        const hashes = (node.level || 1) + 1
        const prefix = '#'.repeat(hashes)
        return `${prefix} ${children}\n\n`
      }

      case 'code-block': {
        // Fallback to plain text if language is missing
        const lang = node.language || 'javascript'
        return `\`\`\`${lang}\n${children}\n\`\`\`\n\n`
      }

      default:
        return children
    }
  }

  return ''
}

export const serialize = (
  nodes: Descendant[],
  exclude?: ElementType[],
): string => {
  let result = ''

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]

    if (Element.isElement(node) && node.type === 'title') {
      const nextNode = nodes[i + 1]
      if (Element.isElement(nextNode) && nextNode.type === 'subtitle') {
        result += `# ${serializeNode(node)} : ${serializeNode(nextNode)}\n\n`
        i++ // Skip the subtitle as it's merged
        continue
      }
      result += `# ${serializeNode(node)}\n\n`
      continue
    }

    result += serializeNode(node, exclude)
  }

  return result
}
