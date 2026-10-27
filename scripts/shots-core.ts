import type { Site } from '../src/data/schema.ts'

export const VIEWPORT = { width: 1280, height: 800 }
export const THUMB_SIZE = { width: 640, height: 400 }
export const THUMB_QUALITY = 80
const SETTLE_MS = 1000
const NAV_TIMEOUT_MS = 30_000
const SELECTOR_TIMEOUT_MS = 10_000

export interface ShotOptions {
  only?: string
  force: boolean
}

/** Parse `--only <id>` and `--force`. Throws on unknown or incomplete arguments. */
export function parseArgs(argv: readonly string[]): ShotOptions {
  const options: ShotOptions = { force: false }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--force') options.force = true
    else if (arg === '--only') {
      const id = argv[++i]
      if (!id || id.startsWith('--')) throw new Error('--only needs a site id')
      options.only = id
    } else throw new Error(`Unknown argument: ${arg}`)
  }
  return options
}

export type SkipReason = 'hidden' | 'dead' | 'generated' | 'not-selected' | 'up-to-date'

/**
 * Decide whether a site needs a capture. `thumbMtime` is the existing thumbnail's mtime in ms
 * (undefined when absent); the thumbnail is current when it is newer than `lastPushed`.
 */
export function skipReason(
  site: Site,
  options: ShotOptions,
  thumbMtime: number | undefined,
): SkipReason | undefined {
  if (options.only !== undefined && site.id !== options.only) return 'not-selected'
  if (site.hidden) return 'hidden'
  if (site.status === 'dead') return 'dead'
  if (site.thumbMode === 'generated') return 'generated'
  if (!options.force && thumbMtime !== undefined) {
    const pushed = site.lastPushed ? Date.parse(site.lastPushed) : NaN
    if (Number.isNaN(pushed) || thumbMtime > pushed) return 'up-to-date'
  }
  return undefined
}

/** The slice of a Playwright page the capture needs; lets tests supply a mock. */
export interface ShotPage {
  goto(url: string, options: { waitUntil: 'networkidle'; timeout: number }): Promise<unknown>
  waitForSelector(selector: string, options: { timeout: number }): Promise<unknown>
  click(selector: string, options: { timeout: number }): Promise<unknown>
  waitForTimeout(ms: number): Promise<void>
  screenshot(options: { type: 'png' }): Promise<Buffer>
  close(): Promise<void>
}

export interface ShotBrowser {
  newPage(options: { viewport: typeof VIEWPORT }): Promise<ShotPage>
}

/** Visit a site and return a raw PNG screenshot. The page is always closed. */
export async function captureSite(browser: ShotBrowser, site: Site): Promise<Buffer> {
  const page = await browser.newPage({ viewport: VIEWPORT })
  try {
    await page.goto(site.url, { waitUntil: 'networkidle', timeout: NAV_TIMEOUT_MS })
    if (site.shotWaitFor) {
      await page.waitForSelector(site.shotWaitFor, { timeout: SELECTOR_TIMEOUT_MS })
    }
    if (site.shotClick) await page.click(site.shotClick, { timeout: SELECTOR_TIMEOUT_MS })
    await page.waitForTimeout(SETTLE_MS)
    return await page.screenshot({ type: 'png' })
  } finally {
    await page.close()
  }
}

export interface ShotDeps {
  browser: ShotBrowser
  thumbMtime(id: string): number | undefined
  /** Resize/encode the PNG and write it to `public/thumbs/<id>.webp`. */
  save(id: string, png: Buffer): Promise<void>
}

export interface ShotReport {
  captured: string[]
  skipped: { id: string; reason: SkipReason }[]
  failed: { id: string; error: string }[]
}

/** Capture every eligible site in turn. A failure is recorded and never aborts the run. */
export async function runShots(
  sites: readonly Site[],
  options: ShotOptions,
  deps: ShotDeps,
): Promise<ShotReport> {
  const report: ShotReport = { captured: [], skipped: [], failed: [] }
  for (const site of sites) {
    const reason = skipReason(site, options, deps.thumbMtime(site.id))
    if (reason) {
      report.skipped.push({ id: site.id, reason })
      continue
    }
    try {
      await deps.save(site.id, await captureSite(deps.browser, site))
      report.captured.push(site.id)
    } catch (error) {
      report.failed.push({ id: site.id, error: (error as Error).message.split('\n')[0] ?? '' })
    }
  }
  return report
}
