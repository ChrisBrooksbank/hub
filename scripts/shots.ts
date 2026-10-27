import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'
import sharp from 'sharp'
import { resolveManifest } from '../src/data/manifest.ts'
import type { SiteRecord } from '../src/data/merge.ts'
import { parseArgs, runShots, THUMB_QUALITY, THUMB_SIZE, type ShotBrowser } from './shots-core.ts'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const THUMBS_DIR = join(ROOT, 'public', 'thumbs')

function readRecords(file: string): SiteRecord[] {
  const path = join(ROOT, 'data', file)
  return existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')) as SiteRecord[]) : []
}

const options = parseArgs(process.argv.slice(2))
const { visible } = resolveManifest(
  readRecords('sites.generated.json'),
  readRecords('sites.overrides.json'),
)
if (options.only && !visible.some((s) => s.id === options.only)) {
  console.error(`No visible site with id "${options.only}".`)
  process.exit(1)
}

mkdirSync(THUMBS_DIR, { recursive: true })
const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })

const shotBrowser: ShotBrowser = {
  newPage: () => context.newPage() as unknown as ReturnType<ShotBrowser['newPage']>,
}

try {
  const report = await runShots(visible, options, {
    browser: shotBrowser,
    thumbMtime: (id) => {
      const file = join(THUMBS_DIR, `${id}.webp`)
      return existsSync(file) ? statSync(file).mtimeMs : undefined
    },
    save: async (id, png) => {
      await sharp(png)
        .resize(THUMB_SIZE.width, THUMB_SIZE.height, { fit: 'cover', position: 'top' })
        .webp({ quality: THUMB_QUALITY })
        .toFile(join(THUMBS_DIR, `${id}.webp`))
    },
  })
  console.log(`Captured ${report.captured.length}, skipped ${report.skipped.length}`)
  if (report.failed.length > 0) {
    console.log(`Failed (${report.failed.length}), these fall back to generated art:`)
    for (const f of report.failed) console.log(`  ${f.id}: ${f.error}`)
  }
} finally {
  await browser.close()
}
