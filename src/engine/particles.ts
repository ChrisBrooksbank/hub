import { BufferAttribute, BufferGeometry, Points, PointsMaterial, type Scene } from 'three'
import type { Theme } from '../themes/types'

type ParticleConfig = NonNullable<Theme['ambientFx']['particles']>

/** Volume the particles drift through (half extents). */
const SPREAD = { x: 24, y: 12, z: 24 }

/** Particle count after quality scaling; 0 means no particles at all. */
export function scaledParticleCount(count: number, scale: number): number {
  return Math.max(0, Math.round(count * scale))
}

/** Slow rising drift; wraps vertically so the field never empties. */
export class ParticleField {
  readonly points: Points
  private readonly positions: Float32Array
  private readonly speed: number
  private readonly reducedMotion: boolean

  constructor(config: ParticleConfig, scale: number, reducedMotion = false) {
    const count = scaledParticleCount(config.count, scale)
    this.positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      this.positions[i * 3] = (Math.random() * 2 - 1) * SPREAD.x
      this.positions[i * 3 + 1] = (Math.random() * 2 - 1) * SPREAD.y
      this.positions[i * 3 + 2] = (Math.random() * 2 - 1) * SPREAD.z
    }
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new BufferAttribute(this.positions, 3))
    const material = new PointsMaterial({
      color: config.color,
      size: config.size,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    })
    this.points = new Points(geometry, material)
    this.points.frustumCulled = false
    this.speed = config.speed
    this.reducedMotion = reducedMotion
  }

  get count(): number {
    return this.positions.length / 3
  }

  update(deltaSeconds: number): void {
    if (this.reducedMotion || this.count === 0) return
    const rise = this.speed * deltaSeconds
    for (let i = 1; i < this.positions.length; i += 3) {
      let y = (this.positions[i] ?? 0) + rise
      if (y > SPREAD.y) y = ((y + SPREAD.y) % (SPREAD.y * 2)) - SPREAD.y
      this.positions[i] = y
    }
    this.points.geometry.getAttribute('position').needsUpdate = true
  }

  addTo(scene: Scene): void {
    scene.add(this.points)
  }

  dispose(): void {
    this.points.removeFromParent()
    this.points.geometry.dispose()
    ;(this.points.material as PointsMaterial).dispose()
  }
}

/** Creates a field for the theme, or undefined when the theme or quality tier wants none. */
export function createParticles(
  theme: Theme,
  scale: number,
  reducedMotion: boolean,
): ParticleField | undefined {
  const config = theme.ambientFx.particles
  if (!config || scaledParticleCount(config.count, scale) === 0) return undefined
  return new ParticleField(config, scale, reducedMotion)
}
