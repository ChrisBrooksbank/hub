import { describe, expect, it } from 'vitest'
import { wrapLines } from './card-art'

const measure = (text: string): number => text.length

describe('wrapLines', () => {
  it('keeps short text on one line', () => {
    expect(wrapLines(measure, 'hello world', 20, 3)).toEqual(['hello world'])
  })

  it('wraps at word boundaries', () => {
    expect(wrapLines(measure, 'one two three four', 9, 4)).toEqual(['one two', 'three', 'four'])
  })

  it('ellipsises what does not fit in the line budget', () => {
    const lines = wrapLines(measure, 'one two three four five six', 9, 2)
    expect(lines).toHaveLength(2)
    expect(lines[1]!.endsWith('…')).toBe(true)
    expect(lines[1]!.length).toBeLessThanOrEqual(9)
  })

  it('clips a single word wider than the line', () => {
    const [line] = wrapLines(measure, 'extraordinarily', 6, 1)
    expect(line).toBe('extra…')
  })

  it('returns nothing for empty text', () => {
    expect(wrapLines(measure, '', 10, 2)).toEqual([])
  })
})
