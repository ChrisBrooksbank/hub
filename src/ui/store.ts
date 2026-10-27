import type { Site } from '../data/schema'
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
export function createStore(sites: readonly Site[]): Store {
  let state: AppState = { filter: INITIAL_FILTER, visible: [...sites] }
  const listeners = new Set<(state: AppState) => void>()
  return {
    get: () => state,
    setFilter(patch) {
      const filter = { ...state.filter, ...patch }
      state = { filter, visible: filterSites(sites, filter) }
      listeners.forEach((listener) => listener(state))
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}
