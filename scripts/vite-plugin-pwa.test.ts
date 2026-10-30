import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { BUILD_ID_TOKEN, stampServiceWorker } from './vite-plugin-pwa'

describe('stampServiceWorker', () => {
  it('replaces every token', () => {
    const stamped = stampServiceWorker(`a ${BUILD_ID_TOKEN} b ${BUILD_ID_TOKEN}`, 'abc')
    expect(stamped).toBe('a abc b abc')
  })

  it('the shipped worker carries the token', () => {
    expect(readFileSync('public/sw.js', 'utf8')).toContain(BUILD_ID_TOKEN)
  })
})

describe('web app manifest', () => {
  const manifest = JSON.parse(readFileSync('public/manifest.webmanifest', 'utf8')) as {
    name: string
    start_url: string
    display: string
    icons: { src: string; sizes: string; purpose?: string }[]
  }

  it('is installable', () => {
    expect(manifest.name).toBeTruthy()
    expect(manifest.start_url).toBe('/')
    expect(manifest.display).toBe('standalone')
    const sizes = manifest.icons.map((icon) => icon.sizes)
    expect(sizes).toContain('192x192')
    expect(sizes).toContain('512x512')
    expect(manifest.icons.some((icon) => icon.purpose === 'maskable')).toBe(true)
  })
})
