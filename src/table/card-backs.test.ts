import { describe, expect, it } from 'vitest'
import { BACKS, pickBack } from './card-backs'

describe('card backs', () => {
  it('offers several distinct designs', () => {
    expect(BACKS.length).toBeGreaterThanOrEqual(4)
    expect(new Set(BACKS.map((back) => back.id)).size).toBe(BACKS.length)
  })

  it('covers every design across the random range', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 60; i++) seen.add(pickBack(i / 60).id)
    expect(seen.size).toBe(BACKS.length)
  })

  it('never repeats the avoided design', () => {
    for (let i = 0; i <= 20; i++) expect(pickBack(i / 20, 'deco').id).not.toBe('deco')
  })

  it('stays in range at the edges', () => {
    expect(pickBack(0)).toBeDefined()
    expect(pickBack(1)).toBeDefined()
    expect(pickBack(-1)).toBeDefined()
  })
})
