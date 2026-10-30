import type { Site } from '../data/schema'
import type { Favourites } from './favourites'
import { filterSites, INITIAL_FILTER, type FilterState } from './filter'

export interface AppState {
  filter: FilterState
  visible: Site[]
}

export interface Store {
  get(): AppState
  setFilter(patch: Partial<FilterState>): void
  subscribe(listener: (state: AppState) => void): () => void
}

/** Minimal observable app state: the filter and the sites it leaves visible. */
export function createStore(sites: readonly Site[], favourites?: Favourites): Store {
  const isFavourite = (id: string): boolean => favourites?.has(id) ?? false
  let state: AppState = {
    filter: INITIAL_FILTER,
    visible: filterSites(sites, INITIAL_FILTER, isFavourite),
  }
  const listeners = new Set<(state: AppState) => void>()
  const publish = (filter: FilterState): void => {
    state = { filter, visible: filterSites(sites, filter, isFavourite) }
    listeners.forEach((listener) => listener(state))
  }
  favourites?.subscribe(() => {
    if (state.filter.favouritesOnly) publish(state.filter)
  })
  return {
    get: () => state,
    setFilter: (patch) => publish({ ...state.filter, ...patch }),
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}
