import { describe, expect, it } from 'vitest'
import { resolveManifest } from './manifest'

const base = {
  description: 'd',
  category: 'Tools',
  tags: [],
  language: null,
  lastPushed: null,
  isPrivateRepo: false,
}

const site = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  name: id,
  url: `https://${id}.netlify.app`,
  ...base,
  ...extra,
})

describe('resolveManifest', () => {
  it('splits hidden from visible after applying overrides', () => {
    const { visible, hidden } = resolveManifest(
      [site('a'), site('b', { hidden: true }), site('c')],
      [
        { id: 'c', hidden: true },
        { id: 'b', hidden: false },
      ],
    )
    expect(visible.map((s) => s.id)).toEqual(['a', 'b'])
    expect(hidden.map((s) => s.id)).toEqual(['c'])
  })

  it('throws a readable error when the merged manifest is invalid', () => {
    expect(() => resolveManifest([site('a', { url: 'nope' })], [])).toThrow(/merged manifest/)
  })
})
