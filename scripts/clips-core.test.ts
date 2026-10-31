import { describe, expect, it } from 'vitest'
import { pickGif } from './clips-core.ts'

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
