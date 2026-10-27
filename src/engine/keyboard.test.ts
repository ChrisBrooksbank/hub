import { describe, expect, it } from 'vitest'
import { PerspectiveCamera, Texture } from 'three'
import type { Site } from '../data/schema'
import { CardField, TextureCache } from './cards'
import { GalleryControls } from './controls'
import { KeyboardNav, nextCardId } from './keyboard'
import { createRingLayout } from './layout/strategies'
import type { CardPlacement } from './layout/types'
import { SelectionController, type HashAdapter } from './selection'

function place(id: string, angle: number, y: number): CardPlacement {
  return {
    id,
    position: [Math.sin(angle) * 6, y, Math.cos(angle) * 6],
    rotationY: angle,
    rotationX: 0,
  }
}

// Top band: a(-0.5) b(0) c(0.5); bottom band: d(-0.4) e(0.6)
const placements = [
  place('a', -0.5, 2),
  place('b', 0, 2),
  place('c', 0.5, 2),
  place('d', -0.4, -2),
  place('e', 0.6, -2),
]

describe('nextCardId', () => {
  it('starts at the first card of the top band', () => {
    expect(nextCardId(placements, undefined, 'ArrowRight')).toBe('a')
  })

  it('moves right and left along the band, wrapping around', () => {
    expect(nextCardId(placements, 'a', 'ArrowRight')).toBe('b')
    expect(nextCardId(placements, 'c', 'ArrowRight')).toBe('a')
    expect(nextCardId(placements, 'a', 'ArrowLeft')).toBe('c')
  })

  it('moves between bands to the angularly nearest card', () => {
    expect(nextCardId(placements, 'b', 'ArrowDown')).toBe('d')
    expect(nextCardId(placements, 'c', 'ArrowDown')).toBe('e')
    expect(nextCardId(placements, 'e', 'ArrowUp')).toBe('c')
  })

  it('stays put at the top and bottom edges', () => {
    expect(nextCardId(placements, 'b', 'ArrowUp')).toBe('b')
    expect(nextCardId(placements, 'd', 'ArrowDown')).toBe('d')
  })

  it('skips cards excluded by the filter', () => {
    const matching = new Set(['a', 'c'])
    expect(nextCardId(placements, 'a', 'ArrowRight', matching)).toBe('c')
    expect(nextCardId(placements, undefined, 'ArrowRight', new Set())).toBeUndefined()
  })
})

function site(id: string): Site {
  return {
    id,
    name: `Site ${id}`,
    url: `https://${id}.netlify.app`,
    description: 'desc',
    category: 'Games',
    tags: [],
    language: null,
    isPrivateRepo: false,
    lastPushed: null,
    status: 'live',
  }
}

describe('KeyboardNav', () => {
  function setup() {
    const sites = ['a', 'b', 'c'].map(site)
    const { placements: ring } = createRingLayout().place(sites)
    const field = new CardField(sites, ring, new TextureCache(() => Promise.resolve(new Texture())))
    const parent = document.createElement('div')
    const canvas = document.createElement('canvas')
    parent.appendChild(canvas)
    const hash: HashAdapter = {
      get: () => '',
      set: () => undefined,
      subscribe: () => () => undefined,
    }
    const selection = new SelectionController({
      field,
      camera: new PerspectiveCamera(),
      controls: new GalleryControls({ reducedMotion: true }),
      element: canvas,
      hash,
    })
    const nav = new KeyboardNav({ canvas, selection, placements: ring, siteCount: () => 3 })
    return { canvas, selection, nav, parent }
  }

  it('gives the canvas focus, a name and a description', () => {
    const { canvas, nav } = setup()
    expect(canvas.tabIndex).toBe(0)
    expect(canvas.getAttribute('aria-label')).toBe('Site gallery, 3 sites')
    const describedBy = canvas.getAttribute('aria-describedby')!
    expect(nav.description.id).toBe(describedBy)
    expect(nav.description.textContent).toContain('arrow keys')
  })

  it('selects with Enter, then arrow keys move the selection', () => {
    const { canvas, selection } = setup()
    canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
    const first = selection.selected?.id
    expect(first).toBeDefined()
    canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    expect(selection.selected?.id).not.toBe(first)
  })

  it('removes its listener and description on dispose', () => {
    const { canvas, selection, nav } = setup()
    nav.dispose()
    canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    expect(selection.selected).toBeUndefined()
    expect(nav.description.isConnected).toBe(false)
  })
})
