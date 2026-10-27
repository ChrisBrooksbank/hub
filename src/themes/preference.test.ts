import { describe, expect, it, vi } from 'vitest'
import {
  loadStoredTheme,
  prefersBasic,
  prefersReducedMotion,
  resolveThemeId,
  saveTheme,
  STORAGE_KEY,
} from './preference'

const base = { search: '', stored: null, webgl: true }

describe('resolveThemeId', () => {
  it('defaults to professional', () => {
    expect(resolveThemeId(base)).toBe('professional')
  })
  it('uses the stored theme', () => {
    expect(resolveThemeId({ ...base, stored: 'basic' })).toBe('basic')
  })
  it('lets ?theme= beat storage', () => {
    expect(resolveThemeId({ ...base, search: '?theme=basic', stored: 'professional' })).toBe(
      'basic',
    )
  })
  it('ignores unknown ids', () => {
    expect(resolveThemeId({ ...base, search: '?theme=nope', stored: 'also-nope' })).toBe(
      'professional',
    )
  })
  it('forces basic without WebGL', () => {
    expect(resolveThemeId({ search: '?theme=professional', stored: null, webgl: false })).toBe(
      'basic',
    )
  })
})

describe('storage', () => {
  it('round-trips and survives blocked storage', () => {
    const data = new Map<string, string>()
    const storage = {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
    }
    saveTheme('basic', storage)
    expect(loadStoredTheme(storage)).toBe('basic')
    expect(data.get(STORAGE_KEY)).toBe('basic')
    const blocked = {
      getItem: vi.fn(() => {
        throw new Error('blocked')
      }),
      setItem: vi.fn(() => {
        throw new Error('blocked')
      }),
    }
    expect(loadStoredTheme(blocked)).toBeNull()
    expect(() => saveTheme('basic', blocked)).not.toThrow()
  })
})

describe('prefersReducedMotion', () => {
  it('reads only the reduced-motion query', () => {
    const only = (q: string) => (query: string) => ({ matches: query.includes(q) })
    expect(prefersReducedMotion(only('reduced-motion'))).toBe(true)
    expect(prefersReducedMotion(only('contrast'))).toBe(false)
  })
})

describe('prefersBasic', () => {
  it('is true for reduced motion or more contrast only', () => {
    const only = (q: string) => (query: string) => ({ matches: query.includes(q) })
    expect(prefersBasic(only('reduced-motion'))).toBe(true)
    expect(prefersBasic(only('contrast'))).toBe(true)
    expect(prefersBasic(() => ({ matches: false }))).toBe(false)
  })
})
