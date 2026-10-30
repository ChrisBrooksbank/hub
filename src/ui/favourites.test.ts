import { describe, expect, it, vi } from 'vitest'
import { createFavourites, FAVOURITES_KEY } from './favourites'

function memory(initial?: string) {
  const data = new Map<string, string>(initial ? [[FAVOURITES_KEY, initial]] : [])
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
  }
}

describe('createFavourites', () => {
  it('toggles, persists and notifies', () => {
    const storage = memory()
    const favourites = createFavourites(storage)
    const listener = vi.fn()
    favourites.subscribe(listener)
    favourites.toggle('maze')
    expect(favourites.has('maze')).toBe(true)
    expect(storage.data.get(FAVOURITES_KEY)).toBe('["maze"]')
    favourites.toggle('maze')
    expect(favourites.has('maze')).toBe(false)
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('loads saved favourites and ignores junk', () => {
    expect([...createFavourites(memory('["a","b"]')).ids()]).toEqual(['a', 'b'])
    expect(createFavourites(memory('not json')).ids().size).toBe(0)
    expect([...createFavourites(memory('["a",3,null]')).ids()]).toEqual(['a'])
  })

  it('still works when storage throws', () => {
    const blocked = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    }
    const favourites = createFavourites(blocked)
    favourites.toggle('maze')
    expect(favourites.has('maze')).toBe(true)
  })

  it('gives a new snapshot per change', () => {
    const favourites = createFavourites(memory())
    const before = favourites.ids()
    favourites.toggle('x')
    expect(before.size).toBe(0)
    expect(favourites.ids().size).toBe(1)
  })
})
