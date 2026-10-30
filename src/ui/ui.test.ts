import { describe, expect, it, vi } from 'vitest'
import type { Site } from '../data/schema'
import { categoriesOf, filterSites, resultsMessage } from './filter'
import { createLiveRegion } from './live-region'
import { createStore } from './store'

function site(id: string, over: Partial<Site> = {}): Site {
  return {
    id,
    name: id,
    url: `https://${id}.netlify.app`,
    description: '',
    category: 'Tools',
    tags: [],
    language: null,
    isPrivateRepo: false,
    lastPushed: null,
    status: 'live',
    ...over,
  }
}

const sites = [
  site('maze', { category: 'Games', description: 'Find your way out', tags: ['puzzle'] }),
  site('breathe', { category: 'Wellbeing', description: 'Calm breathing guide' }),
  site('globe', { category: '3D & Visual', tags: ['webgl', 'Earth'] }),
]

describe('filterSites', () => {
  it('hides projects with no live demo unless asked or flagged to show', () => {
    const noDemo = { ...sites[0]!, id: 'nodemo', url: undefined }
    const flagged = { ...sites[0]!, id: 'flagged', url: undefined, showByDefault: true }
    const all = [...sites, noDemo, flagged]
    const base = { category: null, query: '', favouritesOnly: false }
    const ids = (filter: object) => filterSites(all, { ...base, ...filter }).map((s) => s.id)
    expect(ids({})).not.toContain('nodemo')
    expect(ids({})).toContain('flagged')
    expect(ids({ withoutDemo: true })).toContain('nodemo')
  })
  it('keeps only favourites when asked', () => {
    const filter = { category: null, query: '', favouritesOnly: true }
    expect(filterSites(sites, filter, (id) => id === 'globe').map((s) => s.id)).toEqual(['globe'])
  })
  it('returns everything for the initial filter', () => {
    expect(filterSites(sites, { category: null, query: '', favouritesOnly: false })).toHaveLength(3)
  })
  it('filters by category', () => {
    expect(
      filterSites(sites, { category: 'Games', query: '', favouritesOnly: false }).map((s) => s.id),
    ).toEqual(['maze'])
  })
  it('searches name, tag and description case-insensitively', () => {
    expect(
      filterSites(sites, { category: null, query: 'GLO', favouritesOnly: false }).map((s) => s.id),
    ).toEqual(['globe'])
    expect(
      filterSites(sites, { category: null, query: 'earth', favouritesOnly: false }).map(
        (s) => s.id,
      ),
    ).toEqual(['globe'])
    expect(
      filterSites(sites, { category: null, query: 'calm', favouritesOnly: false }).map((s) => s.id),
    ).toEqual(['breathe'])
  })
  it('requires every term and combines with category', () => {
    expect(
      filterSites(sites, { category: null, query: 'find puzzle', favouritesOnly: false }),
    ).toHaveLength(1)
    expect(
      filterSites(sites, { category: null, query: 'find calm', favouritesOnly: false }),
    ).toHaveLength(0)
    expect(
      filterSites(sites, { category: 'Wellbeing', query: 'maze', favouritesOnly: false }),
    ).toHaveLength(0)
  })
})

describe('helpers', () => {
  it('lists categories in first-seen order', () => {
    expect(categoriesOf(sites)).toEqual(['Games', 'Wellbeing', '3D & Visual'])
  })
  it('words the result count', () => {
    expect(resultsMessage(12)).toBe('12 sites shown')
    expect(resultsMessage(1)).toBe('1 site shown')
    expect(resultsMessage(0)).toBe('0 sites shown')
  })
})

describe('createStore', () => {
  it('recomputes visible sites and notifies subscribers', () => {
    const store = createStore(sites)
    const listener = vi.fn()
    const unsubscribe = store.subscribe(listener)
    store.setFilter({ category: 'Games' })
    expect(store.get().visible.map((s) => s.id)).toEqual(['maze'])
    expect(listener).toHaveBeenCalledTimes(1)
    unsubscribe()
    store.setFilter({ query: 'x', favouritesOnly: false })
    expect(listener).toHaveBeenCalledTimes(1)
  })
})

describe('createLiveRegion', () => {
  it('announces via a polite status element', () => {
    const announce = createLiveRegion(document.body)
    announce('3 sites shown')
    const el = document.querySelector('[role="status"]')
    expect(el?.getAttribute('aria-live')).toBe('polite')
    expect(el?.textContent).toBe('3 sites shown')
  })
})
