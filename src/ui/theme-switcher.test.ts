import { describe, expect, it, vi } from 'vitest'
import { THEMES } from '../themes'
import { createThemeSwitcher } from './theme-switcher'

function setup(current = 'professional', suggestBasic = false) {
  const onSelect = vi.fn()
  const switcher = createThemeSwitcher({ themes: THEMES, current, onSelect, suggestBasic })
  document.body.replaceChildren(switcher.element)
  return { onSelect }
}

describe('createThemeSwitcher', () => {
  it('renders a labelled radio group with the current theme checked', () => {
    setup()
    expect(document.querySelector('fieldset legend')?.textContent).toBe('Theme')
    expect(document.querySelectorAll('input[type=radio]')).toHaveLength(THEMES.length)
    expect(document.querySelector<HTMLInputElement>('#theme-professional')?.checked).toBe(true)
    expect(document.querySelector('label[for=theme-basic]')?.textContent).toBe('Basic')
  })

  it('reports a selection from the radio group', () => {
    const { onSelect } = setup()
    const basic = document.querySelector<HTMLInputElement>('#theme-basic')!
    basic.checked = true
    basic.dispatchEvent(new Event('change'))
    expect(onSelect).toHaveBeenCalledWith('basic')
  })

  it('toggles List view to Basic and back', () => {
    const { onSelect } = setup()
    const toggle = document.querySelector<HTMLButtonElement>('.theme-switcher > button')!
    expect(toggle.textContent).toBe('List view')
    toggle.click()
    expect(onSelect).toHaveBeenLastCalledWith('basic')
    expect(toggle.textContent).toBe('Visual view')
    toggle.click()
    expect(onSelect).toHaveBeenLastCalledWith('professional')
  })

  it('shows the Basic suggestion only when asked and not already on Basic', () => {
    setup('professional', true)
    expect(document.querySelector('.theme-suggestion')).not.toBeNull()
    setup('basic', true)
    expect(document.querySelector('.theme-suggestion')).toBeNull()
  })

  it('accepting the suggestion selects Basic', () => {
    const { onSelect } = setup('professional', true)
    document.querySelector<HTMLButtonElement>('.theme-suggestion button')!.click()
    expect(onSelect).toHaveBeenCalledWith('basic')
    expect(document.querySelector('.theme-suggestion')).toBeNull()
  })
})
