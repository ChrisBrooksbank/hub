import { hashString, seededRandom } from '../engine/procedural-art'

/** Playing-card proportions, in world units. */
export const CARD_WIDTH = 2.5
export const CARD_HEIGHT = 3.5

const GAP = 0.35
const CELL_WIDTH = CARD_WIDTH + GAP
const CELL_HEIGHT = CARD_HEIGHT + GAP

export interface Slot {
  x: number
  z: number
  /** Rotation about the vertical axis, radians. */
  yaw: number
}

export interface Spread {
  slots: Slot[]
  /** Extent of the whole spread in world units. */
  width: number
  depth: number
}

/**
 * Lays `count` cards out on the table as a loose grid whose shape follows the viewport
 * `aspect` (width / height). Each card gets a small, repeatable nudge so it reads as dealt
 * by hand; the last row is centred. The spread is centred on the origin.
 */
export function spreadLayout(count: number, aspect: number): Spread {
  if (count <= 0) return { slots: [], width: 0, depth: 0 }
  const wanted = Math.sqrt(count * Math.max(0.2, aspect) * (CELL_HEIGHT / CELL_WIDTH))
  const columns = Math.min(count, Math.max(1, Math.ceil(wanted)))
  const rows = Math.ceil(count / columns)
  const slots: Slot[] = []
  for (let index = 0; index < count; index++) {
    const row = Math.floor(index / columns)
    const inRow = row === rows - 1 ? count - row * columns : columns
    const column = index - row * columns
    const random = seededRandom(hashString(`slot:${index}`))
    slots.push({
      x: (column - (inRow - 1) / 2) * CELL_WIDTH + (random() - 0.5) * 0.24,
      z: (row - (rows - 1) / 2) * CELL_HEIGHT + (random() - 0.5) * 0.24,
      yaw: (random() - 0.5) * 0.1,
    })
  }
  return { slots, width: columns * CELL_WIDTH, depth: rows * CELL_HEIGHT }
}

/** Vertical field of view of the table camera, degrees. */
export const CAMERA_FOV = 50
/** Elevation of the camera above the table plane, degrees. */
export const CAMERA_PITCH = 58
/** Smallest a card is allowed to get on screen when fitting, in CSS pixels. */
const MIN_CARD_PIXELS = 105

export interface FitInput {
  aspect: number
  viewportHeight: number
  /** Extent of what must be visible, in world units. */
  width: number
  depth: number
}

/**
 * Camera distance that shows the whole table area, unless that would shrink cards below a
 * readable size (a long list on a phone): then it stays close and the table is panned instead.
 */
export function fitDistance({ aspect, viewportHeight, width, depth }: FitInput): number {
  const tanHalf = Math.tan((CAMERA_FOV / 2) * (Math.PI / 180))
  const sinPitch = Math.sin(CAMERA_PITCH * (Math.PI / 180))
  const forWidth = (width * 1.08) / (2 * tanHalf * aspect)
  const forDepth = (depth * 1.2 * sinPitch) / (2 * tanHalf)
  const readable = (CARD_WIDTH * Math.max(1, viewportHeight)) / (2 * tanHalf * MIN_CARD_PIXELS)
  return Math.max(6, Math.min(Math.max(forWidth, forDepth), readable))
}

/** Felt kept free of cards on every side, so the rail and props frame the spread. */
export const TABLE_MARGIN = 3.4

export interface TableArea {
  /** The whole felt surface, inside the rail, in world units. */
  centerX: number
  centerZ: number
  width: number
  depth: number
  /** Where the deck sits: left of the spread on a landscape table, above it on a portrait one. */
  deckX: number
  deckZ: number
}

/**
 * The fixed table for `count` cards: the full spread, the deck's place and a margin all round.
 * It depends only on the viewport shape, so filtering never moves the rail or the props.
 */
export function tableArea(count: number, aspect: number): TableArea {
  const spread = spreadLayout(count, aspect)
  let minX = -spread.width / 2
  const maxX = spread.width / 2
  let minZ = -spread.depth / 2
  const maxZ = spread.depth / 2
  let deckX = 0
  let deckZ = 0
  if (aspect >= 1) {
    deckX = minX - CARD_WIDTH / 2 - 0.8
    minX = deckX - CARD_WIDTH / 2
  } else {
    deckZ = minZ - CARD_HEIGHT / 2 - 0.8
    minZ = deckZ - CARD_HEIGHT / 2
  }
  return {
    centerX: (minX + maxX) / 2,
    centerZ: (minZ + maxZ) / 2,
    width: maxX - minX + TABLE_MARGIN * 2,
    depth: maxZ - minZ + TABLE_MARGIN * 2,
    deckX,
    deckZ,
  }
}
