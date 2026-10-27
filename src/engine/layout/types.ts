export interface LayoutItem {
  id: string
  category: string
}

export interface CardPlacement {
  id: string
  position: readonly [number, number, number]
  /** Yaw in radians about Y, so the card front (+Z) points away from the axis. */
  rotationY: number
  /** Pitch in radians about X; apply with Euler order 'YXZ'. */
  rotationX: number
}

export interface LayoutResult {
  placements: CardPlacement[]
  /** Distance from the axis to the cards, for camera framing. */
  radius: number
  /** Total vertical extent of the arrangement. */
  height: number
}

export interface LayoutStrategy {
  readonly id: string
  place(items: readonly LayoutItem[]): LayoutResult
}

export interface LayoutOptions {
  /** Card width in world units; drives how tightly cards pack. */
  cardWidth?: number
  /** Gap between neighbouring cards. */
  gap?: number
  /** Vertical distance between category bands or helix turns. */
  bandHeight?: number
  minRadius?: number
}

export const DEFAULT_LAYOUT: Required<LayoutOptions> = {
  cardWidth: 3,
  gap: 0.6,
  bandHeight: 2.6,
  minRadius: 6,
}

/** Items grouped by category, keeping first-seen category order and item order. */
export function groupByCategory(items: readonly LayoutItem[]): LayoutItem[][] {
  const groups = new Map<string, LayoutItem[]>()
  for (const item of items) {
    const group = groups.get(item.category)
    if (group) group.push(item)
    else groups.set(item.category, [item])
  }
  return [...groups.values()]
}
