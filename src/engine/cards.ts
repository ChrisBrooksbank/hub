import {
  CanvasTexture,
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Raycaster,
  Shape,
  ShapeGeometry,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  Vector2,
  type BufferGeometry,
  type Camera,
} from 'three'
import type { Site } from '../data/schema'
import type { CardPlacement } from './layout/types'

export const CARD_WIDTH = 3
export const CARD_HEIGHT = 1.9
const LABEL_HEIGHT = 0.5
const ACCENT_HEIGHT = 0.08
const DEAD_DIM = 0.4
const FILTERED_DIM = 0.18
/** Seconds for a card to fade fully between matching and dimmed. */
const FILTER_FADE_SECONDS = 0.35
const FALLBACK_ACCENT = '#888888'
const HOVER_SCALE = 0.08
const HOVER_TILT = 0.2
const HOVER_GLOW = 0.35
const WHITE = new Color(0xffffff)

export type TextureLoadFn = (url: string) => Promise<Texture>

function defaultLoad(url: string): Promise<Texture> {
  return new TextureLoader().loadAsync(url)
}

/** Lazily loads thumbnails once per URL and shares the result between cards. */
export class TextureCache {
  private readonly textures = new Map<string, Promise<Texture | undefined>>()
  private readonly loaded = new Set<Texture>()
  private disposed = false

  constructor(private readonly load: TextureLoadFn = defaultLoad) {}

  /** Resolves to undefined when the image fails to load, so cards fall back gracefully. */
  get(url: string): Promise<Texture | undefined> {
    let entry = this.textures.get(url)
    if (!entry) {
      entry = this.load(url).then(
        (texture) => {
          texture.colorSpace = SRGBColorSpace
          if (this.disposed) texture.dispose()
          else this.loaded.add(texture)
          return texture
        },
        () => undefined,
      )
      this.textures.set(url, entry)
    }
    return entry
  }

  get size(): number {
    return this.textures.size
  }

  dispose(): void {
    this.disposed = true
    for (const texture of this.loaded) texture.dispose()
    this.loaded.clear()
    this.textures.clear()
  }
}

/** Rounded rectangle centred on the origin, with UVs spanning 0..1 across the face. */
export function createRoundedRectGeometry(
  width: number,
  height: number,
  radius: number,
): ShapeGeometry {
  const r = Math.min(radius, width / 2, height / 2)
  const x = -width / 2
  const y = -height / 2
  const shape = new Shape()
  shape.moveTo(x + r, y)
  shape.lineTo(x + width - r, y)
  shape.quadraticCurveTo(x + width, y, x + width, y + r)
  shape.lineTo(x + width, y + height - r)
  shape.quadraticCurveTo(x + width, y + height, x + width - r, y + height)
  shape.lineTo(x + r, y + height)
  shape.quadraticCurveTo(x, y + height, x, y + height - r)
  shape.lineTo(x, y + r)
  shape.quadraticCurveTo(x, y, x + r, y)
  const geometry = new ShapeGeometry(shape, 6)
  const position = geometry.getAttribute('position')
  const uv = geometry.getAttribute('uv')
  for (let i = 0; i < position.count; i++) {
    uv.setXY(i, (position.getX(i) - x) / width, (position.getY(i) - y) / height)
  }
  uv.needsUpdate = true
  return geometry
}

/** The text drawn under each card; dead sites carry a visible note. */
export function cardLabelText(site: Pick<Site, 'name' | 'status'>): string[] {
  return site.status === 'dead' ? [site.name, 'may be offline'] : [site.name]
}

