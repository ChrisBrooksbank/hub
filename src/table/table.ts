import {
  CanvasTexture,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Raycaster,
  SRGBColorSpace,
  Vector2,
} from 'three'
import type { Site } from '../data/schema'
import { SceneEngine } from '../engine/scene-engine'
import { drawCardFace, FACE_HEIGHT, FACE_WIDTH } from './card-art'
import { BACKS, drawCardBack, pickBack } from './card-backs'
import { createDecor } from './decor'
import { drawJokerFace, isJoker, JOKERS, jokerVariant } from './jokers'
import { PROFILE } from '../profile'
import {
  CAMERA_PITCH,
  CARD_HEIGHT,
  CARD_WIDTH,
  fitDistance,
  spreadLayout,
  tableArea,
  type Slot,
} from './layout'

export interface TableOptions {
  parent: HTMLElement
  sites: readonly Site[]
  reducedMotion: boolean
  /** Ids of the visitor's favourites, shown with a star. */
  favourites: ReadonlySet<string>
  /** Cards dealt at a time on a small screen; omit to deal everything. */
  handSize?: number
  /** Called with how many matching cards are still in the deck (to offer "deal more"). */
  onRemaining?: (remaining: number) => void
  /** Called when the visitor picks a card, or clicks the bare table (null). */
  onSelect: (id: string | null) => void
}

export interface MatchOptions {
  /** The Jokers join the spread only when nothing is filtered (default true). */
  showJokers?: boolean
  /** Apply the hand size (default true); filtered views show every match. */
  limited?: boolean
}

export interface Table {
  /** Cards outside `ids` are gathered into the deck; the rest spread out. */
  setMatching(ids: ReadonlySet<string>, instant?: boolean, options?: MatchOptions): void
  /** Deals another hand from the deck. */
  dealMore(): void
  /** Raises a card and centres the view on it; does not call `onSelect`. */
  select(id: string | null): void
  /** Stars the given favourites on their faces. */
  setFavourites(ids: ReadonlySet<string>): void
  /** Gathers every card into the deck, then deals them out in a new order. */
  shuffle(): void
  dispose(): void
}

interface Pose {
  x: number
  y: number
  z: number
  yaw: number
  /** 0 face up, π face down. */
  flip: number
  scale: number
}

interface TableCard {
  site: Site
  root: Group
  face: Mesh
  faceMaterial: MeshBasicMaterial
  flipper: Group
  shadow: Mesh
  shadowMaterial: MeshBasicMaterial
  base: Pose
  target: Pose
  current: Pose
  /** Scene time before which the card holds still, so a deal ripples across the table. */
  startAt: number
  /** A project with no live demo: drawn smaller, greyer and dimmer. */
  muted: boolean
  /** Brightness before the lamp falloff: dimmed when another card is selected. */
  bright: number
  backMaterial: MeshBasicMaterial
  /** Redraws the face (favourite star, loaded screenshot). */
  repaint: () => void
}

const PITCH = CAMERA_PITCH * (Math.PI / 180)
const FLIP_LIFT = 1.4
const HOVER_LIFT = 0.8
const HOVER_SCALE = 1.1
const SELECT_LIFT = 2.6
const SELECT_SCALE = 1.45
const DECK_STEP = 0.045
const DEAL_STAGGER = 0.045
const SETTLE_RATE = 9
const DIM = 0.55
/** Felt shown beyond the outermost cards, so the rail and props frame them. */
const CAMERA_MARGIN = 2.6
const MUTED_SCALE = 0.88
const MUTED_BRIGHTNESS = 0.74
const DRAG_THRESHOLD = 6
const ZOOM_MIN = 0.35
const ZOOM_MAX = 1.5

const lerp = (from: number, to: number, t: number): number => from + (to - from) * t

function poseOf(x = 0, z = 0): Pose {
  return { x, y: 0, z, yaw: 0, flip: Math.PI, scale: 1 }
}

