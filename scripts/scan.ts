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
import { mapLimit, resolveNetlifyUrl, verifyUrl } from './scan-net.ts'

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

/** Resolve Netlify site ids for folders with no recorded URL. Token comes from the environment only. */
async function resolveNetlifyIds(locals: readonly LocalFolder[]): Promise<Record<string, string>> {
  const ids = [
    ...new Set(
      locals.filter((l) => l.urls.length === 0 && l.netlifySiteId).map((l) => l.netlifySiteId!),
    ),
  ]
  if (ids.length === 0) return {}
  const token = process.env.NETLIFY_AUTH_TOKEN
  if (!token) {
    console.warn('NETLIFY_AUTH_TOKEN is not set; skipping Netlify site id resolution.')
    return {}
  }
  const urls = await mapLimit(ids, 4, (id) => resolveNetlifyUrl(id, token))
  const resolved: Record<string, string> = {}
  ids.forEach((id, i) => {
    const url = urls[i]
    if (url) resolved[id] = url
  })
  return resolved
}

/** Flag sites whose URL does not answer 2xx. Dead sites are kept, never dropped. */
async function verifySites(result: ScanResult): Promise<void> {
  const statuses = await mapLimit(result.sites, 8, (site) => verifyUrl(site.url))
  result.sites.forEach((site, i) => {
    if (statuses[i] === 'dead') site.status = 'dead'
  })
}

function previousSiteIds(): Set<string> {
  try {
    const sites = JSON.parse(readFileSync(OUTPUT, 'utf8')) as { id: string }[]
    return new Set(sites.map((s) => s.id))
  } catch {
    return new Set()
  }
}

function report(result: ScanResult, previousIds: ReadonlySet<string>): void {
  console.log(`Wrote ${result.sites.length} sites to ${OUTPUT}`)
  const hidden = result.sites.filter((s) => s.hidden).length
  console.log(`  ${hidden} hidden (private repos)`)
  const added = result.sites.filter((s) => !previousIds.has(s.id))
  if (previousIds.size > 0 && added.length > 0) {
    console.log(`New sites (${added.length}):`)
    for (const s of added) console.log(`  ${s.id} ${s.url}`)
  }
  const dead = result.sites.filter((s) => s.status === 'dead')
  if (dead.length > 0) {
    console.log(`Dead URLs (${dead.length}):`)
    for (const s of dead) console.log(`  ${s.id} ${s.url}`)
  }
  if (result.unresolved.length > 0) {
    console.log(`Netlify-linked, URL not yet resolved (${result.unresolved.length}):`)
    for (const u of result.unresolved) console.log(`  ${u.name} (${u.netlifySiteId})`)
  }
  if (result.noUrl.length > 0) {
    console.log(`Repos with no discoverable URL (${result.noUrl.length}):`)
    for (const name of result.noUrl) console.log(`  ${name}`)
  }
}

const previousIds = previousSiteIds()
const locals = discoverLocals(CODE_DIR)
const result = buildScan(listRepos(), locals, await resolveNetlifyIds(locals))
await verifySites(result)
writeFileSync(OUTPUT, JSON.stringify(result.sites, null, 2) + '\n')
report(result, previousIds)
