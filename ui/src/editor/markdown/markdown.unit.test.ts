import { Descendant } from 'slate'
import { describe, expect, it, vi } from 'vitest'

import { deserialize } from './deserializer'
import { serialize } from './serializer'

vi.mock('nanoid', () => ({
  nanoid: () => 'test-id',
}))

describe('Markdown Serialization/Deserialization', () => {
  describe('Paragraphs', () => {
    it('should deserialize a paragraph', () => {
      const md = 'Hello world\n\n'
      const slate = deserialize(md)
      expect(slate).toEqual([
        {
          id: 'test-id',
          type: 'paragraph',
          children: [{ text: 'Hello world' }],
        },
      ])
    })

    it('should serialize a paragraph', () => {
      const slate: Descendant[] = [
        {
          id: 'test-id',
          type: 'paragraph',
          children: [{ text: 'Hello world' }],
        },
      ]
      const md = serialize(slate)
      expect(md).toBe('Hello world\n\n')
    })
  })

  describe('Title and Subtitle', () => {
    it('should deserialize first H1 as title', () => {
      const md = '# My Title\n\n'
      const slate = deserialize(md)
      expect(slate).toEqual([
        {
          id: 'test-id',
          type: 'title',
          children: [{ text: 'My Title' }],
        },
      ])
    })

    it('should split first H1 into title and subtitle with colon', () => {
      const md = '# About Me : My Story\n\n'
      const slate = deserialize(md)
      expect(slate).toEqual([
        {
          id: 'test-id',
          type: 'title',
          children: [{ text: 'About Me' }],
        },
        {
          id: 'test-id',
          type: 'subtitle',
          children: [{ text: 'My Story' }],
        },
      ])
    })

    it('should split first H1 into title and subtitle with dash', () => {
      const md = '# Life - A Journey\n\n'
      const slate = deserialize(md)
      expect(slate).toEqual([
        {
          id: 'test-id',
          type: 'title',
          children: [{ text: 'Life' }],
        },
        {
          id: 'test-id',
          type: 'subtitle',
          children: [{ text: 'A Journey' }],
        },
      ])
    })

    it('should serialize title and subtitle together', () => {
      const slate: Descendant[] = [
        { id: 'id1', type: 'title', children: [{ text: 'Main Title' }] },
        { id: 'id2', type: 'subtitle', children: [{ text: 'Secondary' }] },
      ]
      const md = serialize(slate)
      expect(md).toBe('# Main Title : Secondary\n\n')
    })

    it('should serialize title alone', () => {
      const slate: Descendant[] = [
        { id: 'id1', type: 'title', children: [{ text: 'Only Title' }] },
      ]
      const md = serialize(slate)
      expect(md).toBe('# Only Title\n\n')
    })
  })

  describe('Headings', () => {
    it('should deserialize subsequent H1 as heading level 1 (H2)', () => {
      const md = '# Title\n\n# Section\n\n'
      const slate = deserialize(md)
      expect(slate).toEqual([
        {
          id: 'test-id',
          type: 'title',
          children: [{ text: 'Title' }],
        },
        {
          id: 'test-id',
          type: 'heading',
          level: 1,
          children: [{ text: 'Section' }],
        },
      ])
    })

    it('should map H2, H3, H4 to respective levels', () => {
      const md = '## H2\n\n### H3\n\n#### H4\n\n'
      const slate: Descendant[] = deserialize(md)
      expect(slate[0]).toMatchObject({ type: 'heading', level: 1 })
      expect(slate[1]).toMatchObject({ type: 'heading', level: 2 })
      expect(slate[2]).toMatchObject({ type: 'heading', level: 3 })
    })

    it('should serialize headings correctly', () => {
      const slate: Descendant[] = [
        { id: '1', type: 'heading', level: 1, children: [{ text: 'H2' }] },
        { id: '2', type: 'heading', level: 2, children: [{ text: 'H3' }] },
        { id: '3', type: 'heading', level: 3, children: [{ text: 'H4' }] },
      ]
      const md = serialize(slate)
      expect(md).toContain('## H2\n\n')
      expect(md).toContain('### H3\n\n')
      expect(md).toContain('#### H4\n\n')
    })
  })

  describe('Code Blocks', () => {
    it('should deserialize and serialize code blocks with language', () => {
      const md = '```typescript\nconst a = 1;\n```\n\n'
      const slate: Descendant[] = deserialize(md)
      expect(slate[0]).toEqual({
        id: 'test-id',
        type: 'code-block',
        language: 'typescript',
        children: [{ text: 'const a = 1;' }],
      })

      const serialized = serialize(slate)
      expect(serialized).toBe(md)
    })
  })
})
