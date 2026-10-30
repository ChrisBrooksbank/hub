import './ui/app.css'
import { sites } from 'virtual:sites'
import { createFavourites } from './ui/favourites'
import { resultsMessage } from './ui/filter'
import { createListView } from './ui/list'
import { createLiveRegion } from './ui/live-region'
import { createStore } from './ui/store'
import { createPwaBar } from './ui/pwa-bar'
import { createToolbar } from './ui/toolbar'
import { startPwa } from './pwa'
import {
  hasWebGL,
  loadStoredView,
  prefersReducedMotion,
  resolveView,
  saveView,
  type View,
} from './ui/view-preference'

const app = document.getElementById('app')
if (app) {
  const favourites = createFavourites()
  const store = createStore(sites, favourites)
  const announce = createLiveRegion(app)
  store.subscribe((state) => announce(resultsMessage(state.visible.length)))

  const reducedMotion = prefersReducedMotion((query) => window.matchMedia(query))
  const webgl = hasWebGL()
  let view = resolveView({ search: location.search, stored: loadStoredView(), webgl })
  let shuffle = (): void => {}

  const stage = document.createElement('main')
  stage.className = 'stage'

  // three.js must only ever be reached via dynamic import() from the table path.
  const mount = (next: View): (() => void) => {
    stage.className = `stage stage--${next}`
    if (next === 'list') {
      shuffle = () => {}
      return createListView(stage, store, favourites)
    }
    let cancelled = false
    let dispose: (() => void) | undefined
    void import('./table/mount')
      .then(({ mountTable }) => {
        if (cancelled) return
        const mounted = mountTable({
          parent: stage,
          store,
          favourites,
          sites,
          reducedMotion,
          handSize: window.matchMedia('(max-width: 700px)').matches ? 12 : undefined,
        })
        shuffle = mounted.shuffle
        dispose = mounted.dispose
      })
      .catch(() => {
        if (cancelled) return
        stage.className = 'stage stage--list'
        toolbar.setView('list')
        dispose = createListView(stage, store, favourites)
      })
    return () => {
      cancelled = true
      dispose?.()
    }
  }

  let unmount = (): void => {}
  const toolbar = createToolbar({
    store,
    sites,
    favourites,
    view,
    onShuffle: () => shuffle(),
    onView: (next) => {
      if (next === view || (next === 'table' && !webgl)) return
      view = next
      saveView(next)
      toolbar.setView(next)
      unmount()
      unmount = mount(next)
    },
  })
  app.prepend(toolbar.element)
  app.append(stage)
  unmount = mount(view)
  app.dataset.view = view

  const pwaBar = createPwaBar(app)
  startPwa({
    onInstallAvailable: (install) => pwaBar.showInstall(install),
    onInstalled: () => pwaBar.hide(),
    onUpdateReady: (apply) => pwaBar.showUpdate(apply),
  })
  app.dataset.sites = String(store.get().visible.length)
}
