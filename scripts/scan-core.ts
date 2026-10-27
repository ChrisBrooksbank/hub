import { guessCategory } from '../src/data/extract.ts'

export interface RepoMeta {
  name: string
  description: string | null
  homepageUrl: string | null
  language: string | null
  isPrivate: boolean
  isArchived: boolean
  isFork: boolean
  pushedAt: string | null
  topics: string[]
}

export interface LocalFolder {
  /** Folder name under C:\code. */
  dir: string
  /** Repo name parsed from the git `origin` remote, if any. */
  repoName?: string
  /** Deployed-site URLs found in README/CLAUDE.md/netlify.toml. */
  urls: string[]
  /** Site id from `.netlify/state.json`, if linked. */
  netlifySiteId?: string
}

export interface GeneratedSite {
  id: string
  name: string
  url: string
  repo?: string
  description: string
  category: string
  tags: string[]
  language: string | null
  isPrivateRepo: boolean
  lastPushed: string | null
  hidden?: true
}

export interface Unresolved {
  id: string
  name: string
  netlifySiteId: string
}

export interface ScanResult {
  sites: GeneratedSite[]
  /** Netlify-linked with no recorded URL; part 2 resolves these via the Netlify API. */
  unresolved: Unresolved[]
  /** Repos or folders that look like sites but have no discoverable URL or site id. */
  noUrl: string[]
}

/** Repos and folders that are not websites. Matched case-insensitively against the repo/folder name. */
const EXCLUDED = [
  /^(hub|vox|witness|galaga|nul|home|prompts|claudecode|restructure2026)$/,
  /^hue[.-]/,
  /^ai\.prompts$/,
  /^cb-(ralph-wiggum|visual-qa)$/,
  /^claude-code-/,
  /mcp/,
  /-cli$/,
]

export function isExcluded(name: string): boolean {
  const lower = name.toLowerCase()
  return EXCLUDED.some((pattern) => pattern.test(lower))
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Trim to `https://host/path` with no trailing slash; undefined if not an http(s) URL. */
export function cleanUrl(raw: string | null | undefined): string | undefined {
  if (!raw) return undefined
  try {
    const url = new URL(raw.trim())
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return undefined
    return `https://${url.hostname.toLowerCase()}${url.pathname.replace(/\/+$/, '')}`
  } catch {
    return undefined
  }
}

/** Parse `owner/repo` out of a git remote URL (https or ssh). */
export function repoNameFromRemote(remote: string): string | undefined {
  const match = /github\.com[:/][^/]+\/([^/\s]+?)(?:\.git)?\/?$/i.exec(remote.trim())
  return match?.[1]
}

function byId(a: { id: string }, b: { id: string }): number {
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
}

/** Combine `gh repo list` metadata with local folder discovery. Pure and deterministic. */
export function buildScan(repos: readonly RepoMeta[], locals: readonly LocalFolder[]): ScanResult {
  const sites = new Map<string, GeneratedSite>()
  const unresolved = new Map<string, Unresolved>()
  const noUrl: string[] = []
  const claimedFolders = new Set<string>()

  for (const repo of repos) {
    if (repo.isFork || repo.isArchived || isExcluded(repo.name)) continue
    const local = locals.find((l) => l.repoName?.toLowerCase() === repo.name.toLowerCase())
    if (local) claimedFolders.add(local.dir)
    const id = slugify(repo.name)
    const url = cleanUrl(repo.homepageUrl) ?? local?.urls[0]
    if (!url) {
      if (local?.netlifySiteId) {
        unresolved.set(id, { id, name: repo.name, netlifySiteId: local.netlifySiteId })
      } else {
        noUrl.push(repo.name)
      }
      continue
    }
    const description = repo.description?.trim() ?? ''
    const site: GeneratedSite = {
      id,
      name: repo.name,
      url,
      repo: repo.name,
      description,
      category: guessCategory({ name: repo.name, description, tags: repo.topics }),
      tags: [...repo.topics].sort(),
      language: repo.language,
      isPrivateRepo: repo.isPrivate,
      lastPushed: repo.pushedAt,
    }
    if (repo.isPrivate) site.hidden = true
    sites.set(id, site)
  }

  // Local folders with no matching repo: keep only those that point at a deployed URL.
  for (const local of locals) {
    if (claimedFolders.has(local.dir) || isExcluded(local.dir)) continue
    if (local.repoName && isExcluded(local.repoName)) continue
    const id = slugify(local.dir)
    if (sites.has(id) || unresolved.has(id)) continue
    const url = local.urls[0]
    if (url) {
      sites.set(id, {
        id,
        name: local.dir,
        url,
        description: '',
        category: guessCategory({ name: local.dir }),
        tags: [],
        language: null,
        isPrivateRepo: false,
        lastPushed: null,
      })
    } else if (local.netlifySiteId) {
      unresolved.set(id, { id, name: local.dir, netlifySiteId: local.netlifySiteId })
    }
  }

  return {
    sites: [...sites.values()].sort(byId),
    unresolved: [...unresolved.values()].sort(byId),
    noUrl: noUrl.sort(),
  }
}
