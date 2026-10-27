import { AmbientLight, Color, DirectionalLight, Fog, Vector3, type Scene } from 'three'
import type { Theme } from '../themes/types'

export const THEME_FADE_SECONDS = 0.6

export interface ThemeApplierOptions {
  scene: Scene
  /** Receives CSS custom properties (palette, fonts) for the DOM chrome. Defaults to none. */
  cssTarget?: HTMLElement
  /** Called with the new copy whenever a theme is applied. */
  onCopy?: (copy: Theme['copy']) => void
  /** Cross-fades are skipped and the theme is applied instantly. */
  reducedMotion?: boolean
}

interface FadeState {
  background: Color
  fogColor: Color
  fogNear: number
  fogFar: number
  ambientColor: Color
  ambientIntensity: number
  keyColor: Color
  keyIntensity: number
  keyPosition: Vector3
}

function backgroundColor(theme: Theme): string {
  switch (theme.background.kind) {
    case 'color':
      return theme.background.color
    case 'gradient':
      return theme.background.stops[0] ?? theme.palette.background
    case 'shader':
      return theme.palette.background
  }
}

function targetState(theme: Theme): FadeState {
  return {
    background: new Color(backgroundColor(theme)),
    fogColor: new Color(theme.fog.color),
    fogNear: theme.fog.near,
    fogFar: theme.fog.far,
    ambientColor: new Color(theme.lights.ambient.color),
    ambientIntensity: theme.lights.ambient.intensity,
    keyColor: new Color(theme.lights.key.color),
    keyIntensity: theme.lights.key.intensity,
    keyPosition: new Vector3(...theme.lights.key.position),
  }
}

/**
 * Applies a `Theme` to a scene (background, fog, lights) and the DOM (fonts, palette, copy).
 * Purely data driven: it never inspects `theme.id`. Switching cross-fades over ~600ms,
 * advanced by `update`, or cuts instantly under reduced motion.
 */
export class ThemeApplier {
  readonly ambient = new AmbientLight()
  readonly key = new DirectionalLight()

  private readonly scene: Scene
  private readonly options: ThemeApplierOptions
  private readonly current: FadeState = targetState({
    background: { kind: 'color', color: '#000000' },
    palette: { background: '#000000' },
    fog: { color: '#000000', near: 1, far: 100 },
    lights: {
      ambient: { color: '#ffffff', intensity: 0 },
      key: { color: '#ffffff', intensity: 0, position: [0, 0, 0] },
    },
  } as unknown as Theme)
  private from: FadeState | undefined
  private to: FadeState | undefined
  private progress = 1
  private applied = false

  constructor(options: ThemeApplierOptions) {
    this.options = options
    this.scene = options.scene
    this.scene.add(this.ambient, this.key)
    this.scene.background = this.current.background
    this.scene.fog = new Fog(this.current.fogColor, this.current.fogNear, this.current.fogFar)
  }

  get fading(): boolean {
    return this.progress < 1
  }

  apply(theme: Theme): void {
    this.applyDom(theme)
    const target = targetState(theme)
    if (!this.applied || this.options.reducedMotion) {
      this.assign(target)
      this.progress = 1
      this.from = undefined
      this.to = undefined
    } else {
      this.from = this.snapshot()
      this.to = target
      this.progress = 0
    }
    this.applied = true
  }

  /** Advances the cross-fade; call once per frame. */
  update(dtSeconds: number): void {
    if (!this.from || !this.to) return
    this.progress = Math.min(1, this.progress + dtSeconds / THEME_FADE_SECONDS)
    const t = this.progress
    const { from, to } = this
    this.current.background.lerpColors(from.background, to.background, t)
    this.current.fogColor.lerpColors(from.fogColor, to.fogColor, t)
    this.current.fogNear = from.fogNear + (to.fogNear - from.fogNear) * t
    this.current.fogFar = from.fogFar + (to.fogFar - from.fogFar) * t
    this.current.ambientColor.lerpColors(from.ambientColor, to.ambientColor, t)
    this.current.ambientIntensity =
      from.ambientIntensity + (to.ambientIntensity - from.ambientIntensity) * t
    this.current.keyColor.lerpColors(from.keyColor, to.keyColor, t)
    this.current.keyIntensity = from.keyIntensity + (to.keyIntensity - from.keyIntensity) * t
    this.current.keyPosition.lerpVectors(from.keyPosition, to.keyPosition, t)
    this.write()
    if (t >= 1) {
      this.from = undefined
      this.to = undefined
    }
  }

  dispose(): void {
    this.scene.remove(this.ambient, this.key)
    this.ambient.dispose()
    this.key.dispose()
  }

  private snapshot(): FadeState {
    return {
      background: this.current.background.clone(),
      fogColor: this.current.fogColor.clone(),
      fogNear: this.current.fogNear,
      fogFar: this.current.fogFar,
      ambientColor: this.current.ambientColor.clone(),
      ambientIntensity: this.current.ambientIntensity,
      keyColor: this.current.keyColor.clone(),
      keyIntensity: this.current.keyIntensity,
      keyPosition: this.current.keyPosition.clone(),
    }
  }

  private assign(target: FadeState): void {
    this.current.background.copy(target.background)
    this.current.fogColor.copy(target.fogColor)
    this.current.fogNear = target.fogNear
    this.current.fogFar = target.fogFar
    this.current.ambientColor.copy(target.ambientColor)
    this.current.ambientIntensity = target.ambientIntensity
    this.current.keyColor.copy(target.keyColor)
    this.current.keyIntensity = target.keyIntensity
    this.current.keyPosition.copy(target.keyPosition)
    this.write()
  }

  /** Pushes `current` onto the scene objects. */
  private write(): void {
    const { current } = this
    if (this.scene.background instanceof Color) this.scene.background.copy(current.background)
    if (this.scene.fog instanceof Fog) {
      this.scene.fog.color.copy(current.fogColor)
      this.scene.fog.near = current.fogNear
      this.scene.fog.far = current.fogFar
    }
    this.ambient.color.copy(current.ambientColor)
    this.ambient.intensity = current.ambientIntensity
    this.key.color.copy(current.keyColor)
    this.key.intensity = current.keyIntensity
    this.key.position.copy(current.keyPosition)
  }

  private applyDom(theme: Theme): void {
    const target = this.options.cssTarget
    if (target) {
      const style = target.style
      for (const [name, value] of Object.entries(theme.palette)) {
        style.setProperty(`--theme-${name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`, value)
      }
      style.setProperty('--theme-font-body', theme.fonts.body)
      style.setProperty('--theme-font-heading', theme.fonts.heading)
    }
    this.options.onCopy?.(theme.copy)
  }
}