function createLabelTexture(lines: readonly string[]): CanvasTexture | undefined {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = Math.round((512 * LABEL_HEIGHT) / CARD_WIDTH)
  const context = canvas.getContext('2d')
  if (!context) return undefined
  context.fillStyle = '#ffffff'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  const lineHeight = canvas.height / lines.length
  lines.forEach((line, index) => {
    context.font = `${index === 0 ? 'bold ' : ''}${Math.floor(lineHeight * 0.62)}px system-ui, sans-serif`
    context.fillText(line, canvas.width / 2, lineHeight * (index + 0.5), canvas.width - 16)
  })
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

export interface CardShared {
  face: BufferGeometry
  accent: BufferGeometry
  label: BufferGeometry
}

export function createCardGeometries(cornerRadius = 0.18): CardShared {
  return {
    face: createRoundedRectGeometry(CARD_WIDTH, CARD_HEIGHT, cornerRadius),
    accent: new PlaneGeometry(CARD_WIDTH, ACCENT_HEIGHT),
    label: new PlaneGeometry(CARD_WIDTH, LABEL_HEIGHT),
  }
}

export interface Card {
  readonly site: Site
  readonly group: Group
  /** The only mesh used for picking. */
  readonly face: Mesh<BufferGeometry, MeshBasicMaterial>
  /** Non-matching cards dim. Fades over time via `update`, or jumps when `instant` (reduced motion). */
  setMatch(matches: boolean, instant?: boolean): void
  /** Advances the filter fade; returns true while still animating. */
  update(deltaSeconds: number): boolean
  /** 0..1 hover emphasis: tilts toward the pointer (`tiltX`/`tiltY` in -1..1), scales up and glows. */
  setHover(amount: number, tiltX?: number, tiltY?: number): void
  setThumbnail(texture: Texture): void
  dispose(): void
}

export function createCard(
  site: Site,
  placement: CardPlacement,
  shared: CardShared,
  cache?: TextureCache,
): Card {
  const accent = new Color(site.accent ?? FALLBACK_ACCENT)
  const dead = site.status === 'dead'
  const baseOpacity = dead ? DEAD_DIM : 1
  let matchAmount = 1
  let matchTarget = 1

  const faceMaterial = new MeshBasicMaterial({ color: accent, transparent: true })
  const accentMaterial = new MeshBasicMaterial({ color: accent, transparent: true })
  const face = new Mesh(shared.face, faceMaterial)
  const accentBar = new Mesh(shared.accent, accentMaterial)
  accentBar.position.set(0, -CARD_HEIGHT / 2 - ACCENT_HEIGHT / 2, 0)

  const labelTexture = createLabelTexture(cardLabelText(site))
  const labelMaterial = new MeshBasicMaterial({
    map: labelTexture ?? null,
    color: 0xffffff,
    transparent: true,
    visible: labelTexture !== undefined,
  })
  const label = new Mesh(shared.label, labelMaterial)
  label.position.set(0, -CARD_HEIGHT / 2 - ACCENT_HEIGHT - LABEL_HEIGHT / 2, 0)

  const group = new Group()
  group.name = `card:${site.id}`
  group.userData.siteId = site.id
  group.add(face, accentBar, label)
  group.position.set(...placement.position)
  group.rotation.order = 'YXZ'
  group.rotation.set(placement.rotationX, placement.rotationY, 0)

  const baseRotation = { x: placement.rotationX, y: placement.rotationY }

  const applyOpacity = (): void => {
    const opacity = baseOpacity * (FILTERED_DIM + (1 - FILTERED_DIM) * matchAmount)
    faceMaterial.opacity = opacity
    accentMaterial.opacity = opacity
    labelMaterial.opacity = opacity
  }
  applyOpacity()

  let disposed = false
  const card: Card = {
    site,
    group,
    face,
    setMatch(next, instant = false) {
      matchTarget = next ? 1 : 0
      if (instant) {
        matchAmount = matchTarget
        applyOpacity()
      }
    },
    update(deltaSeconds) {
      if (matchAmount === matchTarget) return false
      const step = Math.max(0, deltaSeconds) / FILTER_FADE_SECONDS
      matchAmount =
        matchAmount < matchTarget
          ? Math.min(matchTarget, matchAmount + step)
          : Math.max(matchTarget, matchAmount - step)
      applyOpacity()
      return matchAmount !== matchTarget
    },
    setHover(amount, tiltX = 0, tiltY = 0) {
      const h = Math.min(1, Math.max(0, amount))
      group.scale.setScalar(1 + HOVER_SCALE * h)
      group.rotation.set(
        baseRotation.x - tiltY * HOVER_TILT * h,
        baseRotation.y + tiltX * HOVER_TILT * h,
        0,
      )
      // Colours above 1 brighten a textured face; flat faces lerp toward white instead.
      if (faceMaterial.map) faceMaterial.color.setScalar(1 + HOVER_GLOW * h)
      else faceMaterial.color.copy(accent).lerp(WHITE, HOVER_GLOW * h)
    },
    setThumbnail(texture) {
      if (disposed) return
      faceMaterial.map = texture
      faceMaterial.color.set(0xffffff)
      faceMaterial.needsUpdate = true
    },
    dispose() {
      disposed = true
      // Geometries and cached thumbnails are shared, so only per-card resources go here.
      faceMaterial.dispose()
      accentMaterial.dispose()
      labelMaterial.dispose()
      labelTexture?.dispose()
    },
  }

  if (cache && site.thumb) {
    void cache.get(site.thumb).then((texture) => {
      if (texture) card.setThumbnail(texture)
    })
  }
  return card
}

/**
 * Owns every card, the shared geometry and the thumbnail cache. All 60 faces share
 * one geometry, and picking tests only those faces (never labels or accent bars).
 */
export class CardField {
  readonly group = new Group()
  readonly cards = new Map<string, Card>()
  private readonly shared = createCardGeometries()
  private readonly raycaster = new Raycaster()
  private readonly pointer = new Vector2()
  private faces: Mesh<BufferGeometry, MeshBasicMaterial>[] = []

  constructor(
    sites: readonly Site[],
    placements: readonly CardPlacement[],
    readonly cache: TextureCache = new TextureCache(),
  ) {
    const bySite = new Map(sites.map((site) => [site.id, site]))
    for (const placement of placements) {
      const site = bySite.get(placement.id)
      if (!site) continue
      const card = createCard(site, placement, this.shared, cache)
      this.cards.set(site.id, card)
      this.group.add(card.group)
    }
    this.faces = [...this.cards.values()].map((card) => card.face)
  }

  /** Dims every card whose id is not in `matching`; the fade runs in `update` unless `instant`. */
  applyFilter(matching: ReadonlySet<string>, instant = false): void {
    for (const [id, card] of this.cards) card.setMatch(matching.has(id), instant)
  }

  /** Per-frame hook for card animations. */
  update(deltaSeconds: number): void {
    for (const card of this.cards.values()) card.update(deltaSeconds)
  }

  /** Finds the nearest card under a pointer given in normalised device coordinates. */
  pick(ndcX: number, ndcY: number, camera: Camera): Card | undefined {
    this.group.updateMatrixWorld()
    this.pointer.set(ndcX, ndcY)
    this.raycaster.setFromCamera(this.pointer, camera)
    const [hit] = this.raycaster.intersectObjects(this.faces, false)
    if (!hit) return undefined
    return [...this.cards.values()].find((card) => card.face === hit.object)
  }

  dispose(): void {
    for (const card of this.cards.values()) card.dispose()
    this.cards.clear()
    this.faces = []
    this.shared.face.dispose()
    this.shared.accent.dispose()
    this.shared.label.dispose()
    this.cache.dispose()
    this.group.removeFromParent()
  }
}
