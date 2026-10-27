import './scene.css'
import type { Site } from '../data/schema'
import { CardField } from '../engine/cards'
import { attachPointerControls, GalleryControls } from '../engine/controls'
import { KeyboardNav } from '../engine/keyboard'
import {
  FrameMonitor,
  initialTier,
  QUALITY,
  readDevice,
  type QualitySettings,
} from '../engine/quality'
import { LAYOUTS } from '../engine/layout/strategies'
import { SceneEngine } from '../engine/scene-engine'
import { SelectionController } from '../engine/selection'
import { ThemeApplier } from '../engine/theme-applier'
import type { Theme } from '../themes/types'
import { createDetailPanel } from './detail-panel'
import { createSceneSiteList, bindSceneFilter } from './scene-filter'
import type { Store } from './store'

export interface SceneMountOptions {
  parent: HTMLElement
  store: Store
  sites: readonly Site[]
  theme: Theme
  reducedMotion: boolean
}

/** Distance from the card ring to the camera in the overview. */
const CAMERA_OFFSET = 10

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<HTMLElementTagNameMap[K]> = {},
): HTMLElementTagNameMap[K] {
  return Object.assign(document.createElement(tag), props)
}

function createControlsBar(
  store: Store,
  sites: readonly Site[],
  theme: Theme,
): { element: HTMLElement; dispose: () => void } {
  const bar = el('div', { className: 'scene-controls' })
  const search = el('input', {
    type: 'search',
    id: 'scene-search',
    placeholder: theme.copy.searchPlaceholder,
    autocomplete: 'off',
  })
  search.setAttribute('aria-label', 'Search sites')
  search.addEventListener('input', () => store.setFilter({ query: search.value }))

  const group = el('div', { role: 'group' })
  group.setAttribute('aria-label', 'Filter by category')
  group.style.display = 'contents'
  const buttons = new Map<string | null, HTMLButtonElement>()
  for (const category of [null, ...new Set(sites.map((site) => site.category))]) {
    const button = el('button', { type: 'button', textContent: category ?? 'All' })
    button.addEventListener('click', () => store.setFilter({ category }))
    buttons.set(category, button)
    group.append(button)
  }
  const sync = (): void => {
    const { category } = store.get().filter
    buttons.forEach((button, value) =>
      button.setAttribute('aria-pressed', String(value === category)),
    )
  }
  sync()
  const unsubscribe = store.subscribe(sync)
  bar.append(search, group)
  return { element: bar, dispose: unsubscribe }
}

/**
 * Composes the 3D scene: engine, cards, controls, selection, detail panel, theme and keyboard
 * navigation. Imports three.js, so callers must reach this module via dynamic `import()`.
 * Returns a dispose function that releases everything.
 */
export function mountScene(options: SceneMountOptions): () => void {
  const { parent, store, sites, theme, reducedMotion } = options
  const root = el('div', { className: 'scene-root' })
  parent.append(root)

  const layout = LAYOUTS[theme.layout.strategy]({
    minRadius: theme.layout.radius,
    ...(theme.layout.strategy === 'ring' ? { bandHeight: theme.layout.bandHeight } : {}),
  }).place(sites)

  let quality: QualitySettings = QUALITY[initialTier(readDevice())]
  const engine = new SceneEngine({ container: root, pixelRatio: quality.pixelRatio })
  const applier = new ThemeApplier({ scene: engine.scene, cssTarget: root, reducedMotion })
  applier.apply(theme)

  engine.camera.position.set(0, 0, layout.radius + CAMERA_OFFSET)
  engine.camera.lookAt(0, 0, 0)

  const field = new CardField(sites, layout.placements)
  engine.scene.add(field.group)

  const canvasEl = engine.domElement
  const setQuality = (tier: 'high' | 'low'): void => {
    quality = QUALITY[tier]
    engine.setPixelRatio(Math.min(quality.pixelRatio, globalThis.devicePixelRatio ?? 1))
    canvasEl.dataset.quality = tier
  }
  setQuality(quality === QUALITY.low ? 'low' : 'high')
  const monitor = new FrameMonitor(() => setQuality('low'))

  const controls = new GalleryControls({ reducedMotion, autoRotateSpeed: theme.motion.idleSpeed })
  const canvas = engine.domElement
  const detachPointer = attachPointerControls(canvas, controls)

  const panel = createDetailPanel(root, { onClose: () => selection.clear() })
  const selection: SelectionController = new SelectionController({
    field,
    camera: engine.camera,
    controls,
    element: canvas,
    onChange: (site) => (site ? panel.open(site) : panel.close()),
  })
  const keyboard = new KeyboardNav({
    canvas,
    selection,
    placements: layout.placements,
    getMatching: () => new Set(store.get().visible.map((site) => site.id)),
    siteCount: () => sites.length,
  })

  const bar = createControlsBar(store, sites, theme)
  root.append(bar.element)
  const list = createSceneSiteList(root, store, sites)
  const unbindFilter = bindSceneFilter(store, field, () => reducedMotion)

  engine.onFrame((delta) => {
    if (!monitor.finished && quality !== QUALITY.low) monitor.update(delta)
    controls.update(delta)
    field.group.rotation.y = controls.angle
    field.group.position.y = controls.axis
    canvas.dataset.rotation = controls.angle.toFixed(4)
    selection.update(delta)
    field.update(delta)
    applier.update(delta)
  })
  engine.start()
  selection.syncFromHash()

  return () => {
    engine.stop()
    unbindFilter()
    list.dispose()
    keyboard.dispose()
    selection.dispose()
    panel.dispose()
    detachPointer()
    bar.dispose()
    field.dispose()
    applier.dispose()
    engine.dispose()
    root.remove()
  }
}
