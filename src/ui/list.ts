import type { Site } from '../data/schema'
import { artDataUrl } from '../engine/procedural-art'
import { categoriesOf } from './filter'
import { PROFILE, profileLinks } from '../profile'
import type { Favourites } from './favourites'
import { repoUrl } from './links'
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

function renderSite(site: Site, favourites: Favourites): HTMLLIElement {
  const title = el('h3', {}, [
    site.url ? el('a', { href: site.url, textContent: site.name, rel: 'noopener' }) : site.name,
  ])
  const item = el('li', { className: site.url ? 'site' : 'site site--nodemo' }, [title])
  const generated = site.thumbMode === 'generated' || !site.thumb
  const src = generated ? artDataUrl(site.id, site.accent) : site.thumb
  if (src) {
    const alt = generated ? `Generated artwork for ${site.name}` : `Screenshot of ${site.name}`
    const img = el('img', { src, alt, loading: 'lazy' })
    if (!generated) {
      img.addEventListener(
        'error',
        () => {
          const art = artDataUrl(site.id, site.accent)
          if (art) Object.assign(img, { src: art, alt: `Generated artwork for ${site.name}` })
          else img.remove()
        },
        { once: true },
      )
    }
    item.prepend(img)
  }
  if (site.description) item.append(el('p', { textContent: site.description }))
  if (site.status === 'dead')
    item.append(el('p', { className: 'offline', textContent: 'May be offline' }))
  const favourite = favourites.has(site.id)
  const heart = el('button', {
    type: 'button',
    className: 'fav',
    textContent: favourite ? '★ Favourite' : '☆ Favourite',
  })
  heart.setAttribute('aria-pressed', String(favourite))
  heart.setAttribute('aria-label', `Favourite ${site.name}`)
  heart.addEventListener('click', () => favourites.toggle(site.id))
  item.append(heart)
  if (!site.url && site.repo) {
    item.append(
      el('a', { href: repoUrl(site.repo), textContent: 'View source on GitHub', rel: 'noopener' }),
    )
  }
  return item
}

/**
 * Semantic, framework-free list view. Renders the store's visible sites grouped by
 * category; the toolbar owns search and filtering. Returns a dispose function.
 */
export function createListView(
  parent: HTMLElement,
  store: Store,
  favourites: Favourites,
): () => void {
  const root = el('div', { className: 'list-view' })

  const render = (): void => {
    const { visible } = store.get()
    root.replaceChildren(
      ...[
        ...groupByCategory(visible.filter((site) => site.url)),
        ['No live demo yet', visible.filter((site) => !site.url)] as [string, Site[]],
      ]
        .filter(([, sites]) => sites.length > 0)
        .map(([category, sites]) =>
          el('section', {}, [
            el('h2', { textContent: category }),
            el(
              'ul',
              {},
              sites.map((site) => renderSite(site, favourites)),
            ),
          ]),
        ),
    )
    if (visible.length === 0) root.append(el('p', { textContent: 'No sites match.' }))
    root.append(
      el('footer', { className: 'credit' }, [
        `${PROFILE.credit} `,
        ...profileLinks().flatMap((link, index) => [
          index > 0 ? ' · ' : '',
          el('a', { href: link.href, textContent: link.label, rel: 'noopener', target: '_blank' }),
        ]),
      ]),
    )
  }

  render()
  const unsubscribe = store.subscribe(render)
  const unsubscribeFavourites = favourites.subscribe(render)
  parent.append(root)
  return () => {
    unsubscribe()
    unsubscribeFavourites()
    root.remove()
  }
}
