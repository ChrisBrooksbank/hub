import { describe, expect, it } from 'vitest'
import { hashString, renderArtPixels, seededRandom } from './procedural-art'

describe('procedural art', () => {
  it('hashes and seeds deterministically', () => {
    expect(hashString('moose')).toBe(hashString('moose'))
    expect(hashString('moose')).not.toBe(hashString('earth'))
    const a = seededRandom(7)
    const b = seededRandom(7)
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })

  it('gives the same pixels for the same id', () => {
    expect(renderArtPixels('life', '#33aa88', 64, 40)).toEqual(
      renderArtPixels('life', '#33aa88', 64, 40),
    )
  })

  it('gives different pixels for different ids', () => {
    expect(renderArtPixels('life', undefined, 64, 40)).not.toEqual(
      renderArtPixels('earth', undefined, 64, 40),
    )
  })

  it('is fully opaque and sized width*height*4', () => {
    const pixels = renderArtPixels('x', '#ff0000', 32, 20)
    expect(pixels).toHaveLength(32 * 20 * 4)
    for (let i = 3; i < pixels.length; i += 4) expect(pixels[i]).toBe(255)
  })

  it('uses the accent hue when given', () => {
    const pixels = renderArtPixels('x', '#ff0000', 32, 20)
    let r = 0
    let b = 0
    for (let i = 0; i < pixels.length; i += 4) {
      r += pixels[i]!
      b += pixels[i + 2]!
    }
    expect(r).toBeGreaterThan(b)
  })
})
