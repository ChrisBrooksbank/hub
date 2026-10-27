import { describe, expect, it, vi } from 'vitest'
import { BufferGeometry, Material, Points, Scene } from 'three'
import { createParticles, type ParticleField } from '../engine/particles'
import { ThemeApplier } from '../engine/theme-applier'
import { THEMES } from './index'
import { professional } from './professional'
import type { Theme } from './types'

function channel(value: number): number {
  const c = value / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16)
  return (
    0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255)
  )
}

function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}

const AA = 4.5

describe('WCAG AA contrast', () => {
  it('computes known ratios', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 0)
    expect(contrastRatio('#777777', '#777777')).toBe(1)
  })

  it.each(THEMES.map((t) => [t.id, t] as [string, Theme]))('%s text is readable', (_, t) => {
    const { palette } = t
    expect(contrastRatio(palette.text, palette.surface)).toBeGreaterThanOrEqual(AA)
    expect(contrastRatio(palette.textMuted, palette.surface)).toBeGreaterThanOrEqual(AA)
    expect(contrastRatio(palette.text, palette.background)).toBeGreaterThanOrEqual(AA)
    expect(contrastRatio(palette.textMuted, palette.background)).toBeGreaterThanOrEqual(AA)
    expect(contrastRatio(palette.accentText, palette.accent)).toBeGreaterThanOrEqual(AA)
  })
})

describe('theme extensibility', () => {
  const dummy: Theme = {
    ...professional,
    id: 'dummy-fifth',
    label: 'Dummy',
    palette: { ...professional.palette, background: '#223344' },
    background: { kind: 'color', color: '#223344' },
    fog: { color: '#223344', near: 2, far: 20 },
    copy: { ...professional.copy, heading: 'Dummy heading' },
  }

  it('applies a theme unknown to the engine with no engine changes', () => {
    const scene = new Scene()
    const cssTarget = document.createElement('div')
    const onCopy = vi.fn()
    const applier = new ThemeApplier({ scene, cssTarget, onCopy, reducedMotion: true })
    applier.apply(dummy)
    expect(onCopy).toHaveBeenCalledWith(dummy.copy)
    expect(cssTarget.style.getPropertyValue('--theme-background')).toBe('#223344')
    expect(createParticles(dummy, 1, false)).toBeUndefined()
    applier.dispose()
  })
})

describe('theme switching leaks no GPU resources', () => {
  it('keeps the scene stable and disposes every particle field over 20 switches', () => {
    const geometryDispose = vi.spyOn(BufferGeometry.prototype, 'dispose')
    const materialDispose = vi.spyOn(Material.prototype, 'dispose')
    const scene = new Scene()
    const applier = new ThemeApplier({ scene, reducedMotion: false })
    const baseline = scene.children.length
    let field: ParticleField | undefined
    let created = 0

    for (let i = 0; i < 20; i++) {
      const theme = THEMES[i % THEMES.length] as Theme
      applier.apply(theme)
      applier.update(1)
      field?.dispose()
      field = createParticles(theme, 1, false)
      if (field) {
        created++
        field.addTo(scene)
      }
      const points = scene.children.filter((c) => c instanceof Points)
      expect(points).toHaveLength(field ? 1 : 0)
      expect(scene.children.length).toBe(baseline + points.length)
    }

    field?.dispose()
    applier.dispose()
    expect(scene.children).toHaveLength(0)
    expect(created).toBeGreaterThan(0)
    expect(geometryDispose).toHaveBeenCalledTimes(created)
    expect(materialDispose.mock.calls.length).toBeGreaterThanOrEqual(created)
    geometryDispose.mockRestore()
    materialDispose.mockRestore()
  })
})
