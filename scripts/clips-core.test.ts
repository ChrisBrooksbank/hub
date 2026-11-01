import { describe, expect, it } from 'vitest'
import { pickGif, repoPathFromUrl } from './clips-core.ts'

describe('pickGif', () => {
  it('finds a Markdown image', () => {
    expect(pickGif('![demo](docs/media/demo.gif)')).toBe('docs/media/demo.gif')
  })

  it('finds an HTML image and strips ./', () => {
    expect(pickGif('<img src="./docs/media/orbit.gif" width="400">')).toBe('docs/media/orbit.gif')
  })

  it('prefers a hero or demo GIF over the first one', () => {
    const readme = '![a](docs/orbit.gif)\n![b](docs/hero.gif)\n![c](docs/tour.gif)'
    expect(pickGif(readme)).toBe('docs/hero.gif')
  })

  it('falls back to the first GIF', () => {
    expect(pickGif('![a](docs/orbit.gif) ![b](docs/spin.gif)')).toBe('docs/orbit.gif')
  })

  it('ignores absolute URLs and READMEs without a GIF', () => {
    expect(pickGif('![x](https://example.com/a.gif)')).toBeUndefined()
    expect(pickGif('# Title\n![x](shot.png)')).toBeUndefined()
  })
})

describe('pickGif with a repo', () => {
  const repo = { owner: 'ChrisBrooksbank', name: 'demo' }
  const url = 'https://raw.githubusercontent.com/ChrisBrooksbank/demo/main/docs/media/mcp-demo.gif'

  it('accepts an absolute raw URL into the same repo', () => {
    expect(pickGif(`<img src="${url}" width="100%">`, repo)).toBe('docs/media/mcp-demo.gif')
  })

  it('still ignores other repos and other hosts', () => {
    const other = 'https://raw.githubusercontent.com/someone/else/main/a.gif'
    expect(pickGif(`![x](${other})`, repo)).toBeUndefined()
    expect(pickGif('![x](https://example.com/a.gif)', repo)).toBeUndefined()
  })
})

describe('repoPathFromUrl', () => {
  it('handles raw, blob and raw-link forms, ignoring case', () => {
    expect(
      repoPathFromUrl(
        'https://github.com/chrisbrooksbank/demo/raw/main/a/b.gif',
        'ChrisBrooksbank',
        'demo',
      ),
    ).toBe('a/b.gif')
    expect(
      repoPathFromUrl(
        'https://github.com/ChrisBrooksbank/demo/blob/main/a.gif',
        'ChrisBrooksbank',
        'demo',
      ),
    ).toBe('a.gif')
    expect(
      repoPathFromUrl(
        'https://github.com/ChrisBrooksbank/other/blob/main/a.gif',
        'ChrisBrooksbank',
        'demo',
      ),
    ).toBeUndefined()
  })
})
