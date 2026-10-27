import { BASIC_THEME_ID } from '../themes/preference'
import type { Theme } from '../themes/types'

export interface SwitcherOptions {
  themes: readonly Theme[]
  current: string
  onSelect: (id: string) => void
  /** Show the "Basic theme suggested" hint. */
  suggestBasic: boolean
}

export interface Switcher {
  element: HTMLElement
}

/**
 * Theme chooser: a labelled radio group, a "List view" toggle (which is Basic, and back),
 * and an optional suggestion for visitors who prefer reduced motion or more contrast.
 */
export function createThemeSwitcher(options: SwitcherOptions): Switcher {
  const { themes, onSelect } = options
  let current = options.current
  let previous = themes.find((t) => t.id !== BASIC_THEME_ID)?.id ?? current

  const root = document.createElement('div')
  root.className = 'theme-switcher'

  const fieldset = document.createElement('fieldset')
  const legend = document.createElement('legend')
  legend.textContent = 'Theme'
  fieldset.append(legend)

  const radios = new Map<string, HTMLInputElement>()
  for (const theme of themes) {
    const input = document.createElement('input')
    input.type = 'radio'
    input.name = 'theme'
    input.id = `theme-${theme.id}`
    input.value = theme.id
    input.addEventListener('change', () => {
      if (input.checked) select(theme.id)
    })
    const label = document.createElement('label')
    label.htmlFor = input.id
    label.textContent = theme.label
    radios.set(theme.id, input)
    fieldset.append(input, label)
  }

  const toggle = document.createElement('button')
  toggle.type = 'button'
  toggle.addEventListener('click', () =>
    select(current === BASIC_THEME_ID ? previous : BASIC_THEME_ID),
  )

  root.append(fieldset, toggle)

  if (options.suggestBasic && current !== BASIC_THEME_ID) {
    const hint = document.createElement('p')
    hint.className = 'theme-suggestion'
    hint.append('Your settings suggest reduced motion or higher contrast. ')
    const accept = document.createElement('button')
    accept.type = 'button'
    accept.textContent = 'Switch to the Basic theme'
    accept.addEventListener('click', () => {
      hint.remove()
      select(BASIC_THEME_ID)
    })
    hint.append(accept)
    root.append(hint)
  }

  function sync(): void {
    radios.forEach((input, id) => (input.checked = id === current))
    toggle.textContent = current === BASIC_THEME_ID ? 'Visual view' : 'List view'
  }

  function select(id: string): void {
    if (id === current) return
    if (current !== BASIC_THEME_ID) previous = current
    current = id
    sync()
    onSelect(id)
  }

  sync()
  return { element: root }
}
