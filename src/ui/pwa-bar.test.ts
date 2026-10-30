import { afterEach, describe, expect, it, vi } from 'vitest'
import { createPwaBar } from './pwa-bar'

afterEach(() => {
  document.body.innerHTML = ''
  sessionStorage.clear()
})

describe('createPwaBar', () => {
  it('starts hidden, offers install, and hides once chosen', async () => {
    const bar = createPwaBar(document.body)
    expect(bar.element.hidden).toBe(true)
    const install = vi.fn().mockResolvedValue(undefined)
    bar.showInstall(install)
    expect(bar.element.hidden).toBe(false)
    bar.element.querySelector<HTMLButtonElement>('button.primary')!.click()
    expect(install).toHaveBeenCalledOnce()
    await Promise.resolve()
    await Promise.resolve()
    expect(bar.element.hidden).toBe(true)
  })

  it('remembers "Not now" for the session', () => {
    const bar = createPwaBar(document.body)
    bar.showInstall(() => Promise.resolve())
    const later = [...bar.element.querySelectorAll('button')].find(
      (b) => b.textContent === 'Not now',
    )
    later!.click()
    expect(bar.element.hidden).toBe(true)
    bar.showInstall(() => Promise.resolve())
    expect(bar.element.hidden).toBe(true)
  })

  it('offers a reload for an update, with no way to dismiss it', () => {
    const bar = createPwaBar(document.body)
    const apply = vi.fn()
    bar.showUpdate(apply)
    expect(bar.element.textContent).toContain('new version')
    expect(bar.element.querySelectorAll('button')).toHaveLength(1)
    bar.element.querySelector('button')!.click()
    expect(apply).toHaveBeenCalledOnce()
  })
})
