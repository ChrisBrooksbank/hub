import { basic } from './basic'
import { calmZen } from './calm-zen'
import { mooseMode } from './moose-mode'
import { professional } from './professional'
import { retroArcade } from './retro-arcade'
import type { Theme } from './types'

export const DEFAULT_THEME_ID = professional.id

export const THEMES: readonly Theme[] = [professional, retroArcade, calmZen, mooseMode, basic]

export function getTheme(id: string | null | undefined): Theme {
  return THEMES.find((theme) => theme.id === id) ?? defaultTheme()
}

function defaultTheme(): Theme {
  const theme = THEMES.find((t) => t.id === DEFAULT_THEME_ID)
  if (!theme) throw new Error(`Default theme "${DEFAULT_THEME_ID}" is not registered`)
  return theme
}
