import { describe, expect, it } from 'vitest'
import {
  hasWebGL,
  loadStoredView,
  prefersReducedMotion,
  resolveView,
  saveView,
  STORAGE_KEY,
} from './view-preference'

const base = { search: '', stored: null, webgl: true }

describe('resolveView', () => {
  it('defaults to the table', () => {
    expect(resolveView(base)).toBe('table')
  })
  it('uses the stored choice, and ?view= beats it', () => {
    expect(resolveView({ ...base, stored: 'list' })).toBe('list')
    expect(resolveView({ ...base, search: '?view=table', stored: 'list' })).toBe('table')
  })
  it('ignores unknown values', () => {
    expect(resolveView({ ...base, search: '?view=cube', stored: 'cube' })).toBe('table')
  })
  it('forces the list without WebGL', () => {
    expect(resolveView({ ...base, search: '?view=table', webgl: false })).toBe('list')
  })
})

describe('storage', () => {
  it('round-trips and survives blocked storage', () => {
    const data = new Map<string, string>()
    const storage = {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
    }
    saveView('list', storage)
    expect(data.get(STORAGE_KEY)).toBe('list')
    expect(loadStoredView(storage)).toBe('list')
    const blocked = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    }
    expect(loadStoredView(blocked)).toBeNull()
    expect(() => saveView('table', blocked)).not.toThrow()
  })
})

describe('environment probes', () => {
  it('reads reduced motion', () => {
    expect(prefersReducedMotion(() => ({ matches: true }))).toBe(true)
  })
  it('reports no WebGL when the context is unavailable', () => {
    const doc = { createElement: () => ({ getContext: () => null }) } as unknown as Document
    expect(hasWebGL(doc)).toBe(false)
  })
})
