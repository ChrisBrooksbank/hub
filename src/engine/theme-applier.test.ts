import { describe, expect, it, vi } from 'vitest'
import { Color, Fog, Scene } from 'three'
import { THEMES } from '../themes'
import { professional } from '../themes/professional'
import type { Theme } from '../themes/types'
import { ThemeApplier } from './theme-applier'

const light: Theme = {
  ...professional,
  id: 'light-test',
  background: { kind: 'color', color: '#ffffff' },
  fog: { color: '#ffffff', near: 10, far: 50 },
  lights: {
    ambient: { color: '#ffffff', intensity: 2 },
    key: { color: '#ff0000', intensity: 0, position: [0, 0, 0] },
  },
  copy: { ...professional.copy, heading: 'Light' },
}

function setup(reducedMotion = false) {
  const scene = new Scene()
  const cssTarget = document.createElement('div')
  const onCopy = vi.fn()
  const applier = new ThemeApplier({ scene, cssTarget, onCopy, reducedMotion })
  return { scene, cssTarget, onCopy, applier }
}

describe('ThemeApplier', () => {
  it('applies the first theme instantly', () => {
    const { scene, applier } = setup()
    applier.apply(professional)
    expect((scene.background as Color).getHexString()).toBe('0f172a')
    expect((scene.fog as Fog).far).toBe(30)
    expect(applier.ambient.intensity).toBe(0.8)
    expect(applier.fading).toBe(false)
  })

  it('cross-fades over ~600ms', () => {
    const { scene, applier } = setup()
    applier.apply(professional)
    applier.apply(light)
    expect(applier.fading).toBe(true)
    applier.update(0.3)
    expect((scene.fog as Fog).far).toBeCloseTo(40)
    expect(applier.ambient.intensity).toBeCloseTo(1.4)
    expect((scene.background as Color).getHexString()).not.toBe('ffffff')
    applier.update(0.3)
    expect(applier.fading).toBe(false)
    expect((scene.background as Color).getHexString()).toBe('ffffff')
    expect(applier.key.intensity).toBe(0)
  })

  it('cuts instantly under reduced motion', () => {
    const { scene, applier } = setup(true)
    applier.apply(professional)
    applier.apply(light)
    expect(applier.fading).toBe(false)
    expect((scene.background as Color).getHexString()).toBe('ffffff')
  })

  it('applies fonts, palette and copy to the DOM', () => {
    const { cssTarget, onCopy, applier } = setup()
    applier.apply(professional)
    expect(cssTarget.style.getPropertyValue('--theme-accent-text')).toBe('#ffffff')
    expect(cssTarget.style.getPropertyValue('--theme-font-body')).toContain('Inter')
    expect(onCopy).toHaveBeenCalledWith(professional.copy)
  })

  it('handles every registered theme without reading theme.id', () => {
    const { applier } = setup()
    for (const theme of THEMES) {
      expect(() => applier.apply({ ...theme, id: '' })).not.toThrow()
    }
  })

  it('removes its lights on dispose', () => {
    const { scene, applier } = setup()
    applier.dispose()
    expect(scene.children).not.toContain(applier.ambient)
    expect(scene.children).not.toContain(applier.key)
  })
})
