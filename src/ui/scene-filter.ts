import type { Site } from '../data/schema'
import type { Store } from './store'

/** The slice of CardField the filter binding needs. */
export interface FilterableField {
  applyFilter(matching: ReadonlySet<string>, instant?: boolean): void
}

/**
 * Visually hidden list of every site, present in the DOM while the 3D scene is shown.
 * Sites the filter excludes are marked `hidden`, so assistive tech and keyboard users
 * see the same set the scene highlights. Returns the list element and a dispose function.
 */
export function createSceneSiteList(
  parent: HTMLElement,
  store: Store,
  allSites: readonly Site[],
): { element: HTMLElement; dispose: () => void } {
  const nav = document.createElement('nav')
  nav.className = 'visually-hidden'
  nav.setAttribute('aria-label', 'All sites')
  Object.assign(nav.style, {
    position: 'absolute',
    width: '1px',
    height: '1px',
    overflow: 'hidden',
    clip: 'rect(0 0 0 0)',
    whiteSpace: 'nowrap',
  })
  const list = document.createElement('ul')
  const items = new Map<string, HTMLLIElement>()
  for (const site of allSites) {
    const link = document.createElement('a')
    link.href = site.url
    link.rel = 'noopener'
    link.textContent = site.status === 'dead' ? `${site.name} (may be offline)` : site.name
    const item = document.createElement('li')
    item.dataset.category = site.category
    item.append(link)
    items.set(site.id, item)
    list.append(item)
  }
  nav.append(list)

  const sync = (): void => {
    const visible = new Set(store.get().visible.map((site) => site.id))
    for (const [id, item] of items) item.hidden = !visible.has(id)
  }
  sync()
  const unsubscribe = store.subscribe(sync)
  parent.append(nav)
  return {
    element: nav,
    dispose: () => {
      unsubscribe()
      nav.remove()
    },
  }
}

/**
 * Keeps the scene's dimming in step with the store. Applies the current filter at once
 * (no fade) and then fades on each change, or jumps when `reducedMotion()` is true.
 */
export function bindSceneFilter(
  store: Store,
  field: FilterableField,
  reducedMotion: () => boolean = () => false,
): () => void {
  const apply = (instant: boolean): void =>
    field.applyFilter(new Set(store.get().visible.map((site) => site.id)), instant)
  apply(true)
  return store.subscribe(() => apply(reducedMotion()))
}
