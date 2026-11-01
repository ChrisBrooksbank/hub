// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import type { Site } from '../data/schema'
import { createFavourites } from './favourites'
import { createStore } from './store'
import { createToolbar } from './toolbar'

function site(id: string, category: string): Site {
  return {
    id,
    name: id,
    url: `https://${id}.netlify.app`,
    description: '',
    category,
    tags: [],
    language: null,
    isPrivateRepo: false,
    lastPushed: null,
    status: 'live',
  }
}

const categories = ['A', 'B', 'C', 'D', 'E', 'F']
const sites = categories.map((c) => site(c.toLowerCase(), c))

function build() {
  const favourites = createFavourites({ getItem: () => null, setItem: () => undefined })
  const store = createStore(sites, favourites)
  const toolbar = createToolbar({
    store,
    sites,
    favourites,
    view: 'table',
    onView: vi.fn(),
    onShuffle: vi.fn(),
  })
  document.body.append(toolbar.element)
  const more = toolbar.element.querySelector<HTMLButtonElement>('.more-button')!
  const panel = toolbar.element.querySelector<HTMLElement>('.more-panel')!
  return { toolbar, store, more, panel }
}

describe('toolbar More menu', () => {
  it('shows All and the first four categories inline, the rest behind More', () => {
    const { toolbar, panel } = build()
    const inline = [...toolbar.element.querySelectorAll('.chips > button:not(.more-button)')]
    expect(inline.map((b) => b.textContent)).toEqual(['All', 'A', 'B', 'C', 'D'])
    expect([...panel.querySelectorAll('button')].map((b) => b.textContent)).toEqual(
      expect.arrayContaining(['E', 'F']),
    )
    expect(panel.hidden).toBe(true)
    toolbar.dispose()
  })

  it('opens and closes, and picking a category filters and closes the menu', () => {
    const { toolbar, store, more, panel } = build()
    more.click()
    expect(panel.hidden).toBe(false)
    expect(more.getAttribute('aria-expanded')).toBe('true')
    panel.querySelectorAll('button')[0]!.click()
    expect(store.get().filter.category).toBe('E')
    expect(panel.hidden).toBe(true)
    // The active hidden category is named on the button.
    expect(more.textContent).toBe('E ▾')
    expect(more.getAttribute('aria-pressed')).toBe('true')
    toolbar.dispose()
  })

  it('closes on Escape and on an outside press', () => {
    const { toolbar, more, panel } = build()
    more.click()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(panel.hidden).toBe(true)
    more.click()
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    expect(panel.hidden).toBe(true)
    toolbar.dispose()
  })
})
