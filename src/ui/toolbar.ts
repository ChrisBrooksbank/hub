import type { Site } from '../data/schema'
import { PROFILE } from '../profile'
import type { Favourites } from './favourites'
import { categoriesOf } from './filter'
import type { Store } from './store'
import type { View } from './view-preference'

export interface ToolbarOptions {
  store: Store
  sites: readonly Site[]
  favourites: Favourites
  view: View
  onView: (view: View) => void
  onShuffle: () => void
}

export interface Toolbar {
  readonly element: HTMLElement
  setView(view: View): void
  dispose(): void
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<HTMLElementTagNameMap[K]> = {},
  children: (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const node = Object.assign(document.createElement(tag), props)
  node.append(...children)
  return node
}

/** The one control bar shared by the cards and list views: title, search, categories, view. */
export function createToolbar(options: ToolbarOptions): Toolbar {
  const { store, sites, favourites, onView, onShuffle } = options

  const search = el('input', {
    type: 'search',
    id: 'site-search',
    placeholder: 'Search sites',
    autocomplete: 'off',
  })
  search.addEventListener('input', () => store.setFilter({ query: search.value }))
  const searchLabel = el('label', {
    htmlFor: 'site-search',
    className: 'visually-hidden',
    textContent: 'Search sites',
  })

  const chips = el('div', { className: 'chips', role: 'group' })
  chips.setAttribute('aria-label', 'Filter by category')
  const chipButtons = new Map<string | null, HTMLButtonElement>()
  for (const category of [null, ...categoriesOf(sites)]) {
    const button = el('button', { type: 'button', textContent: category ?? 'All' })
    button.addEventListener('click', () => store.setFilter({ category }))
    chipButtons.set(category, button)
    chips.append(button)
  }

  const favouritesToggle = el('button', { type: 'button', className: 'fav-filter' })
  favouritesToggle.addEventListener('click', () =>
    store.setFilter({ favouritesOnly: !store.get().filter.favouritesOnly }),
  )

  const noDemoCount = sites.filter((site) => !site.url && !site.showByDefault).length
  const demoToggle = el('button', { type: 'button', className: 'chip-extra' })
  demoToggle.addEventListener('click', () =>
    store.setFilter({ withoutDemo: !store.get().filter.withoutDemo }),
  )

  const shuffle = el('button', { type: 'button', className: 'action', textContent: 'Shuffle' })
  shuffle.addEventListener('click', onShuffle)

  const toggle = el('div', { className: 'toggle', role: 'group' })
  toggle.setAttribute('aria-label', 'View')
  const viewButtons = new Map<View, HTMLButtonElement>()
  for (const [view, label] of [
    ['table', 'Cards'],
    ['list', 'List'],
  ] as const) {
    const button = el('button', { type: 'button', textContent: label })
    button.addEventListener('click', () => onView(view))
    viewButtons.set(view, button)
    toggle.append(button)
  }

  const count = el('span', { className: 'count' })

  const element = el('header', { className: 'toolbar' }, [
    el('div', { className: 'title' }, [
      el('h1', { textContent: 'Chris Brooksbank’s sites' }),
      el('p', {
        className: 'byline',
        textContent: PROFILE.byline,
      }),
    ]),
    el('div', { className: 'search' }, [searchLabel, search]),
    chips,
    el('div', { className: 'actions' }, [count, favouritesToggle, demoToggle, shuffle, toggle]),
  ])

  const sync = (): void => {
    const { filter, visible } = store.get()
    chipButtons.forEach((button, category) =>
      button.setAttribute('aria-pressed', String(category === filter.category)),
    )
    const total = filter.withoutDemo ? sites.length : sites.length - noDemoCount
    count.textContent = `${visible.length} of ${total}`
    demoToggle.setAttribute('aria-pressed', String(Boolean(filter.withoutDemo)))
    demoToggle.textContent = `${filter.withoutDemo ? '−' : '+'} No live demo (${noDemoCount})`
    demoToggle.hidden = noDemoCount === 0
    favouritesToggle.setAttribute('aria-pressed', String(filter.favouritesOnly))
    favouritesToggle.textContent = `★ Favourites (${favourites.ids().size})`
  }
  sync()
  const unsubscribe = store.subscribe(sync)
  const unsubscribeFavourites = favourites.subscribe(sync)

  const setView = (view: View): void => {
    viewButtons.forEach((button, value) =>
      button.setAttribute('aria-pressed', String(value === view)),
    )
    shuffle.hidden = view !== 'table'
  }
  setView(options.view)

  return {
    element,
    setView,
    dispose: () => {
      unsubscribe()
      unsubscribeFavourites()
      element.remove()
    },
  }
}
