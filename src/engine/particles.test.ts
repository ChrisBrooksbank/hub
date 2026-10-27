import { describe, expect, it } from 'vitest'
import { Scene } from 'three'
import { professional } from '../themes/professional'
import type { Theme } from '../themes/types'
import { createParticles, scaledParticleCount } from './particles'

const withParticles: Theme = {
  ...professional,
  ambientFx: { particles: { count: 100, size: 0.1, color: '#ffffff', speed: 1 } },
}

describe('particles', () => {
  it('scales counts and never goes negative', () => {
    expect(scaledParticleCount(100, 0.25)).toBe(25)
    expect(scaledParticleCount(100, 0)).toBe(0)
    expect(scaledParticleCount(100, -1)).toBe(0)
  })

  it('creates nothing without config or at zero scale', () => {
    expect(createParticles(professional, 1, false)).toBeUndefined()
    expect(createParticles(withParticles, 0, false)).toBeUndefined()
  })

  it('cuts the count on the low tier', () => {
    expect(createParticles(withParticles, 1, false)?.count).toBe(100)
    expect(createParticles(withParticles, 0.25, false)?.count).toBe(25)
  })

  it('drifts upward, wraps, and holds still under reduced motion', () => {
    const moving = createParticles(withParticles, 1, false)!
    const still = createParticles(withParticles, 1, true)!
    const before = still.points.geometry.getAttribute('position').array.slice()
    still.update(1)
    expect(Array.from(still.points.geometry.getAttribute('position').array)).toEqual(
      Array.from(before),
    )
    moving.update(100)
    const ys = moving.points.geometry.getAttribute('position').array
    for (let i = 1; i < ys.length; i += 3) expect(Math.abs(ys[i] ?? 99)).toBeLessThanOrEqual(12)
  })

  it('disposes geometry and removes itself from the scene', () => {
    const scene = new Scene()
    const field = createParticles(withParticles, 1, false)!
    field.addTo(scene)
    let disposed = false
    field.points.geometry.addEventListener('dispose', () => (disposed = true))
    field.dispose()
    expect(disposed).toBe(true)
    expect(scene.children).toHaveLength(0)
  })
})
