import { describe, expect, it } from 'vitest'
import { mergeSites } from './merge'
import { parseManifest } from './manifest'

const generated = {
  id: 'life',
  name: 'life',
  url: 'https://life.netlify.app',
  repo: 'conways-life-sim',
  description: 'Generated description',
  category: 'Tools',
  tags: ['sim'],
  language: 'TypeScript',
  isPrivateRepo: false,
  lastPushed: '2026-10-01T00:00:00Z',
}

describe('mergeSites', () => {
  it('lets overrides win field by field and keeps untouched generated fields', () => {
    const [site] = mergeSites([generated], [{ id: 'life', name: 'Life', category: 'Games' }])
    expect(site).toMatchObject({ name: 'Life', category: 'Games', repo: 'conways-life-sim' })
  })

  it('replaces arrays instead of concatenating', () => {
    const [site] = mergeSites([generated], [{ id: 'life', tags: ['a', 'b'] }])
    expect(site?.tags).toEqual(['a', 'b'])
  })

  it('deep-merges nested objects and ignores undefined overrides', () => {
    const [site] = mergeSites(
      [{ ...generated, extra: { a: 1, b: 2 } }],
      [{ id: 'life', extra: { b: 3 }, name: undefined }],
    )
    expect(site?.extra).toEqual({ a: 1, b: 3 })
    expect(site?.name).toBe('life')
  })

  it('lets an override force hidden either way', () => {
    const priv = { ...generated, isPrivateRepo: true, hidden: true }
    const [site] = mergeSites([priv], [{ id: 'life', hidden: false }])
    expect(site?.hidden).toBe(false)
  })

  it('adds override-only sites with no repo', () => {
    const extra = { ...generated, id: 'extra' } as Record<string, unknown> & { id: string }
    delete extra.repo
    const merged = mergeSites([generated], [extra])
    expect(merged.map((s) => s.id)).toEqual(['extra', 'life'])
    expect(parseManifest(merged)).toHaveLength(2)
  })

  it('sorts by id and orders keys canonically regardless of input order', () => {
    const shuffled = {
      lastPushed: null,
      id: 'zed',
      url: 'https://z.dev',
      name: 'Z',
      zzz: 1,
      aaa: 2,
    }
    const merged = mergeSites([shuffled, { ...generated, id: 'alpha' }], [])
    expect(merged.map((s) => s.id)).toEqual(['alpha', 'zed'])
    expect(Object.keys(merged[1] ?? {})).toEqual(['id', 'name', 'url', 'lastPushed', 'aaa', 'zzz'])
  })

  it('does not mutate its inputs', () => {
    const base = structuredClone(generated)
    const override = { id: 'life', name: 'New' }
    mergeSites([base], [override])
    expect(base).toEqual(generated)
    expect(override).toEqual({ id: 'life', name: 'New' })
  })
})
