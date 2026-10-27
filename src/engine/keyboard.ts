import type { CardPlacement } from './layout/types'
import type { SelectionController } from './selection'

export type ArrowKey = 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown'

const BAND_EPSILON = 0.5
const TAU = Math.PI * 2

interface Entry {
  id: string
  angle: number
  y: number
}

function angleOf(placement: CardPlacement): number {
  const [x, , z] = placement.position
  return Math.atan2(x, z)
}

/** Shortest signed angular distance from `a` to `b`, in (-PI, PI]. */
function angleDelta(a: number, b: number): number {
  let d = (b - a) % TAU
  if (d > Math.PI) d -= TAU
  if (d <= -Math.PI) d += TAU
  return d
}

/** Groups entries into horizontal bands (top first), each sorted by angle around the ring. */
function toBands(placements: readonly CardPlacement[], allowed?: ReadonlySet<string>): Entry[][] {
  const entries: Entry[] = placements
    .filter((p) => !allowed || allowed.has(p.id))
    .map((p) => ({ id: p.id, angle: angleOf(p), y: p.position[1] }))
    .sort((a, b) => b.y - a.y)
  const bands: Entry[][] = []
  for (const entry of entries) {
    const band = bands.at(-1)
    if (band && Math.abs(band[0]!.y - entry.y) < BAND_EPSILON) band.push(entry)
    else bands.push([entry])
  }
  for (const band of bands) band.sort((a, b) => a.angle - b.angle)
  return bands
}

/**
 * The card an arrow key moves to. Left/Right walk the current band around the ring (wrapping);
 * Up/Down move to the angularly nearest card in the neighbouring band. With no current card the
 * first card is returned. `matching` restricts movement to cards that pass the active filter.
 */
export function nextCardId(
  placements: readonly CardPlacement[],
  currentId: string | undefined,
  key: ArrowKey,
  matching?: ReadonlySet<string>,
): string | undefined {
  const bands = toBands(placements, matching)
  if (bands.length === 0) return undefined
  const bandIndex = bands.findIndex((band) => band.some((e) => e.id === currentId))
  if (bandIndex < 0) return bands[0]![0]!.id

  const band = bands[bandIndex]!
  const index = band.findIndex((e) => e.id === currentId)
  const current = band[index]!

  if (key === 'ArrowLeft' || key === 'ArrowRight') {
    // The camera views the ring from +Z, where screen-right is +x, i.e. increasing atan2(x, z).
    const step = key === 'ArrowRight' ? 1 : -1
    return band[(index + step + band.length) % band.length]!.id
  }

  const target = bands[bandIndex + (key === 'ArrowUp' ? -1 : 1)]
  if (!target) return current.id
  let best = target[0]!
  for (const entry of target) {
    if (
      Math.abs(angleDelta(current.angle, entry.angle)) <
      Math.abs(angleDelta(current.angle, best.angle))
    ) {
      best = entry
    }
  }
  return best.id
}

export interface KeyboardNavOptions {
  canvas: HTMLElement
  selection: SelectionController
  placements: readonly CardPlacement[]
  /** Ids passing the current filter; arrow keys skip the rest. Undefined = all cards. */
  getMatching?: () => ReadonlySet<string> | undefined
  siteCount: () => number
}

/**
 * Makes the canvas a keyboard-operable widget: it is focusable, has an accessible name and
 * description, and arrow keys move the selection around the ring.
 */
export class KeyboardNav {
  readonly description: HTMLElement
  private readonly canvas: HTMLElement
  private readonly selection: SelectionController
  private readonly placements: readonly CardPlacement[]
  private readonly getMatching: () => ReadonlySet<string> | undefined
  private readonly onKeyDown = (event: Event): void => this.handleKey(event as KeyboardEvent)

  constructor(options: KeyboardNavOptions) {
    this.canvas = options.canvas
    this.selection = options.selection
    this.placements = options.placements
    this.getMatching = options.getMatching ?? (() => undefined)

    const id = `scene-desc-${Math.random().toString(36).slice(2, 8)}`
    this.description = document.createElement('p')
    this.description.id = id
    this.description.className = 'visually-hidden'
    this.description.textContent =
      'Interactive 3D gallery of sites. Use the left and right arrow keys to move around the ring, ' +
      'up and down to change category, Enter to open details and Escape to go back. ' +
      'The same sites are available as a plain list on this page.'
    this.canvas.parentElement?.appendChild(this.description)

    this.canvas.tabIndex = 0
    this.canvas.setAttribute('role', 'application')
    this.canvas.setAttribute('aria-roledescription', '3D site gallery')
    this.canvas.setAttribute('aria-label', `Site gallery, ${options.siteCount()} sites`)
    this.canvas.setAttribute('aria-describedby', id)
    this.canvas.addEventListener('keydown', this.onKeyDown)
  }

  dispose(): void {
    this.canvas.removeEventListener('keydown', this.onKeyDown)
    this.description.remove()
  }

  private handleKey(event: KeyboardEvent): void {
    if (event.altKey || event.ctrlKey || event.metaKey) return
    const key = event.key
    if (key === 'Enter' || key === ' ') {
      if (this.selection.selected) return
      const first = nextCardId(this.placements, undefined, 'ArrowRight', this.getMatching())
      if (first) this.selection.select(first)
      event.preventDefault()
      return
    }
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(key)) return
    event.preventDefault()
    const next = nextCardId(
      this.placements,
      this.selection.selected?.id,
      key as ArrowKey,
      this.getMatching(),
    )
    if (next) this.selection.select(next)
  }
}
