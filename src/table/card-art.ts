import { createArtCanvas } from '../engine/procedural-art'
import type { Site } from '../data/schema'

export const FACE_WIDTH = 400
export const FACE_HEIGHT = 560

const PAPER = '#f6f1e6'
const INK = '#1c1b19'
const MUTED = '#5d5a52'
const FALLBACK_ACCENT = '#6b7280'
const MARGIN = 24
const IMAGE_HEIGHT = 230

/** Splits `text` into at most `maxLines` lines that fit `maxWidth`, ellipsising the overflow. */
export function wrapLines(
  measure: (text: string) => number,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ''
  for (const [index, word] of words.entries()) {
    const attempt = current ? `${current} ${word}` : word
    if (measure(attempt) <= maxWidth || !current) {
      current = attempt
      continue
    }
    lines.push(current)
    current = word
    if (lines.length === maxLines - 1) {
      current = words.slice(index).join(' ')
      break
    }
  }
  if (current) lines.push(current)
  const last = lines.length - 1
  if (last >= 0 && measure(lines[last]!) > maxWidth) {
    let clipped = lines[last]!
    while (clipped.length > 1 && measure(`${clipped}…`) > maxWidth) clipped = clipped.slice(0, -1)
    lines[last] = `${clipped.trimEnd()}…`
  }
  return lines
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  context.beginPath()
  context.roundRect(x, y, width, height, radius)
}

function drawCover(
  context: CanvasRenderingContext2D,
  source: CanvasImageSource & { width: number; height: number },
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  const scale = Math.max(width / source.width, height / source.height)
  const sw = width / scale
  const sh = height / scale
  context.drawImage(
    source,
    (source.width - sw) / 2,
    0,
    sw,
    Math.min(sh, source.height),
    x,
    y,
    width,
    height,
  )
}

/**
 * Paints a card face: screenshot (or generated art) on top, category, name and a short
 * description below. `image` is the loaded thumbnail, if any.
 */
export function drawCardFace(
  canvas: HTMLCanvasElement,
  site: Site,
  image?: CanvasImageSource & { width: number; height: number },
  favourite = false,
  /** A project with no live demo: greyed, dashed, and labelled. */
  muted = false,
): void {
  const context = canvas.getContext('2d')
  if (!context) return
  const accent = muted ? '#6f6b60' : (site.accent ?? FALLBACK_ACCENT)
  const inner = FACE_WIDTH - MARGIN * 2

  context.clearRect(0, 0, FACE_WIDTH, FACE_HEIGHT)
  roundedRect(context, 0, 0, FACE_WIDTH, FACE_HEIGHT, 28)
  context.fillStyle = muted ? '#d9d4c7' : PAPER
  context.fill()

  context.save()
  roundedRect(context, MARGIN, MARGIN, inner, IMAGE_HEIGHT, 14)
  context.clip()
  const picture = image ?? createArtCanvas(site.id, site.accent)
  if (muted && 'filter' in context) context.filter = 'grayscale(1) contrast(0.9)'
  if (picture) drawCover(context, picture, MARGIN, MARGIN, inner, IMAGE_HEIGHT)
  else {
    context.fillStyle = accent
    context.fillRect(MARGIN, MARGIN, inner, IMAGE_HEIGHT)
  }
  if ('filter' in context) context.filter = 'none'
  context.restore()

  if (!muted && site.url) {
    context.fillStyle = 'rgba(8, 20, 14, 0.78)'
    context.beginPath()
    context.roundRect(MARGIN + 12, MARGIN + 12, 78, 30, 15)
    context.fill()
    context.fillStyle = '#3ddc84'
    context.beginPath()
    context.arc(MARGIN + 30, MARGIN + 27, 6, 0, Math.PI * 2)
    context.fill()
    context.fillStyle = '#e9fff1'
    context.font = '700 16px system-ui, sans-serif'
    context.textAlign = 'left'
    context.textBaseline = 'middle'
    context.fillText('LIVE', MARGIN + 44, MARGIN + 28)
    context.textBaseline = 'alphabetic'
  }

  if (favourite) {
    context.beginPath()
    context.arc(FACE_WIDTH - MARGIN - 30, MARGIN + 30, 22, 0, Math.PI * 2)
    context.fillStyle = 'rgba(0, 0, 0, 0.6)'
    context.fill()
    context.fillStyle = '#ffd34d'
    context.font = '700 28px system-ui, sans-serif'
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText('★', FACE_WIDTH - MARGIN - 30, MARGIN + 31)
    context.textAlign = 'left'
  }

  let y = MARGIN + IMAGE_HEIGHT + 34
  context.textBaseline = 'alphabetic'
  context.fillStyle = accent
  context.font = '700 20px system-ui, sans-serif'
  context.fillText(site.category.toUpperCase(), MARGIN, y)

  y += 14
  context.fillStyle = INK
  context.font = '700 34px system-ui, sans-serif'
  const title = wrapLines((t) => context.measureText(t).width, site.name, inner, 2)
  for (const line of title) {
    y += 38
    context.fillText(line, MARGIN, y)
  }

  y += 12
  context.fillStyle = MUTED
  context.font = '400 22px system-ui, sans-serif'
  const room = Math.max(1, Math.floor((FACE_HEIGHT - MARGIN - 28 - y) / 28))
  const body = wrapLines((t) => context.measureText(t).width, site.description, inner, room)
  for (const line of body) {
    y += 28
    context.fillText(line, MARGIN, y)
  }

  context.fillStyle = accent
  context.fillRect(MARGIN, FACE_HEIGHT - 20, inner, 6)

  if (muted) {
    context.setLineDash([14, 10])
    context.strokeStyle = '#8b867a'
    context.lineWidth = 4
    context.beginPath()
    context.roundRect(9, 9, FACE_WIDTH - 18, FACE_HEIGHT - 18, 22)
    context.stroke()
    context.setLineDash([])
    context.fillStyle = '#5a564c'
    context.font = '700 18px system-ui, sans-serif'
    context.textAlign = 'right'
    context.fillText('NO LIVE DEMO', FACE_WIDTH - MARGIN, MARGIN + IMAGE_HEIGHT + 34)
    context.textAlign = 'left'
  } else if (site.status === 'dead') {
    context.fillStyle = '#b00020'
    context.font = '700 20px system-ui, sans-serif'
    context.textAlign = 'right'
    context.fillText('MAY BE OFFLINE', FACE_WIDTH - MARGIN, MARGIN + IMAGE_HEIGHT + 34)
    context.textAlign = 'left'
  }
}
