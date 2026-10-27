import './ui/basic.css'
import { sites } from 'virtual:sites'
import { getTheme, THEMES } from './themes'
import {
  hasWebGL,
  loadStoredTheme,
  prefersBasic,
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

  // The scene engine does not exist yet, so every theme currently mounts the list view.
  // three.js must only ever be reached via dynamic import() from the scene path.
  const mount = (): (() => void) => createListView(app, store, sites)
  let unmount = mount()

  const switcher = createThemeSwitcher({
    themes: THEMES,
    current: initial.id,
    suggestBasic: prefersBasic((query) => window.matchMedia(query)),
    onSelect: (id) => {
      saveTheme(id)
      app.dataset.theme = id
      unmount()
      unmount = mount()
    },
  })
  app.prepend(switcher.element)
  app.dataset.theme = initial.id
  app.dataset.sites = String(store.get().visible.length)
}
