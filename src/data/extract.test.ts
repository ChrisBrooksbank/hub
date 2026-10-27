import { describe, expect, it } from 'vitest'
import { extractUrls, guessCategory, netlifySiteId } from './extract'

describe('extractUrls', () => {
  it('finds all supported hosts', () => {
    const text = `
      Live: https://cm123go.netlify.app
      https://planningpoker-x.azurewebsites.net/
      [demo](https://thing.pages.dev/app)
      https://chris.github.io/repo
      https://foo-bar.vercel.app.
    `
    expect(extractUrls(text)).toEqual([
      'https://cm123go.netlify.app',
      'https://planningpoker-x.azurewebsites.net',
      'https://thing.pages.dev/app',
      'https://chris.github.io/repo',
      'https://foo-bar.vercel.app',
    ])
  })

  it('dedupes, lowercases hosts and ignores unrelated or infrastructure hosts', () => {
    const text =
      'https://Life.Netlify.app http://life.netlify.app/ https://example.com https://app.netlify.app'
    expect(extractUrls(text)).toEqual(['https://life.netlify.app'])
  })

  it('does not match lookalike suffixes', () => {
    expect(extractUrls('https://x.netlify.app.evil.com')).toEqual([])
    expect(extractUrls('https://x.notnetlify.app')).toEqual([])
  })

  it('handles netlify.toml style quoting', () => {
    expect(extractUrls('url = "https://mazes.netlify.app"')).toEqual(['https://mazes.netlify.app'])
  })
})

describe('netlifySiteId', () => {
  it('reads siteId', () => {
    expect(netlifySiteId('{"siteId":"abc-123"}')).toBe('abc-123')
  })
  it('returns undefined for bad input', () => {
    expect(netlifySiteId('not json')).toBeUndefined()
    expect(netlifySiteId('{}')).toBeUndefined()
    expect(netlifySiteId('{"siteId":""}')).toBeUndefined()
  })
})

describe('guessCategory', () => {
  it.each([
    [{ name: 'uk-parliament-learn' }, 'Parliament'],
    [{ name: 'cm123go', description: 'Chelmsford bus times' }, 'Local (Chelmsford)'],
    [{ name: 'selfhypnosis' }, 'Wellbeing'],
    [{ name: 'two-player-rummy-500' }, 'Games'],
    [{ name: 'kaleidoscope' }, '3D & Visual'],
    [{ name: 'montecarlo-explained' }, 'Learning'],
    [{ name: 'bookmark-vault', description: 'Organise links' }, 'Tools'],
    [{ name: 'x', tags: ['puzzle'] }, 'Games'],
  ] as const)('%j -> %s', (input, expected) => {
    expect(guessCategory(input)).toBe(expected)
  })
})
