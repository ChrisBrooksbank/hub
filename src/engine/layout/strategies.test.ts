import { describe, expect, it } from 'vitest'
import { LAYOUTS, type LayoutId } from './strategies'
import type { LayoutItem } from './types'

const categories = ['Games', 'Tools', 'Learning']
const items: LayoutItem[] = Array.from({ length: 24 }, (_, i) => ({
  id: `s${i}`,
  category: categories[i % 3] as string,
}))

describe.each(Object.keys(LAYOUTS) as LayoutId[])('%s layout', (name) => {
  const layout = LAYOUTS[name]()

  it('places every item exactly once, deterministically', () => {
    const result = layout.place(items)
    expect(result.placements.map((p) => p.id).sort()).toEqual(items.map((i) => i.id).sort())
    expect(layout.place(items)).toEqual(result)
  })

  it('keeps cards apart', () => {
    const { placements } = layout.place(items)
    for (let a = 0; a < placements.length; a++) {
      for (let b = a + 1; b < placements.length; b++) {
        const [ax, ay, az] = placements[a]!.position
        const [bx, by, bz] = placements[b]!.position
        expect(Math.hypot(ax - bx, ay - by, az - bz)).toBeGreaterThan(1.5)
      }
    }
  })

  it('handles empty and single-item input', () => {
    expect(layout.place([]).placements).toEqual([])
    const one = layout.place([{ id: 'a', category: 'x' }])
    expect(one.placements).toHaveLength(1)
    expect(one.placements[0]!.position.every(Number.isFinite)).toBe(true)
  })
})

describe('ring layout', () => {
  it('puts each category in its own vertical band, facing outward', () => {
    const { placements, radius } = LAYOUTS.ring().place(items)
    const bands = new Map<string, Set<number>>()
    for (const item of items) {
      const placement = placements.find((p) => p.id === item.id)!
      const ys = bands.get(item.category) ?? new Set<number>()
      ys.add(placement.position[1])
      bands.set(item.category, ys)
      expect(Math.hypot(placement.position[0], placement.position[2])).toBeCloseTo(radius)
      expect(Math.sin(placement.rotationY) * radius).toBeCloseTo(placement.position[0])
    }
    expect([...bands.values()].every((ys) => ys.size === 1)).toBe(true)
    expect(new Set([...bands.values()].map((ys) => [...ys][0])).size).toBe(3)
  })
})

describe('helix layout', () => {
  it('descends monotonically along the axis', () => {
    const { placements } = LAYOUTS.helix().place(items)
    for (let i = 1; i < placements.length; i++) {
      expect(placements[i]!.position[1]).toBeLessThan(placements[i - 1]!.position[1]!)
    }
  })
})

describe('sphere layout', () => {
  it('keeps all cards on the sphere surface', () => {
    const { placements, radius } = LAYOUTS.sphere().place(items)
    for (const p of placements) {
      expect(Math.hypot(...p.position)).toBeCloseTo(radius)
    }
  })
})
