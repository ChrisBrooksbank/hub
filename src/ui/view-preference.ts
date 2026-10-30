export type View = 'table' | 'list'

export const STORAGE_KEY = 'hub.view'

function isView(value: string | null | undefined): value is View {
  return value === 'table' || value === 'list'
}

export interface ViewInputs {
  /** `location.search`, e.g. `?view=list`. */
  search: string
  stored: string | null
  webgl: boolean
}

/** Starting view: no WebGL forces the list, then `?view=`, then the stored choice, then the table. */
export function resolveView({ search, stored, webgl }: ViewInputs): View {
  if (!webgl) return 'list'
  const param = new URLSearchParams(search).get('view')
  if (isView(param)) return param
  if (isView(stored)) return stored
  return 'table'
}

export function loadStoredView(storage: Pick<Storage, 'getItem'> = localStorage): string | null {
  try {
    return storage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function saveView(view: View, storage: Pick<Storage, 'setItem'> = localStorage): void {
  try {
    storage.setItem(STORAGE_KEY, view)
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
