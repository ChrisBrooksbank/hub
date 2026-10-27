import { describe, expect, it, vi } from 'vitest'
import { FrameMonitor, initialTier, isLowPowerDevice, QUALITY } from './quality'

describe('isLowPowerDevice', () => {
  it('flags mobile user agents', () => {
    expect(isLowPowerDevice({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17)' })).toBe(true)
    expect(isLowPowerDevice({ userAgent: 'Mozilla/5.0 (Linux; Android 14) Mobile' })).toBe(true)
  })

  it('flags few cores or little memory', () => {
    expect(isLowPowerDevice({ hardwareConcurrency: 2 })).toBe(true)
    expect(isLowPowerDevice({ deviceMemory: 2 })).toBe(true)
  })

  it('accepts a desktop', () => {
    expect(
      isLowPowerDevice({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        hardwareConcurrency: 12,
        deviceMemory: 8,
      }),
    ).toBe(false)
    expect(isLowPowerDevice({})).toBe(false)
  })
})

describe('initialTier', () => {
  it('maps to quality presets that reduce cost', () => {
    expect(initialTier({ hardwareConcurrency: 2 })).toBe('low')
    expect(initialTier({ hardwareConcurrency: 8 })).toBe('high')
    expect(QUALITY.low.pixelRatio).toBeLessThan(QUALITY.high.pixelRatio)
    expect(QUALITY.low.postFx).toBe(false)
    expect(QUALITY.low.particleScale).toBeLessThan(QUALITY.high.particleScale)
  })
})

describe('FrameMonitor', () => {
  const options = { warmupFrames: 2, sampleFrames: 5, slowFrameSeconds: 0.04 }

  it('fires once when frames are slow, ignoring warm-up', () => {
    const onSlow = vi.fn()
    const monitor = new FrameMonitor(onSlow, options)
    monitor.update(1) // warm-up spikes are ignored
    monitor.update(1)
    for (let i = 0; i < 10; i++) monitor.update(0.1)
    expect(onSlow).toHaveBeenCalledTimes(1)
    expect(monitor.finished).toBe(true)
  })

  it('stays quiet when frames are fast', () => {
    const onSlow = vi.fn()
    const monitor = new FrameMonitor(onSlow, options)
    for (let i = 0; i < 10; i++) monitor.update(1 / 60)
    expect(onSlow).not.toHaveBeenCalled()
    expect(monitor.finished).toBe(true)
  })

  it('ignores zero-length deltas', () => {
    const onSlow = vi.fn()
    const monitor = new FrameMonitor(onSlow, options)
    for (let i = 0; i < 10; i++) monitor.update(0)
    expect(monitor.finished).toBe(false)
  })
})
