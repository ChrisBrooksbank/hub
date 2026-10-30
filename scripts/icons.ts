import { mkdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = resolve(ROOT, 'public', 'icons')
mkdirSync(OUT, { recursive: true })
const svg = readFileSync(resolve(OUT, 'icon.svg'))

/** Plain icons fill the square; the maskable one shrinks the art into the safe zone. */
const targets = [
  { file: 'icon-192.png', size: 192, inset: 0 },
  { file: 'icon-512.png', size: 512, inset: 0 },
  { file: 'icon-maskable-512.png', size: 512, inset: 0.16 },
  { file: 'apple-touch-icon.png', size: 180, inset: 0 },
]

for (const { file, size, inset } of targets) {
  const art = Math.round(size * (1 - inset * 2))
  const image = sharp(svg, { density: 384 }).resize(art, art)
  const buffer = await (inset === 0
    ? image.png().toBuffer()
    : sharp({ create: { width: size, height: size, channels: 4, background: '#0c2a1f' } })
        .composite([
          {
            input: await image.png().toBuffer(),
            left: Math.round((size - art) / 2),
            top: Math.round((size - art) / 2),
          },
        ])
        .png()
        .toBuffer())
  await sharp(buffer).toFile(resolve(OUT, file))
  console.log(`wrote ${file}`)
}
