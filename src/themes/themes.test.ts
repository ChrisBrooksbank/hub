import { describe, expect, it } from 'vitest'
import { DEFAULT_THEME_ID, THEMES, getTheme } from './index'
import type { Theme } from './types'

const HEX = /^#[0-9a-fA-F]{6}$/

describe('theme registry', () => {
  it('has unique ids', () => {
    const ids = THEMES.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('registers the default theme', () => {
    expect(THEMES.some((t) => t.id === DEFAULT_THEME_ID)).toBe(true)
  })

  it('falls back to the default theme for unknown ids', () => {
    expect(getTheme('nope').id).toBe(DEFAULT_THEME_ID)
    expect(getTheme(null).id).toBe(DEFAULT_THEME_ID)
  })

  it.each(THEMES.map((t) => [t.id, t] as [string, Theme]))(
    '%s has every required field',
    (_, t) => {
      expect(t.label).not.toBe('')
      expect(['scene', 'list']).toContain(t.presentation)
      for (const colour of Object.values(t.palette)) expect(colour).toMatch(HEX)
      expect(t.fonts.body).not.toBe('')
      expect(t.fonts.heading).not.toBe('')
      expect(t.background.kind).toBeDefined()
      expect(t.fog.far).toBeGreaterThan(t.fog.near)
      expect(t.lights.key.position).toHaveLength(3)
      expect(t.cardStyle.cornerRadius).toBeGreaterThanOrEqual(0)
      expect(t.layout.strategy).toBeDefined()
      expect(t.motion.idleSpeed).toBeGreaterThanOrEqual(0)
      for (const text of Object.values(t.copy)) expect(text).not.toBe('')
    },
  )

  it('retro arcade is a scene theme with a pixel font, static scanlines and arcade copy', () => {
    const retro = getTheme('retro-arcade')
    expect(retro.id).toBe('retro-arcade')
    expect(retro.presentation).toBe('scene')
    expect(retro.fonts.heading).toContain('Press Start 2P')
    expect(retro.postFx.scanlines).toBeDefined()
    expect(retro.motion.cameraShake).toBe(0)
    expect(retro.copy.launchLabel).toBe('INSERT COIN TO LAUNCH')
  })

  it('basic is a no-animation list theme with system fonts', () => {
    const basic = getTheme('basic')
    expect(basic.id).toBe('basic')
    expect(basic.presentation).toBe('list')
    expect(basic.motion.idleSpeed).toBe(0)
    expect(basic.fonts.body).toContain('system-ui')
    expect(basic.fonts.stylesheet).toBeUndefined()
    expect(basic.palette).toMatchObject({ background: '#ffffff', text: '#000000' })
  })
})
