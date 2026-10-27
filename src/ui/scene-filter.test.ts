import { describe, expect, it, vi } from 'vitest'
import type { Site } from '../data/schema'
import { bindSceneFilter, createSceneSiteList } from './scene-filter'
import { createStore } from './store'

function site(id: string, over: Partial<Site> = {}): Site {
  return {
    id,
    name: id,
    url: `https://${id}.netlify.app`,
    description: '',
    category: 'Games',
    tags: [],
    language: null,
    isPrivateRepo: false,
    lastPushed: null,
    status: 'live',
    ...over,
  }
}

const sites = [
  site('maze'),
  site('breathe', { category: 'Wellbeing', status: 'dead' }),
  site('globe', { category: '3D & Visual' }),
]

describe('createSceneSiteList', () => {
  it('lists every site as a link and hides the filtered-out ones', () => {
    const store = createStore(sites)
    const { element, dispose } = createSceneSiteList(document.body, store, sites)
    expect(element.querySelectorAll('a')).toHaveLength(3)
    expect(element.textContent).toContain('breathe (may be offline)')

    store.setFilter({ category: 'Games' })
    const hidden = [...element.querySelectorAll('li')].filter((li) => li.hidden)
    expect(hidden).toHaveLength(2)
    expect(element.querySelector('li:not([hidden]) a')?.textContent).toBe('maze')

    dispose()
    expect(document.body.contains(element)).toBe(false)
  })
})

describe('bindSceneFilter', () => {
  it('applies the current filter instantly, then fades on change', () => {
    const store = createStore(sites)
    const applyFilter = vi.fn()
    const unbind = bindSceneFilter(store, { applyFilter })
    expect(applyFilter).toHaveBeenLastCalledWith(new Set(['maze', 'breathe', 'globe']), true)

    store.setFilter({ query: 'maze' })
    expect(applyFilter).toHaveBeenLastCalledWith(new Set(['maze']), false)

    unbind()
    store.setFilter({ query: '' })
    expect(applyFilter).toHaveBeenCalledTimes(2)
  })

  it('jumps instantly under reduced motion', () => {
    const store = createStore(sites)
    const applyFilter = vi.fn()
    bindSceneFilter(store, { applyFilter }, () => true)
    store.setFilter({ category: 'Wellbeing' })
    expect(applyFilter).toHaveBeenLastCalledWith(new Set(['breathe']), true)
  })
})
