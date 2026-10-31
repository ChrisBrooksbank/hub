import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { resolveManifest } from '../src/data/manifest.ts'
import type { SiteRecord } from '../src/data/merge.ts'
import { pickGif } from './clips-core.ts'
import { THUMB_QUALITY, THUMB_SIZE } from './shots-core.ts'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const CLIPS_DIR = join(ROOT, 'public', 'clips')
const THUMBS_DIR = join(ROOT, 'public', 'thumbs')
const OWNER = 'ChrisBrooksbank'
const CLIP_WIDTH = 480
const CLIP_SECONDS = 12
/** Where in the clip to take a poster frame by default: past any blank first frames. */
const POSTER_AT = '1.5'

function readRecords(file: string): SiteRecord[] {
  const path = join(ROOT, 'data', file)
  return existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')) as SiteRecord[]) : []
}

function gh(args: string[], raw = false): Buffer {
  const accept = raw ? ['-H', 'Accept: application/vnd.github.raw'] : []
  return execFileSync('gh', ['api', ...accept, ...args], { maxBuffer: 256 * 1024 * 1024 })
}

/** `--only <id>`, `--force`, and `--poster <id>[@seconds]` (also replace that site's thumbnail). */
function parseArgs(argv: readonly string[]): { only?: string; force: boolean; posters: string[] } {
  const options: { only?: string; force: boolean; posters: string[] } = {
    force: false,
    posters: [],
  }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--force') options.force = true
    else if (arg === '--only') options.only = argv[++i]
    else if (arg === '--poster') options.posters.push(argv[++i] ?? '')
    else throw new Error(`Unknown argument: ${arg}`)
  }
  return options
}

const options = parseArgs(process.argv.slice(2))
const { visible } = resolveManifest(
  readRecords('sites.generated.json'),
  readRecords('sites.overrides.json'),
)
mkdirSync(CLIPS_DIR, { recursive: true })
const work = mkdtempSync(join(tmpdir(), 'hub-clips-'))
const done: string[] = []
const skipped: string[] = []

try {
  for (const site of visible) {
    if (!site.repo || (options.only && site.id !== options.only)) continue
    const target = join(CLIPS_DIR, `${site.id}.mp4`)
    const poster = options.posters.map((entry) => entry.split('@')).find(([id]) => id === site.id)
    const wantsPoster = poster !== undefined
    if (existsSync(target) && !options.force && !wantsPoster) {
      skipped.push(`${site.id} (have it)`)
      continue
    }
    try {
      const readme = gh([`repos/${OWNER}/${site.repo}/readme`], true).toString('utf8')
      const path = pickGif(readme)
      if (!path) {
        skipped.push(`${site.id} (no gif in the README)`)
        continue
      }
      const gif = join(work, `${site.id}.gif`)
      writeFileSync(gif, gh([`repos/${OWNER}/${site.repo}/contents/${path}`], true))
      execFileSync(
        'ffmpeg',
        [
          ...['-y', '-loglevel', 'error', '-i', gif, '-t', String(CLIP_SECONDS)],
          ...['-vf', `fps=12,scale=${CLIP_WIDTH}:-2:flags=lanczos`],
          ...['-c:v', 'libx264', '-crf', '30', '-preset', 'slow', '-pix_fmt', 'yuv420p'],
          ...['-movflags', '+faststart', '-an', target],
        ],
        { stdio: 'inherit' },
      )
      if (wantsPoster) {
        const frame = join(work, `${site.id}.png`)
        execFileSync('ffmpeg', [
          ...[
            '-y',
            '-loglevel',
            'error',
            '-ss',
            poster?.[1] ?? POSTER_AT,
            '-i',
            target,
            '-frames:v',
            '1',
            frame,
          ],
        ])
        mkdirSync(THUMBS_DIR, { recursive: true })
        await sharp(frame)
          .resize(THUMB_SIZE.width, THUMB_SIZE.height, { fit: 'cover', position: 'top' })
          .webp({ quality: THUMB_QUALITY })
          .toFile(join(THUMBS_DIR, `${site.id}.webp`))
      }
      done.push(`${site.id} <- ${path}`)
    } catch (error) {
      skipped.push(`${site.id} (${(error as Error).message.split('\n')[0]})`)
    }
  }
} finally {
  rmSync(work, { recursive: true, force: true })
}

console.log(`Made ${done.length} clip(s):\n  ${done.join('\n  ')}`)
if (skipped.length > 0) console.log(`Skipped ${skipped.length}:\n  ${skipped.join('\n  ')}`)
