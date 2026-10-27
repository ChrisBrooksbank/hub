import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Site } from '../data/schema'
import { createDetailPanel, formatLastUpdated } from './detail-panel'

const base: Site = {
  id: 'maze',
  name: 'Maze',
  url: 'https://maze.netlify.app',
  repo: 'ChrisBrooksbank/maze',
  description: 'A maze game',
  category: 'Games',
  tags: ['puzzle', 'canvas'],
  language: 'TypeScript',
  isPrivateRepo: false,
  lastPushed: '2026-10-27T10:00:00Z',
  status: 'live',
  thumb: '/thumbs/maze.webp',
}

afterEach(() => {
  document.body.innerHTML = ''
})

function key(init: KeyboardEventInit): KeyboardEvent {
  return new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init })
}

describe('formatLastUpdated', () => {
  it('formats dates and handles missing values', () => {
    expect(formatLastUpdated('2026-10-27T10:00:00Z')).toBe('27 Oct 2026')
    expect(formatLastUpdated(null)).toBe('Unknown')
    expect(formatLastUpdated('nope')).toBe('Unknown')
  })
})

describe('createDetailPanel', () => {
  it('renders site details with a safe launch link and repo link', () => {
    const panel = createDetailPanel(document.body)
    expect(panel.element.hidden).toBe(true)
    panel.open(base)
    const content = panel.element.textContent ?? ''
    for (const s of ['Maze', 'A maze game', 'Games', 'puzzle, canvas', 'TypeScript', '27 Oct 2026'])
      expect(content).toContain(s)
    const launch = panel.element.querySelector<HTMLAnchorElement>('a.launch')!
    expect(launch.href).toBe('https://maze.netlify.app/')
    expect(launch.target).toBe('_blank')
    expect(launch.rel).toContain('noopener')
    expect(panel.element.querySelector('img')?.alt).toBe('Screenshot of Maze')
    expect(panel.element.querySelector<HTMLAnchorElement>('a[href*="github.com"]')?.href).toBe(
      'https://github.com/ChrisBrooksbank/maze',
    )
  })

  it('omits the repo link for private repos and flags dead sites', () => {
    const panel = createDetailPanel(document.body)
    panel.open({ ...base, isPrivateRepo: true, status: 'dead' })
    expect(panel.element.querySelector('a[href*="github.com"]')).toBeNull()
    expect(panel.element.textContent).toContain('May be offline')
  })

  it('moves focus in, traps Tab, and restores focus on Escape', () => {
    const opener = document.createElement('button')
    document.body.append(opener)
    opener.focus()
    const onClose = vi.fn()
    const panel = createDetailPanel(document.body, { onClose })
    panel.open(base)
    expect(document.activeElement).toBe(panel.element.querySelector('a.launch'))

    const items = [...panel.element.querySelectorAll<HTMLElement>('a[href], button')]
    const first = items[0]!
    const last = items[items.length - 1]!

    last.focus()
    const forward = key({ key: 'Tab' })
    document.dispatchEvent(forward)
    expect(forward.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(first)

    document.dispatchEvent(key({ key: 'Tab', shiftKey: true }))
    expect(document.activeElement).toBe(last)

    document.dispatchEvent(key({ key: 'Escape' }))
    expect(panel.isOpen).toBe(false)
    expect(panel.element.hidden).toBe(true)
    expect(document.activeElement).toBe(opener)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('close() restores focus without calling onClose; dispose removes the panel', () => {
    const opener = document.createElement('button')
    document.body.append(opener)
    opener.focus()
    const onClose = vi.fn()
    const panel = createDetailPanel(document.body, { onClose })
    panel.open(base)
    panel.close()
    expect(document.activeElement).toBe(opener)
    expect(onClose).not.toHaveBeenCalled()
    panel.dispose()
    expect(document.querySelector('.detail-panel')).toBeNull()
  })
})
