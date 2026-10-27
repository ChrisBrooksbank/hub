import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'

export const JS_BUDGET_KB = 500

/** Total gzip size in KB of every .js file under `dir` (recursive). */
export function totalGzipKb(dir: string): number {
  const walk = (d: string): string[] =>
    readdirSync(d, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? walk(join(d, e.name)) : e.name.endsWith('.js') ? [join(d, e.name)] : [],
    )
  const bytes = walk(dir).reduce((sum, f) => sum + gzipSync(readFileSync(f)).length, 0)
  return bytes / 1024
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const kb = totalGzipKb(join(process.cwd(), 'dist', 'assets'))
  console.log(`JS gzip total: ${kb.toFixed(1)} KB (budget ${JS_BUDGET_KB} KB)`)
  if (kb > JS_BUDGET_KB) process.exit(1)
}
