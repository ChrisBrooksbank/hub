import { DEFAULT_THEME_ID, THEMES } from './index'

export const STORAGE_KEY = 'hub.theme'
export const BASIC_THEME_ID = 'basic'

function isThemeId(id: string | null | undefined): id is string {
  return THEMES.some((theme) => theme.id === id)
}

export interface ThemeInputs {
  /** `location.search`, e.g. `?theme=basic`. */
  search: string
  stored: string | null
  webgl: boolean
}

/** Pick the starting theme: no WebGL forces Basic, then `?theme=`, then storage, then default. */
export function resolveThemeId({ search, stored, webgl }: ThemeInputs): string {
  if (!webgl) return BASIC_THEME_ID
  const param = new URLSearchParams(search).get('theme')
  if (isThemeId(param)) return param
  if (isThemeId(stored)) return stored
  return DEFAULT_THEME_ID
}

export function loadStoredTheme(storage: Pick<Storage, 'getItem'> = localStorage): string | null {
  try {
    return storage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function saveTheme(id: string, storage: Pick<Storage, 'setItem'> = localStorage): void {
  try {
    storage.setItem(STORAGE_KEY, id)
  } catch {
    // Storage can be blocked (private mode); the choice then lasts for this visit only.
  }
}

export function hasWebGL(doc: Document = document): boolean {
  try {
    const canvas = doc.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))
  } catch {
    return false
  }
}

/** True when the visitor asked the OS/browser for reduced motion. */
export function prefersReducedMotion(match: (query: string) => { matches: boolean }): boolean {
  return match('(prefers-reduced-motion: reduce)').matches
}

/** True when the visitor's settings suggest the Basic theme would suit them. */
export function prefersBasic(match: (query: string) => { matches: boolean }): boolean {
  return (
    match('(prefers-reduced-motion: reduce)').matches || match('(prefers-contrast: more)').matches
  )
}
