import { describe, expect, it, vi } from 'vitest'
import type { Site } from '../src/data/schema.ts'
import { parseArgs, runShots, skipReason, type ShotBrowser, type ShotPage } from './shots-core.ts'

function site(id: string, extra: Partial<Site> = {}): Site {
  return {
    id,
    name: id,
    url: `https://${id}.example.com`,
    description: '',
    category: 'Tools',
    tags: [],
    language: null,
    isPrivateRepo: false,
    lastPushed: '2026-01-01T00:00:00Z',
    status: 'live',
    ...extra,
  }
}

function mockBrowser(failOn?: string) {
  const visited: string[] = []
  const page: ShotPage = {
    goto: vi.fn(async (url: string) => {
      visited.push(url)
      if (failOn && url.includes(failOn)) throw new Error('net::ERR_FAILED\nmore detail')
    }),
    waitForSelector: vi.fn(async () => undefined),
    click: vi.fn(async () => undefined),
    waitForTimeout: vi.fn(async () => undefined),
    screenshot: vi.fn(async () => Buffer.from('png')),
    close: vi.fn(async () => undefined),
  }
  const browser: ShotBrowser = { newPage: async () => page }
  return { browser, page, visited }
}

describe('parseArgs', () => {
  it('parses flags', () => {
    expect(parseArgs([])).toEqual({ force: false })
    expect(parseArgs(['--force', '--only', 'a'])).toEqual({ force: true, only: 'a' })
  })

  it('rejects bad input', () => {
    expect(() => parseArgs(['--only'])).toThrow('--only needs')
    expect(() => parseArgs(['--nope'])).toThrow('Unknown argument')
  })
})

describe('skipReason', () => {
  const opts = { force: false }
  const pushed = Date.parse('2026-01-01T00:00:00Z')

  it('skips hidden, dead and generated sites', () => {
    expect(skipReason(site('a', { hidden: true }), opts, undefined)).toBe('hidden')
    expect(skipReason(site('a', { status: 'dead' }), opts, undefined)).toBe('dead')
    expect(skipReason(site('a', { thumbMode: 'generated' }), opts, undefined)).toBe('generated')
  })

  it('skips when the thumbnail is newer than lastPushed unless forced', () => {
    expect(skipReason(site('a'), opts, pushed + 1)).toBe('up-to-date')
    expect(skipReason(site('a'), opts, pushed - 1)).toBeUndefined()
    expect(skipReason(site('a'), { force: true }, pushed + 1)).toBeUndefined()
    expect(skipReason(site('a'), opts, undefined)).toBeUndefined()
  })

  it('honours --only', () => {
    expect(skipReason(site('a'), { force: false, only: 'b' }, undefined)).toBe('not-selected')
    expect(skipReason(site('b'), { force: false, only: 'b' }, undefined)).toBeUndefined()
  })
})

describe('runShots', () => {
  it('never visits a thumbMode "generated" site', async () => {
    const { browser, visited } = mockBrowser()
    const save = vi.fn(async () => undefined)
    const report = await runShots(
      [site('art', { thumbMode: 'generated' }), site('real')],
      { force: false },
      { browser, thumbMtime: () => undefined, save },
    )
    expect(visited).toEqual(['https://real.example.com'])
    expect(report.captured).toEqual(['real'])
    expect(report.skipped).toEqual([{ id: 'art', reason: 'generated' }])
    expect(save).toHaveBeenCalledTimes(1)
  })

  it('uses shotWaitFor and shotClick, and closes the page', async () => {
    const { browser, page } = mockBrowser()
    await runShots(
      [site('a', { shotWaitFor: '#ready', shotClick: '.accept' })],
      { force: false },
      { browser, thumbMtime: () => undefined, save: async () => undefined },
    )
    expect(page.waitForSelector).toHaveBeenCalledWith('#ready', expect.anything())
    expect(page.click).toHaveBeenCalledWith('.accept', expect.anything())
    expect(page.close).toHaveBeenCalled()
  })

  it('reports failures without aborting the run', async () => {
    const { browser } = mockBrowser('bad')
    const report = await runShots(
      [site('bad'), site('good')],
      { force: false },
      { browser, thumbMtime: () => undefined, save: async () => undefined },
    )
    expect(report.failed).toEqual([{ id: 'bad', error: 'net::ERR_FAILED' }])
    expect(report.captured).toEqual(['good'])
  })
})
