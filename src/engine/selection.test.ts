import { describe, expect, it, vi } from 'vitest'
import { PerspectiveCamera, Texture, Vector3 } from 'three'
import type { Site } from '../data/schema'
import { CardField, TextureCache } from './cards'
import { GalleryControls } from './controls'
import { createRingLayout } from './layout/strategies'
import {
  CameraRig,
  SelectionController,
  framingPose,
  parseSiteHash,
  siteHash,
  type HashAdapter,
} from './selection'

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

function memoryHash(initial = ''): HashAdapter & { value: string; fire(): void } {
  const listeners = new Set<() => void>()
  const adapter = {
    value: initial,
    get: () => adapter.value,
    set(id: string | undefined) {
      adapter.value = id === undefined ? '' : siteHash(id)
    },
    subscribe(cb: () => void) {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    fire() {
      listeners.forEach((cb) => cb())
    },
  }
  return adapter
}

function setup(hash = memoryHash(), reducedMotion = false) {
  const sites = ['a', 'b', 'c'].map(site)
  const { placements } = createRingLayout().place(sites)
  const field = new CardField(
    sites,
    placements,
    new TextureCache(() => Promise.resolve(new Texture())),
  )
  const camera = new PerspectiveCamera(50, 1, 0.1, 200)
  camera.position.set(0, 0, 12)
  const parent = document.createElement('div')
  const element = document.createElement('canvas')
  parent.appendChild(element)
  const controls = new GalleryControls({ reducedMotion })
  const onChange = vi.fn()
  const selection = new SelectionController({ field, camera, controls, element, hash, onChange })
  return { selection, field, camera, controls, hash, onChange, element }
}

describe('deep link hash', () => {
  it('round-trips ids and rejects other hashes', () => {
    expect(parseSiteHash(siteHash('my site'))).toBe('my site')
    expect(parseSiteHash('#/other')).toBeUndefined()
    expect(parseSiteHash('#/site/')).toBeUndefined()
    expect(parseSiteHash('#/site/%E0%A4%A')).toBeUndefined()
  })
})

describe('framingPose', () => {
  it('places the camera outward of the card, on its radial line', () => {
    const pose = framingPose(new Vector3(0, 2, -6), 4)
    expect(pose.position.x).toBeCloseTo(0)
    expect(pose.position.y).toBeCloseTo(2)
    expect(pose.position.z).toBeCloseTo(-10)
    expect(pose.target.z).toBe(-6)
  })
})

describe('CameraRig', () => {
  it('eases to the target and settles exactly', () => {
    const camera = new PerspectiveCamera()
    camera.position.set(0, 0, 12)
    const rig = new CameraRig(camera)
    rig.flyTo(new Vector3(5, 0, 0), new Vector3(1, 0, 0))
    rig.update(0.3)
    expect(rig.isAnimating).toBe(true)
    rig.update(2)
    expect(rig.isAnimating).toBe(false)
    expect(camera.position.x).toBeCloseTo(5)
  })

  it('cuts instantly under reduced motion', () => {
    const camera = new PerspectiveCamera()
    const rig = new CameraRig(camera)
    rig.flyTo(new Vector3(5, 0, 0), new Vector3(), true)
    expect(rig.isAnimating).toBe(false)
    expect(camera.position.x).toBe(5)
  })
})

describe('SelectionController', () => {
  it('selects a card, pauses controls, flies the camera and writes the hash', () => {
    const { selection, controls, hash, onChange } = setup()
    selection.select('b')
    expect(selection.selected?.id).toBe('b')
    expect(controls.enabled).toBe(false)
    expect(selection.rig.isAnimating).toBe(true)
    expect(hash.value).toBe('#/site/b')
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'b' }))
  })

  it('returns to the overview on Escape', () => {
    const { selection, controls, hash, onChange, camera } = setup(memoryHash(), true)
    selection.select('a')
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(selection.selected).toBeUndefined()
    expect(controls.enabled).toBe(true)
    expect(hash.value).toBe('')
    expect(onChange).toHaveBeenLastCalledWith(undefined)
    expect(camera.position.z).toBeCloseTo(12)
  })

  it('selects from a deep link and clears when the hash goes away (Back)', () => {
    const { selection, hash } = setup(memoryHash('#/site/c'))
    selection.syncFromHash()
    expect(selection.selected?.id).toBe('c')
    hash.value = ''
    hash.fire()
    expect(selection.selected).toBeUndefined()
  })

  it('ignores unknown deep-link ids', () => {
    const { selection, onChange } = setup(memoryHash('#/site/nope'))
    selection.syncFromHash()
    expect(selection.selected).toBeUndefined()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('pickNear forgives near-misses that pick rejects', () => {
    const { field, camera } = setup()
    camera.updateMatrixWorld(true)
    field.group.updateMatrixWorld(true)
    const card = field.cards.get('a')!
    const ndc = card.group.getWorldPosition(new Vector3()).project(camera)
    expect(field.pick(ndc.x, ndc.y, camera)).toBe(card)
    // Far enough off-card that a direct pick misses.
    const offX = ndc.x + 3
    expect(field.pick(offX, ndc.y, camera)).toBeUndefined()
    expect(field.pickNear(offX, ndc.y, camera, 0.1, 0.1)).toBeUndefined()
    expect(field.pickNear(offX, ndc.y, camera, 3.5, 3.5)).toBeDefined()
  })

  it('stops listening after dispose', () => {
    const { selection } = setup()
    selection.dispose()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(selection.tooltip.isConnected).toBe(false)
  })

  it('eases hover emphasis on and off for the hovered card', () => {
    const { selection, field } = setup()
    const card = field.cards.get('a')!
    const spy = vi.spyOn(card, 'setHover')
    // @ts-expect-error reaching into private state to simulate a hover without WebGL picking
    selection.setHovered(card)
    selection.update(0.1)
    expect(spy).toHaveBeenCalled()
    const first = spy.mock.calls[0]![0]
    expect(first).toBeGreaterThan(0)
    selection.update(0.5)
    expect(spy.mock.calls.at(-1)![0]).toBeGreaterThan(first)
  })
})
