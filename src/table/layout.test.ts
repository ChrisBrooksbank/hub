import { describe, expect, it } from 'vitest'
import {
  CAMERA_FOV,
  CARD_HEIGHT,
  CARD_WIDTH,
  fitDistance,
  spreadLayout,
  tableArea,
  TABLE_MARGIN,
} from './layout'

describe('spreadLayout', () => {
  it('returns nothing for no cards', () => {
    expect(spreadLayout(0, 1.6)).toEqual({ slots: [], width: 0, depth: 0 })
  })

  it('places every card inside the reported bounds, centred on the origin', () => {
    const { slots, width, depth } = spreadLayout(26, 1.6)
    expect(slots).toHaveLength(26)
    for (const slot of slots) {
      expect(Math.abs(slot.x)).toBeLessThanOrEqual(width / 2)
      expect(Math.abs(slot.z)).toBeLessThanOrEqual(depth / 2)
    }
  })

  it('never overlaps cards', () => {
    const { slots } = spreadLayout(26, 1.6)
    for (const [i, a] of slots.entries()) {
      for (const b of slots.slice(i + 1)) {
        const apartX = Math.abs(a.x - b.x) >= CARD_WIDTH
        const apartZ = Math.abs(a.z - b.z) >= CARD_HEIGHT
        expect(apartX || apartZ).toBe(true)
      }
    }
  })

  it('goes wide on a landscape viewport and tall on a portrait one', () => {
    const wide = spreadLayout(26, 2)
    const tall = spreadLayout(26, 0.5)
    expect(wide.width / wide.depth).toBeGreaterThan(tall.width / tall.depth)
  })

  it('is repeatable', () => {
    expect(spreadLayout(9, 1)).toEqual(spreadLayout(9, 1))
  })

  it('handles a single card', () => {
    const { slots } = spreadLayout(1, 1.6)
    expect(slots).toHaveLength(1)
  })
})

describe('fitDistance', () => {
  const base = { aspect: 1.6, viewportHeight: 800, width: 22, depth: 15 }

  it('backs off for a bigger table', () => {
    expect(fitDistance({ ...base, width: 40, depth: 30 })).toBeGreaterThan(fitDistance(base))
  })

  it('keeps cards readable instead of fitting a very long table', () => {
    const phone = { aspect: 0.5, viewportHeight: 700, width: 9, depth: 60 }
    const distance = fitDistance(phone)
    const tanHalf = Math.tan((CAMERA_FOV / 2) * (Math.PI / 180))
    const cardPixels = (CARD_WIDTH * phone.viewportHeight) / (2 * distance * tanHalf)
    expect(cardPixels).toBeGreaterThanOrEqual(100)
  })
})

describe('tableArea', () => {
  it('frames the spread with the margin on every side', () => {
    const spread = spreadLayout(31, 1.6)
    const area = tableArea(31, 1.6)
    expect(area.depth).toBeCloseTo(spread.depth + TABLE_MARGIN * 2)
    expect(area.width).toBeGreaterThan(spread.width + TABLE_MARGIN * 2)
  })

  it('puts the deck beside a landscape spread and above a portrait one', () => {
    const wide = tableArea(31, 1.6)
    expect(wide.deckX).toBeLessThan(0)
    expect(wide.deckZ).toBe(0)
    const tall = tableArea(31, 0.5)
    expect(tall.deckX).toBe(0)
    expect(tall.deckZ).toBeLessThan(0)
  })

  it('keeps the deck on the felt', () => {
    const area = tableArea(31, 1.6)
    expect(area.deckX - CARD_WIDTH / 2).toBeGreaterThanOrEqual(area.centerX - area.width / 2)
  })
})
