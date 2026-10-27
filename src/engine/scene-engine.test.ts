import { describe, expect, it, vi } from 'vitest'
import { BoxGeometry, Mesh, MeshBasicMaterial, Texture } from 'three'
import { SceneEngine, type EngineRenderer } from './scene-engine'

function mockRenderer(): EngineRenderer & { calls: Record<string, ReturnType<typeof vi.fn>> } {
  const calls = {
    setSize: vi.fn(),
    setPixelRatio: vi.fn(),
    setAnimationLoop: vi.fn(),
    render: vi.fn(),
    dispose: vi.fn(),
  }
  return {
    domElement: document.createElement('canvas'),
    ...calls,
    calls,
  } as unknown as EngineRenderer & { calls: Record<string, ReturnType<typeof vi.fn>> }
}

function setup() {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const renderer = mockRenderer()
  const engine = new SceneEngine({
    container,
    createRenderer: () => renderer,
  })
  return { container, renderer, engine }
}

describe('SceneEngine', () => {
  it('mounts the canvas and sizes the renderer', () => {
    const { container, renderer } = setup()
    expect(container.querySelector('canvas')).toBe(renderer.domElement)
    expect(renderer.calls.setSize).toHaveBeenCalled()
  })

  it('runs frame callbacks and renders on tick', () => {
    const { engine, renderer } = setup()
    const callback = vi.fn()
    engine.onFrame(callback)
    engine.tick(1000)
    engine.tick(1500)
    expect(callback).toHaveBeenLastCalledWith(0.5, 0.5)
    expect(renderer.calls.render).toHaveBeenCalledTimes(2)
  })

  it('starts and stops the animation loop once', () => {
    const { engine, renderer } = setup()
    engine.start()
    engine.start()
    expect(renderer.calls.setAnimationLoop).toHaveBeenCalledTimes(1)
    engine.stop()
    expect(renderer.calls.setAnimationLoop).toHaveBeenLastCalledWith(null)
  })

  it('updates camera aspect on resize', () => {
    const { container, engine } = setup()
    Object.defineProperty(container, 'clientWidth', { value: 800, configurable: true })
    Object.defineProperty(container, 'clientHeight', { value: 400, configurable: true })
    engine.resize()
    expect(engine.camera.aspect).toBe(2)
  })

  it('disposes geometries, materials, textures and the renderer', () => {
    const { container, engine, renderer } = setup()
    const geometry = new BoxGeometry()
    const texture = new Texture()
    const material = new MeshBasicMaterial({ map: texture })
    engine.scene.add(new Mesh(geometry, material))

    const geometryDispose = vi.spyOn(geometry, 'dispose')
    const materialDispose = vi.spyOn(material, 'dispose')
    const textureDispose = vi.spyOn(texture, 'dispose')

    engine.start()
    engine.dispose()
    engine.dispose()

    expect(geometryDispose).toHaveBeenCalledTimes(1)
    expect(materialDispose).toHaveBeenCalledTimes(1)
    expect(textureDispose).toHaveBeenCalledTimes(1)
    expect(renderer.calls.dispose).toHaveBeenCalledTimes(1)
    expect(renderer.calls.setAnimationLoop).toHaveBeenLastCalledWith(null)
    expect(engine.scene.children).toHaveLength(0)
    expect(container.querySelector('canvas')).toBeNull()
  })
})
