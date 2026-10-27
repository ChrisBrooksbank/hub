import { Vector3, type PerspectiveCamera } from 'three'
import type { Site } from '../data/schema'
import type { Card, CardField } from './cards'
import type { GalleryControls } from './controls'

const HASH_PREFIX = '#/site/'
const FLY_SECONDS = 0.9
const HOVER_RATE = 10
const CLICK_SLOP_PX = 6

/** `#/site/<id>` -> id; anything else -> undefined. */
export function parseSiteHash(hash: string): string | undefined {
  if (!hash.startsWith(HASH_PREFIX)) return undefined
  const raw = hash.slice(HASH_PREFIX.length)
  if (!raw) return undefined
  try {
    return decodeURIComponent(raw)
  } catch {
    return undefined
  }
}

export function siteHash(id: string): string {
  return `${HASH_PREFIX}${encodeURIComponent(id)}`
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

/**
 * Where the camera should sit to frame a card whose front faces away from the Y axis:
 * out along the card's radial direction, looking back at it.
 */
export function framingPose(
  cardWorld: Vector3,
  distance: number,
): { position: Vector3; target: Vector3 } {
  const radial = new Vector3(cardWorld.x, 0, cardWorld.z)
  if (radial.lengthSq() < 1e-6) radial.set(0, 0, 1)
  radial.normalize()
  return {
    position: cardWorld.clone().addScaledVector(radial, distance),
    target: cardWorld.clone(),
  }
}

/** Eases the camera between poses; a zero duration (reduced motion) cuts instantly. */
export class CameraRig {
  private fromPosition = new Vector3()
  private toPosition = new Vector3()
  private fromTarget = new Vector3()
  private toTarget = new Vector3()
  private elapsed = 0
  private duration = 0
  private animating = false
  private readonly currentTarget: Vector3

  constructor(
    private readonly camera: PerspectiveCamera,
    readonly homePosition: Vector3 = camera.position.clone(),
    readonly homeTarget: Vector3 = new Vector3(),
  ) {
    this.currentTarget = homeTarget.clone()
    camera.lookAt(this.currentTarget)
  }

  get isAnimating(): boolean {
    return this.animating
  }

  flyTo(position: Vector3, target: Vector3, reducedMotion = false): void {
    if (reducedMotion) {
      this.camera.position.copy(position)
      this.currentTarget.copy(target)
      this.camera.lookAt(target)
      this.animating = false
      return
    }
    this.fromPosition.copy(this.camera.position)
    this.fromTarget.copy(this.currentTarget)
    this.toPosition.copy(position)
    this.toTarget.copy(target)
    this.elapsed = 0
    this.duration = FLY_SECONDS
    this.animating = true
  }

  flyHome(reducedMotion = false): void {
    this.flyTo(this.homePosition, this.homeTarget, reducedMotion)
  }

  update(dtSeconds: number): void {
    if (!this.animating) return
    this.elapsed = Math.min(this.duration, this.elapsed + dtSeconds)
    const t = easeInOutCubic(this.elapsed / this.duration)
    this.camera.position.lerpVectors(this.fromPosition, this.toPosition, t)
    this.currentTarget.lerpVectors(this.fromTarget, this.toTarget, t)
    this.camera.lookAt(this.currentTarget)
    if (this.elapsed >= this.duration) this.animating = false
  }
}

/** Reads and writes the deep link; injectable so tests need no real history. */
export interface HashAdapter {
  get(): string
  /** Writes the selection into the URL (undefined clears it). */
  set(id: string | undefined): void
  subscribe(callback: () => void): () => void
}

export function createWindowHash(win: Window = window): HashAdapter {
  return {
    get: () => win.location.hash,
    set(id) {
      if (id === undefined) {
        win.history.pushState(null, '', win.location.pathname + win.location.search)
      } else {
        win.location.hash = siteHash(id)
      }
    },
    subscribe(callback) {
      win.addEventListener('hashchange', callback)
      return () => win.removeEventListener('hashchange', callback)
    },
  }
}

export interface SelectionOptions {
  field: CardField
  camera: PerspectiveCamera
  controls: GalleryControls
  /** The canvas; pointer events and the tooltip are positioned relative to it. */
  element: HTMLElement
  rig?: CameraRig
  hash?: HashAdapter
  /** Called when the selected site changes (undefined = back at overview). */
  onChange?: (site: Site | undefined) => void
  /** Camera distance from the selected card. */
  framingDistance?: number
}

/**
 * Hover tilt/glow with a tooltip, click/Enter selection, camera easing to the selected card,
 * Escape/Back to return to the overview, and the `#/site/<id>` deep link.
 */
export class SelectionController {
  readonly rig: CameraRig
  readonly tooltip: HTMLElement
  private readonly field: CardField
  private readonly camera: PerspectiveCamera
  private readonly controls: GalleryControls
  private readonly element: HTMLElement
  private readonly hash: HashAdapter
  private readonly onChange: ((site: Site | undefined) => void) | undefined
  private readonly framingDistance: number
  private readonly hoverAmounts = new Map<string, number>()
  private readonly tilt = { x: 0, y: 0 }
  private readonly teardown: (() => void)[] = []
  private hovered: Card | undefined
  private selectedId: string | undefined
  private downAt: { x: number; y: number } | undefined

  constructor(options: SelectionOptions) {
    this.field = options.field
    this.camera = options.camera
    this.controls = options.controls
    this.element = options.element
    this.rig = options.rig ?? new CameraRig(options.camera)
    this.hash = options.hash ?? createWindowHash()
    this.onChange = options.onChange
    this.framingDistance = options.framingDistance ?? 4.2

    this.tooltip = document.createElement('div')
    this.tooltip.className = 'scene-tooltip'
    this.tooltip.setAttribute('aria-hidden', 'true')
    this.tooltip.hidden = true
    this.element.parentElement?.appendChild(this.tooltip)

    this.listen(this.element, 'pointerdown', (event) => {
      const e = event as PointerEvent
      this.downAt = { x: e.clientX, y: e.clientY }
    })
    this.listen(this.element, 'pointermove', (event) => {
      const e = event as PointerEvent
      if (e.pointerType === 'mouse' && !this.controls.isDragging) this.hoverAt(e.clientX, e.clientY)
    })
    this.listen(this.element, 'pointerleave', () => this.setHovered(undefined))
    this.listen(this.element, 'click', (event) => {
      const e = event as MouseEvent
      const down = this.downAt
      this.downAt = undefined
      if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > CLICK_SLOP_PX) return
      const card = this.cardAt(e.clientX, e.clientY)
      if (card) this.select(card.site.id)
    })
    this.listen(this.element, 'keydown', (event) => {
      if ((event as KeyboardEvent).key === 'Enter' && this.hovered) {
        this.select(this.hovered.site.id)
      }
    })
    this.listen(window, 'keydown', (event) => {
      if ((event as KeyboardEvent).key === 'Escape') this.clear()
    })
    this.teardown.push(this.hash.subscribe(() => this.syncFromHash()))
  }

  get selected(): Site | undefined {
    return this.selectedId ? this.field.cards.get(this.selectedId)?.site : undefined
  }

  /** Applies the current URL hash; call once after the scene is ready for deep links. */
  syncFromHash(): void {
    const id = parseSiteHash(this.hash.get())
    if (id && this.field.cards.has(id)) this.select(id, false)
    else if (this.selectedId) this.clear(false)
  }

  select(id: string, updateHash = true): void {
    const card = this.field.cards.get(id)
    if (!card) return
    if (this.selectedId === id) return
    this.selectedId = id
    this.setHovered(undefined)
    this.controls.enabled = false
    this.field.group.updateMatrixWorld(true)
    const world = card.group.getWorldPosition(new Vector3())
    const pose = framingPose(world, this.framingDistance)
    this.rig.flyTo(pose.position, pose.target, this.controls.reducedMotion)
    if (updateHash) this.hash.set(id)
    this.onChange?.(card.site)
  }

  /** Returns the camera to the overview. */
  clear(updateHash = true): void {
    if (this.selectedId === undefined) return
    this.selectedId = undefined
    this.controls.enabled = true
    this.rig.flyHome(this.controls.reducedMotion)
    if (updateHash) this.hash.set(undefined)
    this.onChange?.(undefined)
  }

  /** Updates hover from client pixel coordinates (ignored while a card is selected). */
  hoverAt(clientX: number, clientY: number): void {
    if (this.selectedId) return
    const card = this.cardAt(clientX, clientY)
    if (card) {
      const rect = this.element.getBoundingClientRect()
      this.tilt.x = ((clientX - rect.left) / rect.width) * 2 - 1
      this.tilt.y = -(((clientY - rect.top) / rect.height) * 2 - 1)
      this.positionTooltip(clientX - rect.left, clientY - rect.top)
    }
    this.setHovered(card)
  }

  /** Eases hover amounts and advances the camera; call every frame. */
  update(dtSeconds: number): void {
    this.rig.update(dtSeconds)
    const k = this.controls.reducedMotion ? 1 : 1 - Math.exp(-HOVER_RATE * dtSeconds)
    for (const [id, card] of this.field.cards) {
      const current = this.hoverAmounts.get(id) ?? 0
      const target = card === this.hovered ? 1 : 0
      if (current === target) continue
      const next = Math.abs(target - current) < 0.01 ? target : current + (target - current) * k
      this.hoverAmounts.set(id, next)
      card.setHover(next, this.tilt.x, this.tilt.y)
    }
  }

  dispose(): void {
    for (const fn of this.teardown.splice(0)) fn()
    this.tooltip.remove()
  }

  private cardAt(clientX: number, clientY: number): Card | undefined {
    const rect = this.element.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return undefined
    const x = ((clientX - rect.left) / rect.width) * 2 - 1
    const y = -(((clientY - rect.top) / rect.height) * 2 - 1)
    return this.field.pick(x, y, this.camera)
  }

  private setHovered(card: Card | undefined): void {
    if (card === this.hovered) return
    this.hovered = card
    this.element.style.cursor = card ? 'pointer' : ''
    if (card) {
      this.tooltip.textContent = `${card.site.name}${card.site.description ? ` — ${card.site.description}` : ''}`
      this.tooltip.hidden = false
    } else {
      this.tooltip.hidden = true
    }
  }

  private positionTooltip(x: number, y: number): void {
    this.tooltip.style.transform = `translate(${Math.round(x + 14)}px, ${Math.round(y + 14)}px)`
  }

  private listen(target: EventTarget, type: string, handler: (event: Event) => void): void {
    target.addEventListener(type, handler)
    this.teardown.push(() => target.removeEventListener(type, handler))
  }
}
