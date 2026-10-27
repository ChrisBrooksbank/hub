import { describe, expect, it } from 'vitest'
import { hasPostFx, passNames } from './postfx-config'

describe('postfx config', () => {
  it('detects empty configs', () => {
    expect(hasPostFx({})).toBe(false)
    expect(hasPostFx({ grain: { amount: 0.02 } })).toBe(true)
  })

  it('lists passes in render order', () => {
    expect(passNames({})).toEqual(['render', 'output'])
    expect(passNames({ bloom: { strength: 1, radius: 0.5, threshold: 0.8 } })).toEqual([
      'render',
      'bloom',
      'output',
    ])
    expect(
      passNames({
        bloom: { strength: 1, radius: 0.5, threshold: 0.8 },
        scanlines: { intensity: 0.1, count: 300 },
        vignette: { darkness: 0.3 },
      }),
    ).toEqual(['render', 'bloom', 'finish', 'output'])
  })
})
