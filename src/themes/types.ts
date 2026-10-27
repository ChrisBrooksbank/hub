type ThemePresentation = 'scene' | 'list'

interface ThemePalette {
  background: string
  surface: string
  text: string
  textMuted: string
  accent: string
  accentText: string
  danger: string
}

interface ThemeFonts {
  body: string
  heading: string
  /** Optional stylesheet URL for web fonts; omitted for system fonts. */
  stylesheet?: string
}

type ThemeBackground =
  | { kind: 'color'; color: string }
  | { kind: 'gradient'; stops: readonly string[]; angle: number }
  | { kind: 'shader'; shader: string }

interface ThemeFog {
  color: string
  near: number
  far: number
}

interface ThemeLights {
  ambient: { color: string; intensity: number }
  key: { color: string; intensity: number; position: readonly [number, number, number] }
}

interface ThemeCardStyle {
  cornerRadius: number
  borderWidth: number
  borderColor: string
  material: 'standard' | 'glass' | 'basic'
  emissive: number
}

type ThemeLayout =
  | { strategy: 'ring'; radius: number; bandHeight: number }
  | { strategy: 'helix'; radius: number; pitch: number }
  | { strategy: 'sphere'; radius: number }

interface ThemeMotion {
  /** Idle auto-rotation in radians per second. */
  idleSpeed: number
  hoverStyle: 'tilt' | 'glow' | 'bob' | 'wobble'
  transitionEasing: 'linear' | 'easeInOut' | 'easeOut' | 'bounce'
  cameraShake: number
}

interface ThemePostFx {
  bloom?: { strength: number; radius: number; threshold: number }
  scanlines?: { intensity: number; count: number }
  vignette?: { darkness: number }
  grain?: { amount: number }
}

interface ThemeAmbientFx {
  particles?: { count: number; size: number; color: string; speed: number }
}

interface ThemeCopy {
  heading: string
  subheading: string
  launchLabel: string
  repoLabel: string
  closeLabel: string
  searchPlaceholder: string
  tooltip: string
  emptyState: string
  notFound: string
}

interface ThemeSound {
  enabled: boolean
  src?: string
}

export interface Theme {
  id: string
  label: string
  presentation: ThemePresentation
  palette: ThemePalette
  fonts: ThemeFonts
  background: ThemeBackground
  fog: ThemeFog
  lights: ThemeLights
  cardStyle: ThemeCardStyle
  layout: ThemeLayout
  motion: ThemeMotion
  postFx: ThemePostFx
  ambientFx: ThemeAmbientFx
  copy: ThemeCopy
  sound?: ThemeSound
}