function canvasOf(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

function textureOf(canvas: HTMLCanvasElement): CanvasTexture {
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

function shadowTexture(): CanvasTexture {
  const canvas = canvasOf(128, 176)
  const context = canvas.getContext('2d')
  if (context) {
    context.filter = 'blur(10px)'
    context.fillStyle = '#000'
    context.fillRect(20, 20, 88, 136)
  }
  return textureOf(canvas)
}

/** The card table: a deck that deals into a spread of cards you can hover, pan, zoom and pick. */
export function createTable(options: TableOptions): Table {
  const { parent, sites, reducedMotion, onSelect } = options
  const handSize = options.handSize ?? Infinity
  let limit = handSize
  let limited = true
  let favourites = options.favourites
  const engine = new SceneEngine({ container: parent, background: '#0b0806' })
  const { scene, camera } = engine
  const canvas = engine.domElement
  canvas.setAttribute('role', 'img')
  canvas.setAttribute(
    'aria-label',
    'Table of cards, one per site, all built by Chris Brooksbank. A list of the same sites follows, or switch to the list view.',
  )
  canvas.classList.add('table-canvas')

  const decor = createDecor(scene, reducedMotion)

  const cardGeometry = new PlaneGeometry(CARD_WIDTH, CARD_HEIGHT)
  const shadowGeometry = new PlaneGeometry(CARD_WIDTH * 1.18, CARD_HEIGHT * 1.14)
  const shadowMap = shadowTexture()
  const backCanvas = canvasOf(FACE_WIDTH, FACE_HEIGHT)
  const forcedBack = new URLSearchParams(location.search).get('back')
  let backDesign = BACKS.find((back) => back.id === forcedBack) ?? pickBack(Math.random())
  drawCardBack(backCanvas, backDesign)
  canvas.dataset.back = backDesign.id
  const backMap = textureOf(backCanvas)

  const entries: readonly Site[] = [...sites, ...JOKERS]
  const portrait: { image?: HTMLImageElement } = {}
  const cards = new Map<string, TableCard>()
  for (const site of entries) {
    const faceCanvas = canvasOf(FACE_WIDTH, FACE_HEIGHT)
    let image: HTMLImageElement | undefined
    const muted = !site.url && !isJoker(site.id)
    const paint = (): void => {
      if (isJoker(site.id)) drawJokerFace(faceCanvas, jokerVariant(site.id), portrait.image)
      else drawCardFace(faceCanvas, site, image, favourites.has(site.id), muted)
    }
    const repaint = (): void => {
      paint()
      faceMap.needsUpdate = true
    }
    paint()
    const faceMap = textureOf(faceCanvas)
    const faceMaterial = new MeshBasicMaterial({ map: faceMap, alphaTest: 0.5 })
    const face = new Mesh(cardGeometry, faceMaterial)
    face.rotation.x = -Math.PI / 2
    const backMaterial = new MeshBasicMaterial({ map: backMap, alphaTest: 0.5 })
    const back = new Mesh(cardGeometry, backMaterial)
    back.rotation.x = Math.PI / 2
    const flipper = new Group()
    flipper.add(face, back)
    const root = new Group()
    root.add(flipper)
    const shadowMaterial = new MeshBasicMaterial({
      map: shadowMap,
      transparent: true,
      depthWrite: false,
    })
    const shadow = new Mesh(shadowGeometry, shadowMaterial)
    shadow.rotation.x = -Math.PI / 2
    shadow.position.y = -0.005
    shadow.renderOrder = -1
    scene.add(shadow, root)
    cards.set(site.id, {
      site,
      root,
      face,
      faceMaterial,
      flipper,
      shadow,
      shadowMaterial,
      base: poseOf(),
      target: poseOf(),
      current: poseOf(),
      startAt: 0,
      muted,
      bright: 1,
      backMaterial,
      repaint,
    })
    if (site.thumb && site.thumbMode !== 'generated') {
      const loading = new Image()
      loading.decoding = 'async'
      loading.addEventListener('load', () => {
        image = loading
        repaint()
      })
      loading.src = site.thumb
    }
  }

  const portraitLoader = new Image()
  portraitLoader.addEventListener('load', () => {
    portrait.image = portraitLoader
    for (const joker of JOKERS) cards.get(joker.id)?.repaint()
  })
  portraitLoader.src = PROFILE.photo

  // The Jokers sit a quarter and three quarters of the way through the deck.
  let order = sites.filter((site) => site.url).map((site) => site.id)
  order.splice(Math.floor(order.length / 4), 0, JOKERS[0]!.id)
  order.splice(Math.floor((order.length * 3) / 4), 0, JOKERS[1]!.id)
  order.push(...sites.filter((site) => !site.url).map((site) => site.id))
  if (Number.isFinite(handSize)) order = [...order].sort(() => Math.random() - 0.5)
  let matching: ReadonlySet<string> = new Set(order)
  let gathered = true
  let selectedId: string | null = null
  let hoverId: string | null = null
  let clock = 0
  let disposed = false
  let dealTimer: ReturnType<typeof setTimeout> | undefined

  // View: the point on the table the camera looks at, how far back it sits, and the visitor's zoom.
  const view = { x: 0, z: 0, dist: 20 }
  const viewTarget = { x: 0, z: 0, dist: 20 }
  const bounds = { centerX: 0, centerZ: 0, width: 20, depth: 15 }
  let pan = { x: 0, z: 0 }
  let zoom = 1
  /** Camera distance that shows the whole spread; the visitor's zoom scales it. */
  let fit = 20
  let lastAspect = 0
  let decorKey = ''

  const slotFor = (slot: Slot): Pose => ({
    x: slot.x,
    y: 0,
    z: slot.z,
    yaw: slot.yaw,
    flip: 0,
    scale: 1,
  })

  const arrange = (stagger: boolean): void => {
    const aspect = camera.aspect
    lastAspect = aspect
    const matches = order.filter((id) => matching.has(id))
    const capacity = limited ? Math.min(limit, matches.length) : matches.length
    const shown = gathered ? [] : matches.slice(0, capacity)
    const sample = shown.length > 0 ? shown.length : Math.max(1, capacity)
    const spread = spreadLayout(sample, aspect)
    const area = tableArea(Math.max(1, capacity), aspect)
    const key = `${aspect.toFixed(2)}:${capacity}`
    if (decorKey !== key) {
      decorKey = key
      decor.rebuild(area)
    }
    options.onRemaining?.(matches.length - capacity)
    const { deckX, deckZ } = area

    // What the camera frames: the cards on show, the deck's place and a peek of the margin.
    let minX = -spread.width / 2
    let maxX = spread.width / 2
    let minZ = -spread.depth / 2
    let maxZ = spread.depth / 2
    minX = Math.min(minX, deckX - CARD_WIDTH / 2)
    maxX = Math.max(maxX, deckX + CARD_WIDTH / 2)
    minZ = Math.min(minZ, deckZ - CARD_HEIGHT / 2)
    maxZ = Math.max(maxZ, deckZ + CARD_HEIGHT / 2)
    bounds.centerX = (minX + maxX) / 2
    bounds.centerZ = (minZ + maxZ) / 2
    bounds.width = maxX - minX + CAMERA_MARGIN * 2
    bounds.depth = maxZ - minZ + CAMERA_MARGIN * 2

    let deckIndex = 0
    let dealIndex = 0
    for (const id of order) {
      const card = cards.get(id)
      if (!card) continue
      const slotIndex = shown.indexOf(id)
      if (slotIndex >= 0) {
        const slot = spread.slots[slotIndex]
        card.base = slot ? slotFor(slot) : poseOf()
        if (card.muted) card.base.scale = MUTED_SCALE
        card.startAt = stagger && !reducedMotion ? clock + dealIndex++ * DEAL_STAGGER : 0
      } else {
        const jitter = ((deckIndex * 7919) % 13) / 13 - 0.5
        card.base = {
          x: deckX + jitter * 0.12,
          y: deckIndex * DECK_STEP,
          z: deckZ - jitter * 0.1,
          yaw: jitter * 0.12,
          flip: Math.PI,
          scale: 1,
        }
        card.startAt = stagger && !reducedMotion ? clock + deckIndex * 0.012 : 0
        deckIndex++
      }
    }
    refreshTargets()

    fit = fitDistance({
      aspect,
      viewportHeight: canvas.clientHeight || 800,
      width: bounds.width,
      depth: bounds.depth,
    })
    const chosen = selectedId && shown.includes(selectedId) ? cards.get(selectedId) : undefined
    if (chosen) pan = { x: chosen.base.x - bounds.centerX, z: chosen.base.z - bounds.centerZ }
    clampPan()
    applyViewTarget()
  }

  const refreshTargets = (): void => {
    for (const [id, card] of cards) {
      const lifted = id === selectedId ? SELECT_LIFT : id === hoverId ? HOVER_LIFT : 0
      const scale = id === selectedId ? SELECT_SCALE : id === hoverId ? HOVER_SCALE : 1
      const raised = card.base.flip === 0
      card.target = {
        ...card.base,
        y: card.base.y + (raised ? lifted : 0),
        scale: raised ? card.base.scale * scale : card.base.scale,
      }
      card.bright =
        (selectedId !== null && id !== selectedId ? DIM : 1) *
        (card.muted && id !== hoverId ? MUTED_BRIGHTNESS : 1)
    }
  }

  const clampPan = (): void => {
    pan = {
      x: MathUtils.clamp(pan.x, -bounds.width / 2, bounds.width / 2),
      z: MathUtils.clamp(pan.z, -bounds.depth / 2, bounds.depth / 2),
    }
  }

  const applyViewTarget = (): void => {
    viewTarget.x = bounds.centerX + pan.x
    // On a phone the detail sheet covers the lower half, so lift the selected card above it.
    const sheet = selectedId && camera.aspect < 1 ? fit * zoom * 0.3 : 0
    viewTarget.z = bounds.centerZ + pan.z + sheet
    viewTarget.dist = fit * zoom
    if (reducedMotion || clock === 0) Object.assign(view, viewTarget)
  }

  const placeCamera = (): void => {
    camera.position.set(view.x, Math.sin(PITCH) * view.dist, view.z + Math.cos(PITCH) * view.dist)
    camera.lookAt(view.x, 0, view.z)
  }

  const settle = (delta: number): void => {
    const t = reducedMotion ? 1 : 1 - Math.exp(-SETTLE_RATE * delta)
    view.x = lerp(view.x, viewTarget.x, t)
    view.z = lerp(view.z, viewTarget.z, t)
    view.dist = lerp(view.dist, viewTarget.dist, t)
    for (const card of cards.values()) {
      if (clock < card.startAt) continue
      const { current, target } = card
      current.x = lerp(current.x, target.x, t)
      current.y = lerp(current.y, target.y, t)
      current.z = lerp(current.z, target.z, t)
      current.yaw = lerp(current.yaw, target.yaw, t)
      current.flip = lerp(current.flip, target.flip, t)
      current.scale = lerp(current.scale, target.scale, t)
      const lift = current.y + Math.sin(current.flip) * FLIP_LIFT
      card.root.position.set(current.x, lift, current.z)
      const light = card.bright * decor.lamp(current.x, current.z)
      card.faceMaterial.color.setScalar(light)
      card.backMaterial.color.setScalar(light)
      card.root.rotation.y = current.yaw
      card.root.scale.setScalar(current.scale)
      card.flipper.rotation.z = current.flip
      card.shadow.position.set(current.x + lift * 0.3, -0.005, current.z + lift * 0.45)
      card.shadow.rotation.z = -current.yaw
      card.shadow.scale.setScalar(current.scale)
      card.shadowMaterial.opacity = Math.max(0.12, 0.5 - lift * 0.07)
    }
  }

  const raycaster = new Raycaster()
  const pointer = new Vector2()
  const pick = (clientX: number, clientY: number): string | null => {
    const rect = canvas.getBoundingClientRect()
    pointer.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    )
    scene.updateMatrixWorld()
    raycaster.setFromCamera(pointer, camera)
    const hits = raycaster.intersectObjects(
      [...cards.values()].filter((c) => !gathered && matching.has(c.site.id)).map((c) => c.face),
      false,
    )
    const hit = hits[0]
    if (!hit) return null
    for (const card of cards.values()) if (card.face === hit.object) return card.site.id
    return null
  }

  const setHover = (id: string | null): void => {
    if (id === hoverId) return
    hoverId = id
    canvas.style.cursor = id ? 'pointer' : 'grab'
    refreshTargets()
  }

  const pointers = new Map<number, { x: number; y: number }>()
  let dragged = false
  let pinchDistance = 0
  let downAt = { x: 0, y: 0 }

  const worldPerPixel = (): number =>
    (2 * view.dist * Math.tan((engine.camera.fov / 2) * (Math.PI / 180))) /
    Math.max(1, canvas.clientHeight)

  const onPointerDown = (event: PointerEvent): void => {
    canvas.setPointerCapture(event.pointerId)
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (pointers.size === 1) {
      dragged = false
      downAt = { x: event.clientX, y: event.clientY }
    }
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()] as [{ x: number; y: number }, { x: number; y: number }]
      pinchDistance = Math.hypot(a.x - b.x, a.y - b.y)
      dragged = true
    }
  }

  const onPointerMove = (event: PointerEvent): void => {
    const previous = pointers.get(event.pointerId)
    if (!previous) {
      if (event.pointerType === 'mouse') setHover(pick(event.clientX, event.clientY))
      return
    }
    if (pointers.size >= 2) {
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
      const [a, b] = [...pointers.values()] as [{ x: number; y: number }, { x: number; y: number }]
      const distance = Math.hypot(a.x - b.x, a.y - b.y)
      if (pinchDistance > 0 && distance > 0) {
        zoom = MathUtils.clamp(zoom * (pinchDistance / distance), ZOOM_MIN, ZOOM_MAX)
        applyViewTarget()
      }
      pinchDistance = distance
      return
    }
    if (
      !dragged &&
      Math.hypot(event.clientX - downAt.x, event.clientY - downAt.y) < DRAG_THRESHOLD
    ) {
      return
    }
    dragged = true
    setHover(null)
    canvas.style.cursor = 'grabbing'
    const scale = worldPerPixel()
    pan.x -= (event.clientX - previous.x) * scale
    pan.z -= ((event.clientY - previous.y) * scale) / Math.sin(PITCH)
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
    clampPan()
    applyViewTarget()
    Object.assign(view, { x: viewTarget.x, z: viewTarget.z })
  }

  const onPointerUp = (event: PointerEvent): void => {
    if (!pointers.delete(event.pointerId)) return
    canvas.style.cursor = 'grab'
    if (pointers.size > 0) return
    if (!dragged) {
      const id = pick(event.clientX, event.clientY)
      setSelected(id)
      onSelect(id)
    }
    dragged = false
    pinchDistance = 0
  }

  const onPointerLeave = (event: PointerEvent): void => {
    if (event.pointerType === 'mouse' && pointers.size === 0) setHover(null)
  }

  const onWheel = (event: WheelEvent): void => {
    event.preventDefault()
    zoom = MathUtils.clamp(zoom * Math.exp(event.deltaY * 0.0012), ZOOM_MIN, ZOOM_MAX)
    applyViewTarget()
  }

  const setSelected = (id: string | null): void => {
    selectedId = id
    const card = id ? cards.get(id) : undefined
    if (card && !gathered) {
      pan = { x: card.base.x - bounds.centerX, z: card.base.z - bounds.centerZ }
      clampPan()
      applyViewTarget()
    }
    refreshTargets()
  }

  const markDealt = (): void => {
    canvas.dataset.dealt = String(!gathered)
  }

  const deal = (): void => {
    gathered = false
    markDealt()
    arrange(true)
  }

  canvas.addEventListener('pointerdown', onPointerDown)
  canvas.addEventListener('pointermove', onPointerMove)
  canvas.addEventListener('pointerup', onPointerUp)
  canvas.addEventListener('pointercancel', onPointerUp)
  canvas.addEventListener('pointerleave', onPointerLeave)
  canvas.addEventListener('wheel', onWheel, { passive: false })
  canvas.style.cursor = 'grab'

  const observer =
    typeof ResizeObserver === 'undefined'
      ? undefined
      : new ResizeObserver(() => {
          if (Math.abs(camera.aspect - lastAspect) > 0.02) arrange(false)
        })
  observer?.observe(parent)

  engine.onFrame((delta) => {
    clock += delta
    settle(delta)
    decor.update(delta)
    placeCamera()
  })

  // Everything starts in the deck, then deals out on the next beat.
  canvas.dataset.cards = String(cards.size)
  markDealt()
  arrange(false)
  Object.assign(view, viewTarget)
  for (const card of cards.values()) Object.assign(card.current, card.base)
  engine.start()
  dealTimer = setTimeout(deal, reducedMotion ? 0 : 450)

  return {
    setMatching(ids, instant = false, match = {}) {
      limited = match.limited ?? true
      limit = handSize
      // The Jokers only join the spread when nothing is filtered out.
      matching = (match.showJokers ?? true) ? new Set([...ids, ...JOKERS.map((j) => j.id)]) : ids
      if (selectedId && !matching.has(selectedId)) selectedId = null
      pan = { x: 0, z: 0 }
      zoom = 1
      arrange(!instant)
    },
    select(id) {
      setSelected(id)
    },
    dealMore() {
      limit += handSize
      arrange(true)
    },
    setFavourites(ids) {
      favourites = ids
      for (const card of cards.values()) card.repaint()
    },
    shuffle() {
      clearTimeout(dealTimer)
      selectedId = null
      backDesign = pickBack(Math.random(), backDesign.id)
      drawCardBack(backCanvas, backDesign)
      backMap.needsUpdate = true
      canvas.dataset.back = backDesign.id
      gathered = true
      markDealt()
      arrange(true)
      order = [...order].sort(() => Math.random() - 0.5)
      limit = handSize
      dealTimer = setTimeout(deal, reducedMotion ? 0 : 750)
    },
    dispose() {
      if (disposed) return
      disposed = true
      clearTimeout(dealTimer)
      observer?.disconnect()
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerup', onPointerUp)
      canvas.removeEventListener('pointercancel', onPointerUp)
      canvas.removeEventListener('pointerleave', onPointerLeave)
      canvas.removeEventListener('wheel', onWheel)
      engine.dispose()
    },
  }
}
