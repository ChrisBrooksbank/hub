import { describe, expect, it } from 'vitest'
import type { Site } from '../data/schema'
import { createListView, groupByCategory } from './list'
import { createFavourites } from './favourites'
import { createStore } from './store'

function site(id: string, over: Partial<Site> = {}): Site {
  return {
    id,
    name: id,
    url: `https://${id}.netlify.app`,
    description: `About ${id}`,
    category: 'Tools',
    tags: [],
    language: null,
    isPrivateRepo: false,
    lastPushed: null,
    status: 'live',
    ...over,
  }
}

const memory = () => {
  const data = new Map<string, string>()
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
  }
}

const sites = [
  site('maze', { category: 'Games', thumb: '/thumbs/maze.webp' }),
  site('breathe', { category: 'Wellbeing', status: 'dead' }),
  site('chess', { category: 'Games' }),
]

describe('groupByCategory', () => {
  it('groups in first-seen order', () => {
    expect(groupByCategory(sites).map(([c, s]) => [c, s.length])).toEqual([
      ['Games', 2],
      ['Wellbeing', 1],
    ])
  })
})

describe('createListView', () => {
  it('renders headings, links, thumbnails and offline text', () => {
    document.body.innerHTML = ''
    createListView(document.body, createStore(sites), createFavourites(memory()))
    expect(document.querySelectorAll('h2')).toHaveLength(2)
    expect(document.querySelector<HTMLAnchorElement>('h3 a')?.href).toBe(
      'https://maze.netlify.app/',
    )
    expect(document.querySelector('img')?.alt).toBe('Screenshot of maze')
    expect(document.body.textContent).toContain('May be offline')
  })

  it('follows the store and disposes', () => {
    document.body.innerHTML = ''
    const store = createStore(sites)
    const dispose = createListView(document.body, store, createFavourites(memory()))
    store.setFilter({ category: 'Wellbeing' })
    expect(document.querySelectorAll('h3')).toHaveLength(1)
    store.setFilter({ query: 'zzz' })
    expect(document.body.textContent).toContain('No sites match.')
    dispose()
    expect(document.querySelector('.list-view')).toBeNull()
  })

  it('toggles favourites from the list', () => {
    document.body.innerHTML = ''
    const favourites = createFavourites(memory())
    createListView(document.body, createStore(sites, favourites), favourites)
    const button = document.querySelector<HTMLButtonElement>('button.fav')!
    expect(button.getAttribute('aria-pressed')).toBe('false')
    button.click()
    expect(favourites.has('maze')).toBe(true)
    expect(document.querySelector('button.fav')?.getAttribute('aria-pressed')).toBe('true')
  })
})
