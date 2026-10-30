export const FAVOURITES_KEY = 'hub.favourites'

export interface Favourites {
  has(id: string): boolean
  toggle(id: string): void
  /** Snapshot of the favourite ids. */
  ids(): ReadonlySet<string>
  subscribe(listener: () => void): () => void
}

type FavouritesStorage = Pick<Storage, 'getItem' | 'setItem'>

function read(storage: FavouritesStorage): Set<string> {
  try {
    const parsed: unknown = JSON.parse(storage.getItem(FAVOURITES_KEY) ?? '[]')
    return new Set(Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [])
  } catch {
    return new Set()
  }
}

/** The visitor's favourite sites, kept in localStorage; works (for this visit) when storage is blocked. */
export function createFavourites(storage: FavouritesStorage = localStorage): Favourites {
  let current = read(storage)
  const listeners = new Set<() => void>()
  return {
    has: (id) => current.has(id),
    ids: () => current,
    toggle(id) {
      const next = new Set(current)
      if (!next.delete(id)) next.add(id)
      current = next
      try {
        storage.setItem(FAVOURITES_KEY, JSON.stringify([...current]))
      } catch {
        // Blocked storage: the choice lasts for this visit only.
      }
      listeners.forEach((listener) => listener())
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}
