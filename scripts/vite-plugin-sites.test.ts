// @vitest-environment node
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { build } from 'vite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { sitesPlugin } from './vite-plugin-sites.ts'

const base = {
  description: 'd',
  category: 'Tools',
  tags: [],
  language: null,
  lastPushed: null,
}

function site(id: string, extra: Record<string, unknown> = {}) {
  return { id, name: id, url: `https://${id}.netlify.app`, isPrivateRepo: false, ...base, ...extra }
}

function filesIn(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? filesIn(join(dir, entry.name)) : [join(dir, entry.name)],
  )
}

describe('sitesPlugin build', () => {
  let tmp: string
  let dist: string

  beforeAll(async () => {
    tmp = mkdtempSync(join(tmpdir(), 'hub-sites-'))
    const root = join(tmp, 'app')
    mkdirSync(join(root, 'public', 'thumbs'), { recursive: true })
    writeFileSync(join(root, 'public', 'thumbs', 'secretprivate.webp'), 'x')
    writeFileSync(join(root, 'public', 'thumbs', 'forced.webp'), 'x')
    writeFileSync(join(root, 'public', 'thumbs', 'openone.webp'), 'x')
    writeFileSync(
      join(root, 'index.html'),
      '<!doctype html><html><body><script type="module" src="/main.ts"></script></body></html>',
    )
    writeFileSync(
      join(root, 'main.ts'),
      "import { sites } from 'virtual:sites'\ndocument.body.textContent = JSON.stringify(sites)\n",
    )
    const generated = join(tmp, 'generated.json')
    const overrides = join(tmp, 'overrides.json')
    writeFileSync(
      generated,
      JSON.stringify([
        site('openone'),
        site('secretprivate', { isPrivateRepo: true, hidden: true }),
        site('forced'),
      ]),
    )
    writeFileSync(overrides, JSON.stringify([{ id: 'forced', hidden: true }]))
    dist = join(tmp, 'dist')
    await build({
      root,
      configFile: false,
      logLevel: 'silent',
      build: { outDir: dist, emptyOutDir: true, minify: false },
      plugins: [sitesPlugin({ generatedPath: generated, overridesPath: overrides })],
    })
  }, 60_000)

  afterAll(() => rmSync(tmp, { recursive: true, force: true }))

  it('keeps visible sites in the bundle', () => {
    const js = filesIn(dist)
      .filter((f) => f.endsWith('.js'))
      .map((f) => readFileSync(f, 'utf8'))
      .join('\n')
    expect(js).toContain('openone.netlify.app')
  })

  it('leaves no trace of hidden sites (private repo or override) anywhere in dist', () => {
    for (const file of filesIn(dist)) {
      const text = readFileSync(file, 'utf8')
      expect(file + text).not.toContain('secretprivate')
      expect(file + text).not.toContain('forced')
    }
  })

  it('keeps the thumbnail of a visible site', () => {
    expect(filesIn(dist).some((f) => f.endsWith('openone.webp'))).toBe(true)
  })
})
