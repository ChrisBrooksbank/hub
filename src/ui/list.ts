import type { Site } from '../data/schema'
import { categoriesOf } from './filter'
import type { Store } from './store'

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<HTMLElementTagNameMap[K]> = {},
  children: (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const node = Object.assign(document.createElement(tag), props)
  node.append(...children)
  return node
}

/** Sites grouped by category, preserving first-seen category order. */
export function groupByCategory(sites: readonly Site[]): [string, Site[]][] {
  return categoriesOf(sites).map((category) => [
    category,
    sites.filter((site) => site.category === category),
  ])
}

function renderSite(site: Site): HTMLLIElement {
  const link = el('a', { href: site.url, textContent: site.name, rel: 'noopener' })
  const title = el('h3', {}, [link])
  const item = el('li', { className: 'site' }, [title])
  if (site.thumb) {
    item.prepend(el('img', { src: site.thumb, alt: `Screenshot of ${site.name}`, loading: 'lazy' }))
  }
  if (site.description) item.append(el('p', { textContent: site.description }))
  if (site.status === 'dead')
    item.append(el('p', { className: 'offline', textContent: 'May be offline' }))
  return item
}

/**
 * Semantic, framework-free list view. Renders the store's visible sites grouped by
 * category with category filter buttons and a search box. Returns a dispose function.
 */
export function createListView(
  parent: HTMLElement,
  store: Store,
  allSites: readonly Site[],
): () => void {
  const root = el('main', { className: 'list-view' })
  const search = el('input', { type: 'search', id: 'site-search', autocomplete: 'off' })
  const searchLabel = el('label', { htmlFor: 'site-search', textContent: 'Search sites' })

  const chips = el('div', { role: 'group' })
  chips.setAttribute('aria-label', 'Filter by category')
  const chipButtons = new Map<string | null, HTMLButtonElement>()
  for (const category of [null, ...categoriesOf(allSites)]) {
    const button = el('button', { type: 'button', textContent: category ?? 'All' })
    button.addEventListener('click', () => store.setFilter({ category }))
    chipButtons.set(category, button)
    chips.append(button)
  }

  const results = el('div', { className: 'results' })
  root.append(
    el('h1', { textContent: 'Chris Brooksbank’s sites' }),
    searchLabel,
    search,
    chips,
    results,
  )

  search.addEventListener('input', () => store.setFilter({ query: search.value }))

  const render = (): void => {
    const { visible, filter } = store.get()
    chipButtons.forEach((button, category) =>
      button.setAttribute('aria-pressed', String(category === filter.category)),
    )
    results.replaceChildren(
      ...groupByCategory(visible).map(([category, sites]) =>
        el('section', {}, [
          el('h2', { textContent: category }),
          el('ul', {}, sites.map(renderSite)),
        ]),
      ),
    )
    if (visible.length === 0) results.append(el('p', { textContent: 'No sites match.' }))
  }

  render()
  const unsubscribe = store.subscribe(render)
  parent.append(root)
  return () => {
    unsubscribe()
    root.remove()
  }
}
