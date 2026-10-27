export interface ControlsOptions {
  /** Radians per second of idle rotation. */
  autoRotateSpeed?: number
  /** Seconds without input before auto-rotation resumes. */
  idleDelay?: number
  /** Exponential damping rate for inertia (higher stops sooner). */
  damping?: number
  /** Radians of rotation per pixel dragged. */
  dragSensitivity?: number
  /** World units along the axis per wheel delta pixel. */
  wheelSensitivity?: number
  /** Axis travel limits in world units. */
  axisMin?: number
  axisMax?: number
  /** Disables auto-rotation and inertia (prefers-reduced-motion). */
  reducedMotion?: boolean
}

const DEFAULTS = {
  autoRotateSpeed: 0.12,
  idleDelay: 2.5,
  damping: 4,
  dragSensitivity: 0.006,
  wheelSensitivity: 0.01,
  axisMin: -4,
  axisMax: 4,
}

const MAX_VELOCITY = 8

/**
 * Pure rotation/axis state for the gallery: idle auto-rotation, drag with inertia,
 * and movement along the axis. No DOM or three.js dependency, so it is unit-testable.
 */
export class GalleryControls {
  /** Rotation of the card group about the vertical axis, in radians. */
  angle = 0
  /** Position along the vertical axis (scroll/pinch). */
  axis = 0

  reducedMotion: boolean
  /** When false (e.g. a card is selected), auto-rotation and inertia are paused. */
  enabled = true

  private velocity = 0
  private axisVelocity = 0
  private idleTime = 0
  private dragging = false
  private readonly options: Required<Omit<ControlsOptions, 'reducedMotion'>>

  constructor(options: ControlsOptions = {}) {
    const { reducedMotion = false, ...rest } = options
    this.reducedMotion = reducedMotion
    this.options = { ...DEFAULTS, ...rest }
  }

  get isDragging(): boolean {
    return this.dragging
  }

  beginDrag(): void {
    this.dragging = true
    this.velocity = 0
    this.idleTime = 0
  }

  /** Rotate by a pointer movement of `dx` pixels over `dtSeconds`. */
  drag(dx: number, dtSeconds: number): void {
    const delta = dx * this.options.dragSensitivity
    this.angle += delta
    this.idleTime = 0
    if (dtSeconds > 0 && !this.reducedMotion) {
      const instant = clamp(delta / dtSeconds, -MAX_VELOCITY, MAX_VELOCITY)
      this.velocity = this.velocity * 0.5 + instant * 0.5
    }
  }

  endDrag(): void {
    this.dragging = false
    this.idleTime = 0
  }

  /** Move along the axis by `delta` pixels of wheel/pinch input. */
  scroll(delta: number): void {
    const move = delta * this.options.wheelSensitivity
    this.idleTime = 0
    if (this.reducedMotion) {
      this.axis = this.clampAxis(this.axis + move)
    } else {
      this.axisVelocity = clamp(this.axisVelocity + move * 6, -MAX_VELOCITY, MAX_VELOCITY)
    }
  }

  update(dtSeconds: number): void {
    if (!this.enabled) return
    const { damping, axisMin, axisMax, idleDelay, autoRotateSpeed } = this.options

    if (!this.dragging) {
      this.angle += this.velocity * dtSeconds
      this.velocity *= Math.exp(-damping * dtSeconds)
      if (Math.abs(this.velocity) < 1e-4) this.velocity = 0
      this.idleTime += dtSeconds
      if (!this.reducedMotion && this.idleTime >= idleDelay && this.velocity === 0) {
        this.angle += autoRotateSpeed * dtSeconds
      }
    }

    if (this.axisVelocity !== 0) {
      this.axis += this.axisVelocity * dtSeconds
      this.axisVelocity *= Math.exp(-damping * dtSeconds)
      if (Math.abs(this.axisVelocity) < 1e-4) this.axisVelocity = 0
      if (this.axis <= axisMin || this.axis >= axisMax) this.axisVelocity = 0
      this.axis = this.clampAxis(this.axis)
    }
  }

  private clampAxis(value: number): number {
    return clamp(value, this.options.axisMin, this.options.axisMax)
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/**
 * Wires pointer (drag, pinch) and wheel events on `element` to `controls`.
 * Returns a function that removes every listener.
 */
export function attachPointerControls(
  element: HTMLElement,
  controls: GalleryControls,
  now: () => number = () => performance.now(),
): () => void {
  const pointers = new Map<number, { x: number; y: number }>()
  let lastMove = 0
  let pinchDistance = 0

  const distance = (): number => {
    const [a, b] = [...pointers.values()]
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0
  }

  const onDown = (event: PointerEvent): void => {
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
    element.setPointerCapture?.(event.pointerId)
    lastMove = now()
    if (pointers.size === 1) controls.beginDrag()
    else if (pointers.size === 2) {
      controls.endDrag()
      pinchDistance = distance()
    }
  }

  const onMove = (event: PointerEvent): void => {
    const previous = pointers.get(event.pointerId)
    if (!previous) return
    const current = { x: event.clientX, y: event.clientY }
    pointers.set(event.pointerId, current)
    const time = now()
    if (pointers.size === 1) {
      controls.drag(current.x - previous.x, (time - lastMove) / 1000)
    } else if (pointers.size === 2) {
      const next = distance()
      // Spreading fingers moves up the axis, pinching moves down.
      controls.scroll((pinchDistance - next) * 2)
      pinchDistance = next
    }
    lastMove = time
  }

  const onUp = (event: PointerEvent): void => {
    if (!pointers.delete(event.pointerId)) return
    element.releasePointerCapture?.(event.pointerId)
    if (pointers.size === 0) controls.endDrag()
    else if (pointers.size === 1) controls.beginDrag()
  }

  const onWheel = (event: WheelEvent): void => {
    event.preventDefault()
    controls.scroll(event.deltaY)
  }

  element.addEventListener('pointerdown', onDown)
  element.addEventListener('pointermove', onMove)
  element.addEventListener('pointerup', onUp)
  element.addEventListener('pointercancel', onUp)
  element.addEventListener('wheel', onWheel, { passive: false })
  return () => {
    element.removeEventListener('pointerdown', onDown)
    element.removeEventListener('pointermove', onMove)
    element.removeEventListener('pointerup', onUp)
    element.removeEventListener('pointercancel', onUp)
    element.removeEventListener('wheel', onWheel)
  }
}
