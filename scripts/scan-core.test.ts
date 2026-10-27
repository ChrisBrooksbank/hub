import { describe, expect, it } from 'vitest'
import {
  buildScan,
  cleanUrl,
  isExcluded,
  repoNameFromRemote,
  slugify,
  type LocalFolder,
  type RepoMeta,
} from './scan-core.ts'

function repo(overrides: Partial<RepoMeta> & { name: string }): RepoMeta {
  return {
    description: null,
    homepageUrl: null,
    language: 'TypeScript',
    isPrivate: false,
    isArchived: false,
    isFork: false,
    pushedAt: '2026-10-01T00:00:00Z',
    topics: [],
    ...overrides,
  }
}

function local(overrides: Partial<LocalFolder> & { dir: string }): LocalFolder {
  return { urls: [], ...overrides }
}

describe('helpers', () => {
  it('excludes non-website repos', () => {
    for (const name of ['Vox', 'galaga', 'hue.bridge', 'cb-ralph-wiggum', 'claude-code-tools']) {
      expect(isExcluded(name)).toBe(true)
    }
    expect(isExcluded('uk-parliament-mcp-lab')).toBe(true)
    expect(isExcluded('cm123go')).toBe(false)
  })

  it('slugifies names', () => {
    expect(slugify('Two Player_Rummy 500')).toBe('two-player-rummy-500')
  })

  it('cleans URLs', () => {
    expect(cleanUrl('https://Foo.netlify.app/')).toBe('https://foo.netlify.app')
    expect(cleanUrl('')).toBeUndefined()
    expect(cleanUrl('javascript:alert(1)')).toBeUndefined()
  })

  it('parses repo names from remotes', () => {
    expect(repoNameFromRemote('https://github.com/ChrisBrooksbank/life.git\n')).toBe('life')
    expect(repoNameFromRemote('git@github.com:ChrisBrooksbank/life.git')).toBe('life')
    expect(repoNameFromRemote('https://example.com/x/y')).toBeUndefined()
  })
})

describe('buildScan', () => {
  it('uses homepageUrl, falls back to local URL, and links folders by remote', () => {
    const result = buildScan(
      [
        repo({ name: 'cm123go', homepageUrl: 'https://cm123go.netlify.app/' }),
        repo({ name: 'flags' }),
      ],
      [local({ dir: 'flags', repoName: 'flags', urls: ['https://world-flags-lab.netlify.app'] })],
    )
    expect(result.sites.map((s) => [s.id, s.url])).toEqual([
      ['cm123go', 'https://cm123go.netlify.app'],
      ['flags', 'https://world-flags-lab.netlify.app'],
    ])
  })

  it('hides private repos only', () => {
    const result = buildScan(
      [
        repo({ name: 'secret', homepageUrl: 'https://secret.netlify.app', isPrivate: true }),
        repo({ name: 'open', homepageUrl: 'https://open.netlify.app' }),
      ],
      [],
    )
    const [open, secret] = result.sites
    expect(open?.hidden).toBeUndefined()
    expect(secret).toMatchObject({ isPrivateRepo: true, hidden: true })
  })

  it('reports unresolved Netlify links and repos without URLs', () => {
    const result = buildScan(
      [repo({ name: 'mazes' }), repo({ name: 'orphan' })],
      [local({ dir: 'mazes', repoName: 'mazes', netlifySiteId: 'abc-123' })],
    )
    expect(result.sites).toEqual([])
    expect(result.unresolved).toEqual([{ id: 'mazes', name: 'mazes', netlifySiteId: 'abc-123' }])
    expect(result.noUrl).toEqual(['orphan'])
  })

  it('skips forks, archived and excluded repos', () => {
    const url = 'https://x.netlify.app'
    const result = buildScan(
      [
        repo({ name: 'a', homepageUrl: url, isFork: true }),
        repo({ name: 'b', homepageUrl: url, isArchived: true }),
        repo({ name: 'vox', homepageUrl: url }),
      ],
      [],
    )
    expect(result.sites).toEqual([])
    expect(result.noUrl).toEqual([])
  })

  it('keeps repo-less local folders that have a URL', () => {
    const result = buildScan([], [local({ dir: 'tarot', urls: ['https://tarot.netlify.app'] })])
    expect(result.sites).toMatchObject([{ id: 'tarot', url: 'https://tarot.netlify.app' }])
    expect(result.sites[0]?.repo).toBeUndefined()
  })

  it('is deterministic regardless of input order', () => {
    const a = repo({ name: 'a', homepageUrl: 'https://a.netlify.app' })
    const b = repo({ name: 'b', homepageUrl: 'https://b.netlify.app' })
    expect(buildScan([a, b], [])).toEqual(buildScan([b, a], []))
  })
})
