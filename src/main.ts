import './ui/basic.css'
import { sites } from 'virtual:sites'
import { getTheme, THEMES } from './themes'
import type { Theme } from './themes/types'
import {
  hasWebGL,
  loadStoredTheme,
  prefersBasic,
  prefersReducedMotion,
  resolveThemeId,
  saveTheme,
} from './themes/preference'
import { resultsMessage } from './ui/filter'
import { createListView } from './ui/list'
import { createLiveRegion } from './ui/live-region'
import { createStore } from './ui/store'
import { createThemeSwitcher } from './ui/theme-switcher'

const app = document.getElementById('app')
if (app) {
  const store = createStore(sites)
  const announce = createLiveRegion(app)
  store.subscribe((state) => announce(resultsMessage(state.visible.length)))

  const initial = getTheme(
    resolveThemeId({ search: location.search, stored: loadStoredTheme(), webgl: hasWebGL() }),
  )

  const reducedMotion = prefersReducedMotion((query) => window.matchMedia(query))
  let generation = 0

  // three.js must only ever be reached via dynamic import() from the scene path.
  const mount = (theme: Theme): (() => void) => {
    if (theme.presentation === 'list') return createListView(app, store, sites)
    const token = ++generation
    let dispose: (() => void) | undefined
    let cancelled = false
    void import('./ui/scene-mount')
      .then(({ mountScene }) => {
        if (cancelled || token !== generation) return
        dispose = mountScene({ parent: app, store, sites, theme, reducedMotion })
      })
      .catch(() => {
        if (cancelled) return
        dispose = createListView(app, store, sites)
      })
    return () => {
      cancelled = true
      dispose?.()
    }
  }
  let unmount = mount(initial)

  const switcher = createThemeSwitcher({
    themes: THEMES,
    current: initial.id,
    suggestBasic: prefersBasic((query) => window.matchMedia(query)),
    onSelect: (id) => {
      saveTheme(id)
      app.dataset.theme = id
      unmount()
      unmount = mount(getTheme(id))
    },
  })
  app.prepend(switcher.element)
  app.dataset.theme = initial.id
  app.dataset.sites = String(store.get().visible.length)
}
