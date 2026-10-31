import type { Site } from '../data/schema'
import type { Favourites } from '../ui/favourites'
import { createDetailPanel } from '../ui/detail-panel'
import { bindSceneFilter, createSceneSiteList } from '../ui/scene-filter'
import type { Store } from '../ui/store'
import { PROFILE, profileLinks } from '../profile'
import { isJoker } from './jokers'
import { createTable } from './table'

export interface TableMountOptions {
  parent: HTMLElement
  store: Store
  favourites: Favourites
  sites: readonly Site[]
  reducedMotion: boolean
  /** Cards per hand on a small screen; omit to show every card at once. */
  handSize?: number
}

export interface TableMount {
  shuffle(): void
  dispose(): void
}

const HASH_PREFIX = '#/site/'

function idFromHash(): string | null {
  return location.hash.startsWith(HASH_PREFIX)
    ? decodeURIComponent(location.hash.slice(HASH_PREFIX.length))
    : null
}

function writeHash(id: string | null): void {
  const hash = id ? `${HASH_PREFIX}${encodeURIComponent(id)}` : ''
  history.replaceState(null, '', `${location.pathname}${location.search}${hash}`)
}

/**
 * Composes the card table with its detail panel, filter binding, `#/site/<id>` deep links and
 * a hidden list of links for assistive tech. Imports three.js, so reach it via dynamic `import()`.
 */
export function mountTable(options: TableMountOptions): TableMount {
  const { parent, store, favourites, sites, reducedMotion } = options
  const byId = new Map(sites.map((site) => [site.id, site]))
  let openId: string | null = null

  const show = (id: string | null): void => {
    const joker = id !== null && isJoker(id)
    const site = id && !joker ? byId.get(id) : undefined
    const next = joker ? id : (site?.id ?? null)
    if (next === openId) return
    openId = next
    table.select(next)
    if (joker) {
      panel.openAbout({
        name: PROFILE.name,
        text: `${PROFILE.tagline} ${PROFILE.scope}`,
        links: profileLinks(),
        photo: PROFILE.photo,
      })
    } else if (site) panel.open(site)
    else panel.close()
  }

  const more = document.createElement('button')
  more.type = 'button'
  more.className = 'deal-more'
  more.hidden = true
  more.addEventListener('click', () => table.dealMore())
  parent.append(more)

  const table = createTable({
    parent,
    sites,
    reducedMotion,
    handSize: options.handSize,
    onRemaining: (remaining) => {
      more.hidden = remaining <= 0
      more.textContent = `Deal ${Math.min(remaining, options.handSize ?? remaining)} more (${remaining} left in the deck)`
    },
    favourites: favourites.ids(),
    onChip: (category) =>
      store.setFilter({ category: store.get().filter.category === category ? null : category }),
    onSelect: (id) => {
      writeHash(id)
      show(id)
    },
  })
  const panel = createDetailPanel(parent, {
    favourites,
    onClose: () => {
      openId = null
      table.select(null)
      writeHash(null)
    },
  })
  const list = createSceneSiteList(parent, store, sites)
  const unbindFilter = bindSceneFilter(
    store,
    {
      applyFilter: (ids, instant) => {
        const { query, category, favouritesOnly } = store.get().filter
        const unfiltered = !query && category === null && !favouritesOnly
        table.setMatching(ids, instant, { showJokers: unfiltered, limited: unfiltered })
        if (openId && (isJoker(openId) ? !unfiltered : !ids.has(openId))) {
          writeHash(null)
          show(null)
        }
      },
    },
    () => reducedMotion,
  )
  const legend = document.createElement('p')
  legend.className = 'legend'
  legend.textContent = PROFILE.scope
  legend.hidden = sites.every((site) => site.url)
  parent.append(legend)
  const syncCategory = (): void => table.setCategory(store.get().filter.category)
  syncCategory()
  const unsubscribeCategory = store.subscribe(syncCategory)
  const unsubscribeFavourites = favourites.subscribe(() => table.setFavourites(favourites.ids()))
  const onHashChange = (): void => show(idFromHash())
  window.addEventListener('hashchange', onHashChange)
  show(idFromHash())

  return {
    shuffle: () => {
      writeHash(null)
      show(null)
      table.shuffle()
    },
    dispose: () => {
      window.removeEventListener('hashchange', onHashChange)
      unbindFilter()
      unsubscribeFavourites()
      unsubscribeCategory()
      list.dispose()
      legend.remove()
      more.remove()
      panel.dispose()
      table.dispose()
    },
  }
}
