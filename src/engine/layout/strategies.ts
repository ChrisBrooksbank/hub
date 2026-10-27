import {
  DEFAULT_LAYOUT,
  groupByCategory,
  type CardPlacement,
  type LayoutOptions,
  type LayoutResult,
  type LayoutStrategy,
} from './types'

const TAU = Math.PI * 2

function onCylinder(id: string, radius: number, angle: number, y: number): CardPlacement {
  return {
    id,
    position: [Math.sin(angle) * radius, y, Math.cos(angle) * radius],
    rotationY: angle,
    rotationX: 0,
  }
}

/** One ring per category, stacked as vertical bands. */
export function createRingLayout(overrides: LayoutOptions = {}): LayoutStrategy {
  const options = { ...DEFAULT_LAYOUT, ...overrides }
  const arc = options.cardWidth + options.gap
  return {
    id: 'ring',
    place(items): LayoutResult {
      const groups = groupByCategory(items)
      const widest = Math.max(0, ...groups.map((group) => group.length))
      const radius = Math.max(options.minRadius, (widest * arc) / TAU)
      const height = Math.max(0, groups.length - 1) * options.bandHeight
      const placements = groups.flatMap((group, band) => {
        const y = height / 2 - band * options.bandHeight
        // Offset alternate bands by half a step so cards do not stack in columns.
        const offset = (band % 2) * (TAU / group.length / 2)
        return group.map((item, index) =>
          onCylinder(item.id, radius, offset + (index / group.length) * TAU, y),
        )
      })
      return { placements, radius, height }
    },
  }
}

/** A single spiral through all cards, ordered by category so categories form arcs. */
export function createHelixLayout(overrides: LayoutOptions = {}): LayoutStrategy {
  const options = { ...DEFAULT_LAYOUT, ...overrides }
  const arc = options.cardWidth + options.gap
  return {
    id: 'helix',
    place(items): LayoutResult {
      const ordered = groupByCategory(items).flat()
      const radius = Math.max(options.minRadius, (6 * arc) / TAU)
      const step = arc / radius
      const rise = (options.bandHeight * step) / TAU
      const height = Math.max(0, ordered.length - 1) * rise
      const placements = ordered.map((item, index) =>
        onCylinder(item.id, radius, index * step, height / 2 - index * rise),
      )
      return { placements, radius, height }
    },
  }
}

/** Cards spread evenly over a sphere (Fibonacci lattice), ordered by category. */
export function createSphereLayout(overrides: LayoutOptions = {}): LayoutStrategy {
  const options = { ...DEFAULT_LAYOUT, ...overrides }
  const arc = options.cardWidth + options.gap
  const goldenAngle = Math.PI * (3 - Math.sqrt(5))
  return {
    id: 'sphere',
    place(items): LayoutResult {
      const ordered = groupByCategory(items).flat()
      const count = ordered.length
      const radius = Math.max(options.minRadius, Math.sqrt((count * arc * arc) / (4 * Math.PI)))
      const placements = ordered.map((item, index): CardPlacement => {
        const y = count === 1 ? 0 : 1 - (index / (count - 1)) * 2
        const ring = Math.sqrt(1 - y * y)
        const angle = index * goldenAngle
        return {
          id: item.id,
          position: [Math.sin(angle) * ring * radius, y * radius, Math.cos(angle) * ring * radius],
          rotationY: angle,
          rotationX: -Math.asin(y),
        }
      })
      return { placements, radius, height: radius * 2 }
    },
  }
}

export const LAYOUTS = {
  ring: createRingLayout,
  helix: createHelixLayout,
  sphere: createSphereLayout,
} as const

export type LayoutId = keyof typeof LAYOUTS
