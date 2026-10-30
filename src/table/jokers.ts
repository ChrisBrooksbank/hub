import type { Site } from '../data/schema'
import { PROFILE } from '../profile'
import { FACE_HEIGHT, FACE_WIDTH } from './card-art'

export type JokerVariant = 'red' | 'black'

const INK = '#1c1b19'
const PAPER = '#f6f1e6'
const GOLD = '#e2b645'
const SKIN = '#f6dcc0'

const VARIANTS: Record<JokerVariant, { suit: string; deep: string }> = {
  red: { suit: '#c1272d', deep: '#7d1218' },
  black: { suit: INK, deep: '#000000' },
}

/** Two synthetic "sites": the Joker cards are the maker, not a site, and open an About panel. */
export const JOKERS: readonly Site[] = (['red', 'black'] as const).map((variant) => ({
  id: `joker-${variant}`,
  name: PROFILE.name,
  url: PROFILE.github,
  description: PROFILE.tagline,
  category: 'About',
  tags: [],
  language: null,
  isPrivateRepo: true,
  lastPushed: null,
  status: 'live' as const,
  accent: VARIANTS[variant].suit,
}))

export function isJoker(id: string): boolean {
  return id.startsWith('joker-')
}

export function jokerVariant(id: string): JokerVariant {
  return id.endsWith('black') ? 'black' : 'red'
}

function horn(
  context: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  controlX: number,
  controlY: number,
  toX: number,
  toY: number,
  colour: string,
): void {
  context.strokeStyle = INK
  context.lineWidth = 3
  context.fillStyle = colour
  context.beginPath()
  context.moveTo(fromX - 26, fromY)
  context.quadraticCurveTo(controlX - 6, controlY, toX, toY)
  context.quadraticCurveTo(controlX + 10, controlY + 10, fromX + 26, fromY)
  context.closePath()
  context.fill()
  context.stroke()
  context.fillStyle = GOLD
  context.beginPath()
  context.arc(toX, toY, 10, 0, Math.PI * 2)
  context.fill()
  context.stroke()
}

/**
 * Paints a Joker: harlequin panel, jester cap and ruff around a portrait (or a painted jester
 * face when there is no photo), and a ribbon with the maker's full name.
 */
