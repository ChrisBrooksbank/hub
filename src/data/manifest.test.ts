import { describe, expect, it } from 'vitest'
import { parseManifest } from './manifest'

const valid = {
  id: 'life',
  name: 'Life',
  url: 'https://life.netlify.app',
  repo: 'conways-life-sim',
  description: 'Conway sim',
  category: 'Games',
  tags: ['sim'],
  language: 'TypeScript',
  isPrivateRepo: false,
  lastPushed: '2026-10-01T00:00:00Z',
}

describe('parseManifest', () => {
  it('accepts a valid manifest and defaults status to live', () => {
    const [site] = parseManifest([valid])
    expect(site?.status).toBe('live')
  })

  it('accepts optional fields and repo-less sites', () => {
    const noRepo: Partial<typeof valid> = { ...valid }
    delete noRepo.repo
    const [site] = parseManifest([
      { ...noRepo, hidden: true, accent: '#ff00aa', thumbMode: 'generated', status: 'dead' },
    ])
    expect(site?.repo).toBeUndefined()
    expect(site?.hidden).toBe(true)
  })

  it('throws a readable error naming the bad field', () => {
    expect(() => parseManifest([{ ...valid, url: 'nope' }], 'sites.json')).toThrow(
      /Invalid sites\.json:\n {2}- 0\.url/,
    )
  })

  it('rejects a non-array manifest', () => {
    expect(() => parseManifest({})).toThrow(/Invalid manifest/)
  })

  it('rejects duplicate ids and bad accents', () => {
    expect(() => parseManifest([valid, valid])).toThrow(/duplicate site id "life"/)
    expect(() => parseManifest([{ ...valid, accent: 'red' }])).toThrow(/accent/)
  })
})
