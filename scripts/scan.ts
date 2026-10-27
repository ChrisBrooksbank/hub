import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { extractUrls, netlifySiteId } from '../src/data/extract.ts'
import {
  buildScan,
  repoNameFromRemote,
  type LocalFolder,
  type RepoMeta,
  type ScanResult,
} from './scan-core.ts'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const CODE_DIR = process.env.HUB_CODE_DIR ?? 'C:\\code'
const OUTPUT = join(ROOT, 'data', 'sites.generated.json')

interface GhRepo {
  name: string
  description: string | null
  homepageUrl: string | null
  primaryLanguage: { name: string } | null
  isPrivate: boolean
  isArchived: boolean
  isFork: boolean
  pushedAt: string | null
  repositoryTopics: { name: string }[] | null
}

function listRepos(): RepoMeta[] {
  const fields =
    'name,description,homepageUrl,primaryLanguage,isPrivate,isArchived,isFork,pushedAt,repositoryTopics'
  const out = execFileSync('gh', ['repo', 'list', '--limit', '500', '--json', fields], {
    encoding: 'utf8',
  })
  return (JSON.parse(out) as GhRepo[]).map((r) => ({
    name: r.name,
    description: r.description,
    homepageUrl: r.homepageUrl,
    language: r.primaryLanguage?.name ?? null,
    isPrivate: r.isPrivate,
    isArchived: r.isArchived,
    isFork: r.isFork,
    pushedAt: r.pushedAt,
    topics: (r.repositoryTopics ?? []).map((t) => t.name),
  }))
}

function readIfExists(path: string): string {
  return existsSync(path) ? readFileSync(path, 'utf8') : ''
}

function originRepoName(dir: string): string | undefined {
  try {
    const remote = execFileSync('git', ['-C', dir, 'remote', 'get-url', 'origin'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
    return repoNameFromRemote(remote)
  } catch {
    return undefined
  }
}

function discoverLocals(codeDir: string): LocalFolder[] {
  const locals: LocalFolder[] = []
  for (const entry of readdirSync(codeDir).sort()) {
    const dir = join(codeDir, entry)
    if (!statSync(dir).isDirectory() || entry === 'node_modules' || entry.startsWith('.')) continue
    const text = ['README.md', 'CLAUDE.md', 'netlify.toml']
      .map((file) => readIfExists(join(dir, file)))
      .join('\n')
    locals.push({
      dir: entry,
      repoName: originRepoName(dir),
      urls: extractUrls(text),
      netlifySiteId: netlifySiteId(readIfExists(join(dir, '.netlify', 'state.json'))),
    })
  }
  return locals
}

function report(result: ScanResult): void {
  console.log(`Wrote ${result.sites.length} sites to ${OUTPUT}`)
  const hidden = result.sites.filter((s) => s.hidden).length
  console.log(`  ${hidden} hidden (private repos)`)
  if (result.unresolved.length > 0) {
    console.log(`Netlify-linked, URL not yet resolved (${result.unresolved.length}):`)
    for (const u of result.unresolved) console.log(`  ${u.name} (${u.netlifySiteId})`)
  }
  if (result.noUrl.length > 0) {
    console.log(`Repos with no discoverable URL (${result.noUrl.length}):`)
    for (const name of result.noUrl) console.log(`  ${name}`)
  }
}

const result = buildScan(listRepos(), discoverLocals(CODE_DIR))
writeFileSync(OUTPUT, JSON.stringify(result.sites, null, 2) + '\n')
report(result)
