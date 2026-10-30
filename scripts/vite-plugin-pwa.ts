import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Plugin } from 'vite'

export const BUILD_ID_TOKEN = '__BUILD_ID__'

/** Replace every build-id token so each deploy ships a byte-different (so updatable) worker. */
export function stampServiceWorker(source: string, buildId: string): string {
  return source.split(BUILD_ID_TOKEN).join(buildId)
}

/** Stamps `dist/sw.js` with a build id once the bundle is written. */
export function pwaPlugin(): Plugin {
  let outDir = ''
  return {
    name: 'hub-pwa',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir)
    },
    closeBundle() {
      const file = resolve(outDir, 'sw.js')
      if (!existsSync(file)) return
      writeFileSync(file, stampServiceWorker(readFileSync(file, 'utf8'), Date.now().toString(36)))
    },
  }
}
