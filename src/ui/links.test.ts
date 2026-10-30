import { describe, expect, it } from 'vitest'
import { profileLinks } from '../profile'
import { repoUrl } from './links'

describe('repoUrl', () => {
  it('puts a bare repo name under the owner', () => {
    expect(repoUrl('Vox')).toBe('https://github.com/ChrisBrooksbank/Vox')
  })
  it('keeps owner/name and full URLs', () => {
    expect(repoUrl('someone/else')).toBe('https://github.com/someone/else')
    expect(repoUrl('https://github.com/a/b')).toBe('https://github.com/a/b')
  })
})

describe('profileLinks', () => {
  it('lists LinkedIn only when configured', () => {
    expect(
      profileLinks({ github: 'https://github.com/x', linkedin: '' }).map((l) => l.label),
    ).toEqual(['GitHub'])
    expect(
      profileLinks({ github: 'https://github.com/x', linkedin: 'https://linkedin.com/in/x' }).map(
        (l) => l.label,
      ),
    ).toEqual(['GitHub', 'LinkedIn'])
  })
})