export function drawJokerFace(
  canvas: HTMLCanvasElement,
  variant: JokerVariant,
  photo?: CanvasImageSource & { width: number; height: number },
): void {
  const context = canvas.getContext('2d')
  if (!context) return
  const { suit, deep } = VARIANTS[variant]
  const margin = 24
  const inner = FACE_WIDTH - margin * 2

  context.clearRect(0, 0, FACE_WIDTH, FACE_HEIGHT)
  context.beginPath()
  context.roundRect(0, 0, FACE_WIDTH, FACE_HEIGHT, 28)
  context.fillStyle = PAPER
  context.fill()

  context.save()
  context.beginPath()
  context.roundRect(margin, margin, inner, FACE_HEIGHT - margin * 2, 14)
  context.clip()
  const size = 46
  for (let row = -1; row < FACE_HEIGHT / size + 1; row++) {
    for (let column = -1; column < FACE_WIDTH / size + 1; column++) {
      const x = column * size + (row % 2 === 0 ? 0 : size / 2)
      const y = row * (size / 2)
      context.fillStyle = (row + column) % 2 === 0 ? suit : deep
      context.globalAlpha = 0.9
      context.beginPath()
      context.moveTo(x, y - size / 2)
      context.lineTo(x + size / 2, y)
      context.lineTo(x, y + size / 2)
      context.lineTo(x - size / 2, y)
      context.closePath()
      context.fill()
    }
  }
  context.globalAlpha = 1
  context.restore()

  context.fillStyle = PAPER
  context.font = '700 20px Georgia, serif'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  const letters = 'JOKER'.split('')
  for (const [index, letter] of letters.entries()) {
    context.fillText(letter, margin + 20, margin + 44 + index * 24)
    context.fillText(letter, FACE_WIDTH - margin - 20, FACE_HEIGHT - margin - 44 - (4 - index) * 24)
  }

  const cx = FACE_WIDTH / 2
  const cy = 252
  horn(
    context,
    cx - 40,
    cy - 78,
    cx - 120,
    cy - 170,
    cx - 150,
    cy - 118,
    suit === INK ? '#34312c' : suit,
  )
  horn(context, cx + 40, cy - 78, cx + 120, cy - 170, cx + 118, cy - 128, GOLD)
  horn(context, cx, cy - 92, cx - 10, cy - 190, cx + 4, cy - 176, INK === suit ? GOLD : '#2a2724')

  context.lineWidth = 6
  context.strokeStyle = INK
  context.fillStyle = SKIN
  context.beginPath()
  context.arc(cx, cy, 98, 0, Math.PI * 2)
  context.fill()
  if (photo) {
    context.save()
    context.beginPath()
    context.arc(cx, cy, 98, 0, Math.PI * 2)
    context.clip()
    const scale = Math.max(196 / photo.width, 196 / photo.height)
    context.drawImage(
      photo,
      cx - (photo.width * scale) / 2,
      cy - (photo.height * scale) / 2,
      photo.width * scale,
      photo.height * scale,
    )
    context.restore()
  } else {
    context.fillStyle = INK
    for (const side of [-1, 1]) {
      context.beginPath()
      context.moveTo(cx + side * 36, cy - 30)
      context.lineTo(cx + side * 50, cy - 16)
      context.lineTo(cx + side * 36, cy - 2)
      context.lineTo(cx + side * 22, cy - 16)
      context.closePath()
      context.fill()
    }
    context.fillStyle = 'rgba(214, 90, 90, 0.45)'
    for (const side of [-1, 1]) {
      context.beginPath()
      context.arc(cx + side * 56, cy + 22, 14, 0, Math.PI * 2)
      context.fill()
    }
    context.strokeStyle = INK
    context.lineWidth = 5
    context.lineCap = 'round'
    context.beginPath()
    context.arc(cx, cy + 14, 44, 0.15 * Math.PI, 0.85 * Math.PI)
    context.stroke()
    context.beginPath()
    context.moveTo(cx - 3, cy + 6)
    context.lineTo(cx, cy + 22)
    context.lineTo(cx + 5, cy + 20)
    context.stroke()
  }
  context.strokeStyle = INK
  context.lineWidth = 6
  context.beginPath()
  context.arc(cx, cy, 98, 0, Math.PI * 2)
  context.stroke()

  const ruffY = cy + 92
  context.fillStyle = PAPER
  context.strokeStyle = INK
  context.lineWidth = 3
  context.beginPath()
  context.moveTo(cx - 118, ruffY)
  for (let i = 0; i < 8; i++) {
    context.lineTo(cx - 118 + i * 29.5 + 14.75, ruffY + 34)
    context.lineTo(cx - 118 + (i + 1) * 29.5, ruffY)
  }
  context.closePath()
  context.fill()
  context.stroke()

  const ribbonY = 424
  context.fillStyle = INK
  context.beginPath()
  context.moveTo(margin - 6, ribbonY)
  context.lineTo(FACE_WIDTH - margin + 6, ribbonY)
  context.lineTo(FACE_WIDTH - margin - 6, ribbonY + 30)
  context.lineTo(FACE_WIDTH - margin + 6, ribbonY + 60)
  context.lineTo(margin - 6, ribbonY + 60)
  context.lineTo(margin + 6, ribbonY + 30)
  context.closePath()
  context.fill()
  context.strokeStyle = GOLD
  context.lineWidth = 2
  context.stroke()
  context.fillStyle = PAPER
  context.font = '700 29px Georgia, serif'
  context.textBaseline = 'middle'
  context.fillText(PROFILE.name.toUpperCase(), cx, ribbonY + 31, inner - 30)

  context.fillStyle = INK
  context.font = '700 15px system-ui, sans-serif'
  context.fillText('IDEAS MAN  ·  STEERER OF ROBOTS', cx, ribbonY + 88)
}
