export const ART_WIDTH = 320
export const ART_HEIGHT = 200

type Rgb = readonly [number, number, number]

/** FNV-1a: stable 32-bit hash of a string. */
export function hashString(text: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

/** mulberry32: small seeded PRNG returning floats in [0, 1). */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hslToRgb(h: number, s: number, l: number): Rgb {
  const a = s * Math.min(l, 1 - l)
  const channel = (n: number): number => {
    const k = (n + h / 30) % 12
    return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))))
  }
  return [channel(0), channel(8), channel(4)]
}

function parseHex(color: string | undefined): Rgb | undefined {
  const match = /^#?([0-9a-f]{6})$/i.exec(color ?? '')
  if (!match) return undefined
  const value = parseInt(match[1]!, 16)
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
}

const mix = (a: Rgb, b: Rgb, t: number): Rgb => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
]

/**
 * Deterministic RGBA pixels for a site: the same id and accent always give the same
 * buffer. Colour comes from `accent` when valid, otherwise from a hash of the id.
 */
export function renderArtPixels(
  id: string,
  accent?: string,
  width = ART_WIDTH,
  height = ART_HEIGHT,
): Uint8ClampedArray {
  const random = seededRandom(hashString(id))
  const base = parseHex(accent) ?? hslToRgb(random() * 360, 0.65, 0.5)
  const dark = mix(base, [0, 0, 0], 0.65)
  const light = mix(base, [255, 255, 255], 0.35)
  const angle = random() * Math.PI * 2
  const dx = Math.cos(angle)
  const dy = Math.sin(angle)

  const pixels = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const t = ((x / width - 0.5) * dx + (y / height - 0.5) * dy) * 0.9 + 0.5
      const color = mix(dark, base, Math.min(1, Math.max(0, t)))
      const offset = (y * width + x) * 4
      pixels[offset] = color[0]
      pixels[offset + 1] = color[1]
      pixels[offset + 2] = color[2]
      pixels[offset + 3] = 255
    }
  }

  const blobs = 4 + Math.floor(random() * 4)
  for (let i = 0; i < blobs; i++) {
    const cx = random() * width
    const cy = random() * height
    const radius = (0.15 + random() * 0.3) * height
    const alpha = 0.15 + random() * 0.3
    const x0 = Math.max(0, Math.floor(cx - radius))
    const x1 = Math.min(width - 1, Math.ceil(cx + radius))
    const y0 = Math.max(0, Math.floor(cy - radius))
    const y1 = Math.min(height - 1, Math.ceil(cy + radius))
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const d = Math.hypot(x - cx, y - cy) / radius
        if (d >= 1) continue
        const weight = alpha * (1 - d * d)
        const offset = (y * width + x) * 4
        for (let c = 0; c < 3; c++) {
          pixels[offset + c] = pixels[offset + c]! + (light[c]! - pixels[offset + c]!) * weight
        }
      }
    }
  }
  return pixels
}

/** Draws the art to a canvas; undefined when 2D canvas is unavailable. */
export function createArtCanvas(id: string, accent?: string): HTMLCanvasElement | undefined {
  const canvas = document.createElement('canvas')
  canvas.width = ART_WIDTH
  canvas.height = ART_HEIGHT
  let context: CanvasRenderingContext2D | null
  try {
    context = canvas.getContext('2d')
  } catch {
    context = null
  }
  if (!context) return undefined
  const image = context.createImageData(ART_WIDTH, ART_HEIGHT)
  image.data.set(renderArtPixels(id, accent))
  context.putImageData(image, 0, 0)
  return canvas
}

/** PNG data URL for the list view; undefined when canvas is unavailable. */
export function artDataUrl(id: string, accent?: string): string | undefined {
  try {
    const url = createArtCanvas(id, accent)?.toDataURL('image/png')
    return url?.startsWith('data:image') ? url : undefined
  } catch {
    return undefined
  }
}
