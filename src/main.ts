import './ui/basic.css'
import { sites } from 'virtual:sites'
import { resultsMessage } from './ui/filter'
import { createListView } from './ui/list'
import { createLiveRegion } from './ui/live-region'
import { createStore } from './ui/store'

const app = document.getElementById('app')
if (app) {
  const store = createStore(sites)
  const announce = createLiveRegion(app)
  store.subscribe((state) => announce(resultsMessage(state.visible.length)))
  createListView(app, store, sites)
  app.dataset.sites = String(store.get().visible.length)
}
