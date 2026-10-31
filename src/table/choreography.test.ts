import { describe, expect, it } from 'vitest'
import { seededRandom } from '../engine/procedural-art'
import { flight, planShuffle, sampleSegment, stackPoseAt, type Pose } from './choreography'

const ids = Array.from({ length: 20 }, (_, i) => `card-${i}`)

describe('planShuffle', () => {
  const plan = planShuffle({
    stack: ids,
    current: new Map(),
    deck: { x: -10, z: 0 },
    center: { x: 0, z: 0 },
    start: 1,
    random: seededRandom(7),
  })

  it('keeps every card exactly once and actually reorders them', () => {
    expect([...plan.stack].sort()).toEqual([...ids].sort())
    expect(plan.stack).not.toEqual(ids)
  })

  it('ends every card on its place in the new deck', () => {
    plan.stack.forEach((id, level) => {
      const last = plan.scripts.get(id)!.at(-1)!
      expect(last.to).toEqual(stackPoseAt(level, -10, 0))
      expect(last.start + last.dur).toBeLessThanOrEqual(plan.end + 1e-9)
    })
  })

  it('chains each card’s legs so it never jumps', () => {
    for (const legs of plan.scripts.values()) {
      for (let i = 1; i < legs.length; i++) {
        expect(legs[i]!.from).toEqual(legs[i - 1]!.to)
        expect(legs[i]!.start).toBeGreaterThanOrEqual(legs[i - 1]!.start + legs[i - 1]!.dur - 1e-9)
      }
    }
  })
})

describe('sampleSegment', () => {
  const from: Pose = { x: 0, y: 0, z: 0, yaw: 0, flip: Math.PI, scale: 1, roll: 0 }
  const to: Pose = { x: 4, y: 0, z: 2, yaw: 0.1, flip: 0, scale: 1, roll: 0 }
  const segment = flight(from, to, 2, 3)

  it('holds before it starts and lands exactly when it ends', () => {
    const out = { ...from }
    expect(sampleSegment(segment, 1, out)).toBe(false)
    expect(out).toEqual(from)
    expect(sampleSegment(segment, 2 + segment.dur, out)).toBe(true)
    expect(out).toEqual(to)
  })

  it('rises mid-flight', () => {
    const out = { ...from }
    let highest = 0
    for (let t = 0; t <= 1; t += 0.05) {
      sampleSegment(segment, 2 + segment.dur * t, out)
      highest = Math.max(highest, out.y)
    }
    expect(highest).toBeGreaterThan(0.2)
  })
})
