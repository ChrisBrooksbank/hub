import { existsSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { basename, extname, join, resolve } from 'node:path'
import type { Plugin } from 'vite'
import { resolveManifest } from '../src/data/manifest.ts'
import type { SiteRecord } from '../src/data/merge.ts'

export const VIRTUAL_ID = 'virtual:sites'
const RESOLVED_ID = '\0' + VIRTUAL_ID

export interface SitesPluginOptions {
  generatedPath: string
  overridesPath: string
}

function readRecords(path: string, optional: boolean): SiteRecord[] {
  if (!existsSync(path)) {
    if (optional) return []
    throw new Error(`Manifest file not found: ${path}`)
  }
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as SiteRecord[]
  } catch (error) {
    throw new Error(`Could not parse ${path}: ${(error as Error).message}`, { cause: error })
  }
}

/**
 * Serves `virtual:sites` (the merged manifest) and strips `hidden` entries before bundling, so a
 * hidden site never reaches the output. Also removes any thumbnail emitted for a hidden site.
 */
export function sitesPlugin(options: SitesPluginOptions): Plugin {
  const generatedPath = resolve(options.generatedPath)
  const overridesPath = resolve(options.overridesPath)
  let outDir = ''
  let thumbsSrcDir = ''
  let clipsSrcDir = ''

  const load = () =>
    resolveManifest(readRecords(generatedPath, false), readRecords(overridesPath, true))

  return {
    name: 'hub-sites',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir)
      thumbsSrcDir = resolve(config.root, 'public', 'thumbs')
      clipsSrcDir = resolve(config.root, 'public', 'clips')
    },
    resolveId(id) {
      return id === VIRTUAL_ID ? RESOLVED_ID : undefined
    },
    load(id) {
      if (id !== RESOLVED_ID) return undefined
      this.addWatchFile(generatedPath)
      if (existsSync(overridesPath)) this.addWatchFile(overridesPath)
      const sites = load().visible.map((site) => ({
        ...site,
        ...(!site.thumb && existsSync(join(thumbsSrcDir, `${site.id}.webp`))
          ? { thumb: `/thumbs/${site.id}.webp` }
          : {}),
        ...(!site.clip && existsSync(join(clipsSrcDir, `${site.id}.mp4`))
          ? { clip: `/clips/${site.id}.mp4` }
          : {}),
      }))
      return `export const sites = ${JSON.stringify(sites)}\n`
    },
    closeBundle() {
      const hidden = load().hidden
      for (const [folder, field] of [
        ['thumbs', 'thumb'],
        ['clips', 'clip'],
      ] as const) {
        const dir = join(outDir, folder)
        if (!existsSync(dir)) continue
        const names = new Set(
          hidden.flatMap((site) => [site.id, site[field] ? basename(site[field]) : '']),
        )
        names.delete('')
        for (const file of readdirSync(dir)) {
          if (names.has(file) || names.has(basename(file, extname(file)))) {
            rmSync(join(dir, file), { force: true })
          }
        }
      }
    },
  }
}
