import { professional } from './professional'
import type { Theme } from './types'

export const DEFAULT_THEME_ID = professional.id

export const THEMES: readonly Theme[] = [professional]

export function getTheme(id: string | null | undefined): Theme {
  return THEMES.find((theme) => theme.id === id) ?? defaultTheme()
}

function defaultTheme(): Theme {
  const theme = THEMES.find((t) => t.id === DEFAULT_THEME_ID)
  if (!theme) throw new Error(`Default theme "${DEFAULT_THEME_ID}" is not registered`)
  return theme
}
