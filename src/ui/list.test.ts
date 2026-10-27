import { describe, expect, it } from 'vitest'
import type { Site } from '../data/schema'
import { createListView, groupByCategory } from './list'
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
    createListView(document.body, createStore(sites), sites)
    expect(document.querySelectorAll('h2')).toHaveLength(2)
    expect(document.querySelector<HTMLAnchorElement>('h3 a')?.href).toBe(
      'https://maze.netlify.app/',
    )
    expect(document.querySelector('img')?.alt).toBe('Screenshot of maze')
    expect(document.body.textContent).toContain('May be offline')
  })

  it('filters via chips and search, and disposes', () => {
    document.body.innerHTML = ''
    const store = createStore(sites)
    const dispose = createListView(document.body, store, sites)
    const wellbeing = [...document.querySelectorAll('button')].find(
      (b) => b.textContent === 'Wellbeing',
    )
    wellbeing?.click()
    expect(wellbeing?.getAttribute('aria-pressed')).toBe('true')
    expect(document.querySelectorAll('h3')).toHaveLength(1)
    const input = document.querySelector('input')!
    input.value = 'zzz'
    input.dispatchEvent(new Event('input'))
    expect(document.body.textContent).toContain('No sites match.')
    dispose()
    expect(document.querySelector('main')).toBeNull()
  })
})
