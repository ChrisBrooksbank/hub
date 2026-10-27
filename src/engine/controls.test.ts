import { describe, expect, it } from 'vitest'
import { GalleryControls, attachPointerControls } from './controls'

function run(controls: GalleryControls, seconds: number, step = 1 / 60): void {
  for (let t = 0; t < seconds; t += step) controls.update(step)
}

describe('GalleryControls', () => {
  it('auto-rotates only after the idle delay', () => {
    const controls = new GalleryControls({ idleDelay: 2, autoRotateSpeed: 0.5 })
    run(controls, 1.5)
    expect(controls.angle).toBe(0)
    run(controls, 2)
    expect(controls.angle).toBeGreaterThan(0.3)
  })

  it('does not auto-rotate or coast under reduced motion', () => {
    const controls = new GalleryControls({ reducedMotion: true, idleDelay: 0 })
    controls.beginDrag()
    controls.drag(100, 0.016)
    controls.endDrag()
    const angle = controls.angle
    run(controls, 3)
    expect(controls.angle).toBe(angle)
  })

  it('applies drag directly and coasts with decaying inertia', () => {
    const controls = new GalleryControls({ idleDelay: 100 })
    controls.beginDrag()
    controls.drag(50, 0.016)
    controls.drag(50, 0.016)
    const dragged = controls.angle
    expect(dragged).toBeCloseTo(100 * 0.006)
    controls.endDrag()
    run(controls, 0.5)
    const coasted = controls.angle
    expect(coasted).toBeGreaterThan(dragged)
    run(controls, 5)
    const settled = controls.angle
    run(controls, 1)
    expect(controls.angle).toBeCloseTo(settled, 3)
  })

  it('pauses auto-rotation while dragging', () => {
    const controls = new GalleryControls({ idleDelay: 0, autoRotateSpeed: 1 })
    controls.beginDrag()
    run(controls, 1)
    expect(controls.angle).toBe(0)
  })

  it('moves along the axis with damping and clamps to limits', () => {
    const controls = new GalleryControls({ axisMin: -1, axisMax: 1 })
    controls.scroll(100)
    run(controls, 3)
    expect(controls.axis).toBeGreaterThan(0)
    expect(controls.axis).toBeLessThanOrEqual(1)
    controls.scroll(-100000)
    run(controls, 3)
    expect(controls.axis).toBe(-1)
  })

  it('moves along the axis instantly under reduced motion', () => {
    const controls = new GalleryControls({ reducedMotion: true })
    controls.scroll(100)
    expect(controls.axis).toBeCloseTo(1)
  })

  it('freezes when disabled', () => {
    const controls = new GalleryControls({ idleDelay: 0 })
    controls.enabled = false
    run(controls, 2)
    expect(controls.angle).toBe(0)
  })
})

describe('attachPointerControls', () => {
  function pointer(type: string, id: number, x: number, y = 0): PointerEvent {
    const event = new Event(type, { cancelable: true }) as PointerEvent
    Object.assign(event, { pointerId: id, clientX: x, clientY: y })
    return event
  }

  it('turns a drag into rotation and removes listeners on cleanup', () => {
    const element = document.createElement('div')
    const controls = new GalleryControls()
    let time = 0
    const detach = attachPointerControls(element, controls, () => (time += 16))
    element.dispatchEvent(pointer('pointerdown', 1, 0))
    element.dispatchEvent(pointer('pointermove', 1, 40))
    element.dispatchEvent(pointer('pointerup', 1, 40))
    expect(controls.angle).toBeCloseTo(40 * 0.006)
    expect(controls.isDragging).toBe(false)

    detach()
    element.dispatchEvent(pointer('pointerdown', 1, 0))
    expect(controls.isDragging).toBe(false)
  })

  it('maps wheel to axis movement and prevents page scroll', () => {
    const element = document.createElement('div')
    const controls = new GalleryControls({ reducedMotion: true })
    attachPointerControls(element, controls)
    const wheel = new Event('wheel', { cancelable: true }) as WheelEvent
    Object.assign(wheel, { deltaY: 100 })
    element.dispatchEvent(wheel)
    expect(wheel.defaultPrevented).toBe(true)
    expect(controls.axis).toBeCloseTo(1)
  })

  it('maps a two-finger pinch to axis movement', () => {
    const element = document.createElement('div')
    const controls = new GalleryControls({ reducedMotion: true })
    attachPointerControls(element, controls)
    element.dispatchEvent(pointer('pointerdown', 1, 0))
    element.dispatchEvent(pointer('pointerdown', 2, 100))
    element.dispatchEvent(pointer('pointermove', 2, 50))
    expect(controls.axis).not.toBe(0)
  })
})
