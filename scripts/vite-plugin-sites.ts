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

  const load = () =>
    resolveManifest(readRecords(generatedPath, false), readRecords(overridesPath, true))

  return {
    name: 'hub-sites',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir)
    },
    resolveId(id) {
      return id === VIRTUAL_ID ? RESOLVED_ID : undefined
    },
    load(id) {
      if (id !== RESOLVED_ID) return undefined
      this.addWatchFile(generatedPath)
      if (existsSync(overridesPath)) this.addWatchFile(overridesPath)
      return `export const sites = ${JSON.stringify(load().visible)}\n`
    },
    closeBundle() {
      const thumbsDir = join(outDir, 'thumbs')
      if (!existsSync(thumbsDir)) return
      const names = new Set(
        load().hidden.flatMap((site) => [site.id, site.thumb ? basename(site.thumb) : '']),
      )
      names.delete('')
      for (const file of readdirSync(thumbsDir)) {
        if (names.has(file) || names.has(basename(file, extname(file)))) {
          rmSync(join(thumbsDir, file), { force: true })
        }
      }
    },
  }
}
