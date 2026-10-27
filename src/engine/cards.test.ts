import { beforeAll, describe, expect, it, vi } from 'vitest'
import { PerspectiveCamera, Texture } from 'three'
import type { Site } from '../data/schema'
import { CardField, TextureCache, cardLabelText, createRoundedRectGeometry } from './cards'
import { createRingLayout } from './layout/strategies'

function site(id: string, overrides: Partial<Site> = {}): Site {
  return {
    id,
    name: `Site ${id}`,
    url: `https://${id}.netlify.app`,
    description: '',
    category: 'Games',
    tags: [],
    language: null,
    isPrivateRepo: false,
    lastPushed: null,
    status: 'live',
    ...overrides,
  }
}

function build(sites: Site[], cache = new TextureCache(() => Promise.resolve(new Texture()))) {
  const { placements } = createRingLayout().place(sites)
  return new CardField(sites, placements, cache)
}

describe('TextureCache', () => {
  it('loads each URL once and shares the texture', async () => {
    const load = vi.fn(() => Promise.resolve(new Texture()))
    const cache = new TextureCache(load)
    const [a, b] = await Promise.all([cache.get('/a.webp'), cache.get('/a.webp')])
    expect(a).toBe(b)
    expect(load).toHaveBeenCalledTimes(1)
    expect(cache.size).toBe(1)
  })

  it('resolves undefined when loading fails', async () => {
    const cache = new TextureCache(() => Promise.reject(new Error('404')))
    await expect(cache.get('/missing.webp')).resolves.toBeUndefined()
  })

  it('disposes loaded textures', async () => {
    const texture = new Texture()
    const dispose = vi.spyOn(texture, 'dispose')
    const cache = new TextureCache(() => Promise.resolve(texture))
    await cache.get('/a.webp')
    cache.dispose()
    expect(dispose).toHaveBeenCalledTimes(1)
  })
})

describe('createRoundedRectGeometry', () => {
  it('maps UVs to the 0..1 range', () => {
    const geometry = createRoundedRectGeometry(3, 2, 0.3)
    const uv = geometry.getAttribute('uv')
    for (let i = 0; i < uv.count; i++) {
      expect(uv.getX(i)).toBeGreaterThanOrEqual(-1e-6)
      expect(uv.getX(i)).toBeLessThanOrEqual(1 + 1e-6)
      expect(uv.getY(i)).toBeGreaterThanOrEqual(-1e-6)
      expect(uv.getY(i)).toBeLessThanOrEqual(1 + 1e-6)
    }
  })
})

describe('cardLabelText', () => {
  it('adds an offline note for dead sites only', () => {
    expect(cardLabelText({ name: 'A', status: 'live' })).toEqual(['A'])
    expect(cardLabelText({ name: 'A', status: 'dead' })).toEqual(['A', 'may be offline'])
  })
})

describe('CardField', () => {
  it('creates one card per placed site and skips unknown placements', () => {
    const sites = [site('a'), site('b'), site('c')]
    const { placements } = createRingLayout().place(sites)
    const field = new CardField(sites.slice(0, 2), placements)
    expect(field.cards.size).toBe(2)
    field.dispose()
  })

  it('applies the thumbnail once the shared cache resolves', async () => {
    const field = build([site('a', { thumb: '/thumbs/a.webp' })])
    await Promise.resolve()
    await Promise.resolve()
    const material = field.cards.get('a')!.face.material
    expect(material.map).toBeInstanceOf(Texture)
    field.dispose()
  })

  it('keeps the accent fallback when the thumbnail fails to load', async () => {
    const field = build(
      [site('a', { thumb: '/thumbs/a.webp' })],
      new TextureCache(() => Promise.reject(new Error('404'))),
    )
    await Promise.resolve()
    await Promise.resolve()
    const material = field.cards.get('a')!.face.material
    expect(material.map).toBeNull()
    field.dispose()
  })

  it('dims dead sites and filtered-out cards', () => {
    const field = build([site('a'), site('b', { status: 'dead' })])
    const opacity = (id: string) => field.cards.get(id)!.face.material.opacity
    expect(opacity('a')).toBe(1)
    expect(opacity('b')).toBeLessThan(0.5)
    field.applyFilter(new Set(['b']), true)
    expect(opacity('a')).toBeLessThan(0.5)
    expect(opacity('b')).toBeLessThan(0.5)
    field.applyFilter(new Set(['a', 'b']), true)
    expect(opacity('a')).toBe(1)
    field.dispose()
  })

  it('animates the filter dim over several frames', () => {
    const field = build([site('a'), site('b')])
    const opacity = (id: string) => field.cards.get(id)!.face.material.opacity
    field.applyFilter(new Set(['b']))
    expect(opacity('a')).toBe(1)
    field.update(0.1)
    const mid = opacity('a')
    expect(mid).toBeLessThan(1)
    expect(mid).toBeGreaterThan(0.18)
    expect(opacity('b')).toBe(1)
    field.update(1)
    expect(opacity('a')).toBeCloseTo(0.18)
    field.applyFilter(new Set(['a', 'b']))
    field.update(1)
    expect(opacity('a')).toBe(1)
    expect(field.cards.get('a')!.update(1)).toBe(false)
    field.dispose()
  })

  it('picks the card in front of the camera', () => {
    const sites = [site('a'), site('b'), site('c'), site('d')]
    const field = build(sites)
    const camera = new PerspectiveCamera(50, 1, 0.1, 200)
    camera.position.set(0, 0, 30)
    camera.lookAt(0, 0, 0)
    camera.updateMatrixWorld()
    const { placements } = createRingLayout().place(sites)
    const front = placements.reduce((best, p) => (p.position[2] > best.position[2] ? p : best))
    field.group.updateMatrixWorld(true)
    const target = field.cards.get(front.id)!.group.position.clone().project(camera)
    expect(field.pick(target.x, target.y, camera)?.site.id).toBe(front.id)
    expect(field.pick(0.99, 0.99, camera)).toBeUndefined()
    field.dispose()
  })

  it('disposes per-card resources, shared geometry and cached textures', async () => {
    const field = build([site('a', { thumb: '/thumbs/a.webp' })])
    await Promise.resolve()
    await Promise.resolve()
    const card = field.cards.get('a')!
    const geometry = vi.spyOn(card.face.geometry, 'dispose')
    const material = vi.spyOn(card.face.material, 'dispose')
    const texture = card.face.material.map!
    const textureDispose = vi.spyOn(texture, 'dispose')
    field.dispose()
    expect(geometry).toHaveBeenCalled()
    expect(material).toHaveBeenCalledTimes(1)
    expect(textureDispose).toHaveBeenCalled()
    expect(field.cards.size).toBe(0)
  })
})

beforeAll(() => {
  // jsdom has no canvas; cards fall back to a hidden label, which is what we want here.
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
})
