import { hashString, seededRandom } from '../engine/procedural-art'
import { PROFILE } from '../profile'

const BACK_WIDTH = 400
const BACK_HEIGHT = 560

const PAPER = '#f6f1e6'
const INSET = 18
const CX = BACK_WIDTH / 2
const CY = BACK_HEIGHT / 2
const TAU = Math.PI * 2

type Ctx = CanvasRenderingContext2D
type Paint = (context: Ctx) => void

export interface CardBack {
  id: string
  name: string
  paint: Paint
}

const rng = (name: string): (() => number) => seededRandom(hashString(name))

function fill(c: Ctx, color: string | CanvasGradient): void {
  c.fillStyle = color
  c.fillRect(0, 0, BACK_WIDTH, BACK_HEIGHT)
}

function radial(c: Ctx, inner: string, outer: string, radius = 330): CanvasGradient {
  const gradient = c.createRadialGradient(CX, CY, 10, CX, CY, radius)
  gradient.addColorStop(0, inner)
  gradient.addColorStop(1, outer)
  return gradient
}

function star(c: Ctx, x: number, y: number, outer: number, inner: number, points: number): void {
  c.beginPath()
  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? outer : inner
    const angle = (i / (points * 2)) * TAU - Math.PI / 2
    const px = x + Math.cos(angle) * radius
    const py = y + Math.sin(angle) * radius
    if (i === 0) c.moveTo(px, py)
    else c.lineTo(px, py)
  }
  c.closePath()
}

function dot(c: Ctx, x: number, y: number, radius: number): void {
  c.beginPath()
  c.arc(x, y, radius, 0, TAU)
  c.fill()
}

/* 1. Arcana: the tarot table. Sun, all-seeing eye and moons in perfect mirror symmetry. */
function arcana(c: Ctx): void {
  const gold = '#e6c26a'
  fill(c, radial(c, '#2b2363', '#0b0d29'))
  for (const [sx, sy] of [
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1],
  ] as const) {
    c.save()
    c.translate(CX, CY)
    c.scale(sx, sy)
    const random = rng('arcana-quadrant')
    c.fillStyle = '#fff6da'
    for (let i = 0; i < 16; i++) {
      c.globalAlpha = 0.25 + random() * 0.6
      dot(c, 24 + random() * 150, 24 + random() * 235, 0.8 + random() * 1.7)
    }
    c.globalAlpha = 1
    c.fillStyle = gold
    star(c, 128, 208, 18, 6.5, 8)
    c.fill()
    c.strokeStyle = gold
    c.lineWidth = 1.5
    c.beginPath()
    c.arc(150, 232, 34, Math.PI, Math.PI * 1.5)
    c.moveTo(150, 232)
    c.stroke()
    c.restore()
  }
  c.strokeStyle = gold
  for (const [inset, width, alpha] of [
    [34, 2.5, 0.9],
    [44, 1, 0.5],
  ] as const) {
    c.globalAlpha = alpha
    c.lineWidth = width
    c.beginPath()
    c.roundRect(inset, inset, BACK_WIDTH - inset * 2, BACK_HEIGHT - inset * 2, 12)
    c.stroke()
  }
  c.globalAlpha = 1

  c.save()
  c.translate(CX, CY)
  c.fillStyle = gold
  for (let ray = 0; ray < 24; ray++) {
    const angle = (ray / 24) * TAU
    c.save()
    c.rotate(angle)
    if (ray % 2 === 0) {
      c.beginPath()
      c.moveTo(74, -9)
      c.lineTo(138, 0)
      c.lineTo(74, 9)
      c.closePath()
      c.fill()
    } else {
      c.strokeStyle = gold
      c.lineWidth = 3
      c.beginPath()
      for (let step = 0; step <= 20; step++) {
        const x = 76 + step * 2.6
        const y = Math.sin(step * 0.9) * 5
        if (step === 0) c.moveTo(x, y)
        else c.lineTo(x, y)
      }
      c.stroke()
    }
    c.restore()
  }
  const disc = c.createRadialGradient(-14, -14, 4, 0, 0, 74)
  disc.addColorStop(0, '#fff0b8')
  disc.addColorStop(1, '#d99a2b')
  c.fillStyle = disc
  c.beginPath()
  c.arc(0, 0, 70, 0, TAU)
  c.fill()
  c.strokeStyle = '#2b2363'
  c.lineWidth = 3
  c.stroke()
  c.fillStyle = '#fff8e6'
  c.beginPath()
  c.moveTo(-50, 0)
  c.quadraticCurveTo(0, -42, 50, 0)
  c.quadraticCurveTo(0, 42, -50, 0)
  c.fill()
  c.stroke()
  c.fillStyle = '#2b2363'
  dot(c, 0, 0, 19)
  c.fillStyle = '#0b0d29'
  dot(c, 0, 0, 8)
  c.fillStyle = '#fff'
  dot(c, -6, -6, 3)
  c.restore()

  for (const flip of [1, -1]) {
    c.save()
    c.translate(CX, CY)
    c.scale(1, flip)
    c.fillStyle = gold
    c.beginPath()
    c.arc(0, -196, 30, 0, TAU)
    c.arc(8, -202, 26, 0, TAU, true)
    c.fill('evenodd')
    star(c, 0, -150, 9, 3, 4)
    c.fill()
    c.restore()
  }
}

/* 2. Prism: one white beam in, the spectrum out, a heartbeat underneath. */
function prism(c: Ctx): void {
  fill(c, '#06060b')
  const vignette = radial(c, 'rgba(70,70,110,0.35)', 'rgba(0,0,0,0)', 300)
  fill(c, vignette)
  const random = rng('prism')
  c.fillStyle = '#fff'
  for (let i = 0; i < 40; i++) {
    c.globalAlpha = 0.1 + random() * 0.35
    dot(c, random() * BACK_WIDTH, random() * BACK_HEIGHT, 0.6 + random())
  }
  c.globalAlpha = 1

  const side = 230
  const height = (side * Math.sqrt(3)) / 2
  const cx = CX - 6
  const cy = CY - 28
  const top = { x: cx, y: cy - (height * 2) / 3 }
  const left = { x: cx - side / 2, y: cy + height / 3 }
  const right = { x: cx + side / 2, y: cy + height / 3 }
  const along = (a: typeof top, b: typeof top, t: number) => ({
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  })
  const enter = along(top, left, 0.6)
  const exit = along(top, right, 0.66)

  c.save()
  c.shadowColor = '#fff'
  c.shadowBlur = 16
  c.strokeStyle = '#fff'
  c.lineWidth = 4
  c.beginPath()
  c.moveTo(0, enter.y + 78)
  c.lineTo(enter.x, enter.y)
  c.stroke()
  c.restore()

  const colours = ['#ff2d2d', '#ff9a1f', '#ffe433', '#37d65a', '#2f9bff', '#8a4dff']
  c.globalCompositeOperation = 'lighter'
  const spread = 26
  const start = exit.y + 40
  colours.forEach((colour, index) => {
    c.fillStyle = colour
    c.globalAlpha = 0.85
    c.beginPath()
    c.moveTo(exit.x, exit.y)
    c.lineTo(BACK_WIDTH, start + index * spread)
    c.lineTo(BACK_WIDTH, start + (index + 1) * spread)
    c.closePath()
    c.fill()
  })
  c.globalCompositeOperation = 'source-over'
  c.globalAlpha = 1

  const glass = c.createLinearGradient(left.x, top.y, right.x, right.y)
  glass.addColorStop(0, 'rgba(255,255,255,0.22)')
  glass.addColorStop(1, 'rgba(255,255,255,0.03)')
  c.beginPath()
  c.moveTo(top.x, top.y)
  c.lineTo(left.x, left.y)
  c.lineTo(right.x, right.y)
  c.closePath()
  c.fillStyle = glass
  c.fill()
  c.strokeStyle = '#fff'
  c.lineWidth = 3
  c.stroke()
  c.strokeStyle = 'rgba(255,255,255,0.85)'
  c.lineWidth = 2
  c.beginPath()
  c.moveTo(enter.x, enter.y)
  c.lineTo(exit.x, exit.y)
  c.stroke()

  c.strokeStyle = 'rgba(255,255,255,0.4)'
  c.lineWidth = 2.5
  c.lineJoin = 'round'
  const baseline = 446
  c.beginPath()
  c.moveTo(0, baseline)
  const beats = [60, 150, 260, 340]
  let x = 0
  for (const beat of beats) {
    c.lineTo(beat - 24, baseline)
    c.lineTo(beat - 14, baseline - 8)
    c.lineTo(beat - 6, baseline + 6)
    c.lineTo(beat, baseline - 40)
    c.lineTo(beat + 8, baseline + 22)
    c.lineTo(beat + 18, baseline)
    x = beat + 18
  }
  c.lineTo(Math.max(x, BACK_WIDTH), baseline)
  c.stroke()
}

/* 3. Life: a real Conway soup, run forward and painted as heat, with the glider emblem on top. */
function life(c: Ctx): void {
  fill(c, '#050c10')
  const cell = 8
  const cols = Math.ceil(BACK_WIDTH / cell)
  const rows = Math.ceil(BACK_HEIGHT / cell)
  const random = rng('life')
  let grid = new Uint8Array(cols * rows)
  const lastAlive = new Int16Array(cols * rows).fill(-1000)
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const dx = (x - cols / 2) / (cols / 2)
      const dy = (y - rows / 2) / (rows / 2)
      const density = 0.42 * Math.max(0.15, 1 - Math.hypot(dx, dy) * 0.7)
      grid[y * cols + x] = random() < density ? 1 : 0
    }
  }
  const generations = 38
  for (let g = 0; g <= generations; g++) {
    const next = new Uint8Array(cols * rows)
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const index = y * cols + x
        if (grid[index]) lastAlive[index] = g
        let neighbours = 0
        for (let oy = -1; oy <= 1; oy++) {
          for (let ox = -1; ox <= 1; ox++) {
            if (ox === 0 && oy === 0) continue
            const nx = x + ox
            const ny = y + oy
            if (nx >= 0 && ny >= 0 && nx < cols && ny < rows) neighbours += grid[ny * cols + nx]!
          }
        }
        next[index] = neighbours === 3 || (grid[index] && neighbours === 2) ? 1 : 0
      }
    }
    grid = next
  }
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const index = y * cols + x
      const age = generations - lastAlive[index]!
      if (grid[index]) c.fillStyle = '#e9fff3'
      else if (age < 34) c.fillStyle = `rgba(52, 214, 150, ${(1 - age / 34) * 0.75})`
      else if (lastAlive[index]! >= 0) c.fillStyle = 'rgba(22, 70, 96, 0.55)'
      else continue
      c.beginPath()
      c.roundRect(x * cell + 0.8, y * cell + 0.8, cell - 1.6, cell - 1.6, 1.8)
      c.fill()
    }
  }
  c.fillStyle = '#050c10'
  c.beginPath()
  c.arc(CX, CY, 70, 0, TAU)
  c.fill()
  c.strokeStyle = '#34d696'
  c.lineWidth = 3
  c.stroke()
  c.shadowColor = '#34d696'
  c.shadowBlur = 14
  c.fillStyle = '#eafff4'
  const glider = [
    [1, 0],
    [2, 1],
    [0, 2],
    [1, 2],
    [2, 2],
  ]
  for (const [gx, gy] of glider) {
    c.beginPath()
    c.roundRect(CX - 36 + gx! * 25, CY - 36 + gy! * 25, 22, 22, 4)
    c.fill()
  }
  c.shadowBlur = 0
}

/* 4. Orrery: the solar system as a brass dial, Earth with its moon. */
function orrery(c: Ctx): void {
  fill(c, radial(c, '#14285a', '#050a18', 300))
  const random = rng('orrery')
  c.fillStyle = '#fff'
  for (let i = 0; i < 90; i++) {
    c.globalAlpha = 0.15 + random() * 0.55
    dot(c, random() * BACK_WIDTH, random() * BACK_HEIGHT, 0.5 + random() * 1.2)
  }
  c.globalAlpha = 1
  c.save()
  c.translate(CX, CY)

  c.strokeStyle = '#e2c878'
  for (let tick = 0; tick < 72; tick++) {
    const angle = (tick / 72) * TAU
    const long = tick % 6 === 0
    c.lineWidth = long ? 2 : 1
    c.globalAlpha = long ? 0.9 : 0.5
    c.beginPath()
    c.moveTo(Math.cos(angle) * (long ? 168 : 172), Math.sin(angle) * (long ? 168 : 172))
    c.lineTo(Math.cos(angle) * 180, Math.sin(angle) * 180)
    c.stroke()
  }
  c.globalAlpha = 1

  const planets = [
    { r: 36, size: 3, colour: '#b9b9b9' },
    { r: 54, size: 5, colour: '#eac27d' },
    { r: 76, size: 5.5, colour: '#4aa3ff', moon: true },
    { r: 96, size: 4.5, colour: '#d4573b' },
    { r: 122, size: 11, colour: '#d9a273', bands: true },
    { r: 146, size: 8, colour: '#e8d28f', ring: true },
    { r: 158, size: 6, colour: '#8fe3e8' },
  ]
  const sun = c.createRadialGradient(0, 0, 2, 0, 0, 56)
  sun.addColorStop(0, '#fff6c2')
  sun.addColorStop(0.3, '#ffc552')
  sun.addColorStop(1, 'rgba(255,170,60,0)')
  for (const planet of planets) {
    c.setLineDash([2, 5])
    c.strokeStyle = 'rgba(226, 200, 120, 0.4)'
    c.lineWidth = 1.2
    c.beginPath()
    c.arc(0, 0, planet.r, 0, TAU)
    c.stroke()
  }
  c.setLineDash([])
  planets.forEach((planet, index) => {
    const angle = random() * TAU + index
    const x = Math.cos(angle) * planet.r
    const y = Math.sin(angle) * planet.r
    if (planet.ring) {
      c.strokeStyle = 'rgba(232, 210, 143, 0.9)'
      c.lineWidth = 2.4
      c.beginPath()
      c.ellipse(x, y, planet.size * 2, planet.size * 0.7, -0.4, 0, TAU)
      c.stroke()
    }
    c.fillStyle = planet.colour
    dot(c, x, y, planet.size)
    if (planet.bands) {
      c.strokeStyle = 'rgba(120, 70, 40, 0.5)'
      c.lineWidth = 1.5
      for (const offset of [-3.5, 0, 3.5]) {
        c.beginPath()
        c.moveTo(x - 9, y + offset)
        c.lineTo(x + 9, y + offset)
        c.stroke()
      }
    }
    if (planet.moon) {
      c.fillStyle = '#e8e8e8'
      dot(c, x + 12, y - 8, 1.8)
      c.strokeStyle = 'rgba(255,255,255,0.8)'
      c.lineWidth = 1.5
      c.beginPath()
      c.arc(x, y, 9, 0, TAU)
      c.stroke()
    }
  })
  c.fillStyle = sun
  dot(c, 0, 0, 56)
  c.fillStyle = '#fff3b0'
  dot(c, 0, 0, 13)

  const tail = c.createLinearGradient(-170, -240, -60, -110)
  tail.addColorStop(0, 'rgba(180,230,255,0)')
  tail.addColorStop(1, 'rgba(210,240,255,0.9)')
  c.strokeStyle = tail
  c.lineWidth = 3
  c.lineCap = 'round'
  c.beginPath()
  c.moveTo(-170, -240)
  c.lineTo(-60, -110)
  c.stroke()
  c.fillStyle = '#fff'
  dot(c, -60, -110, 3.5)
  c.restore()
}

/* 5. Enso: a single brush circle, left open, with a hanko seal. For the no-self and shadow work. */
function enso(c: Ctx): void {
  fill(c, '#efe5cf')
  const random = rng('enso')
  for (let i = 0; i < 320; i++) {
    c.strokeStyle = `rgba(120, 95, 60, ${0.05 + random() * 0.09})`
    c.lineWidth = 0.6 + random()
    const x = random() * BACK_WIDTH
    const y = random() * BACK_HEIGHT
    const angle = random() * TAU
    const length = 6 + random() * 20
    c.beginPath()
    c.moveTo(x, y)
    c.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length)
    c.stroke()
  }
  fill(c, radial(c, 'rgba(255,250,235,0)', 'rgba(110,70,30,0.28)', 340))

  const centerY = CY - 14
  const radius = 108
  const start = -2.15
  const sweep = TAU * 0.92
  c.lineCap = 'round'
  const bristles = 90
  for (let k = 0; k < bristles; k++) {
    const offset = k / (bristles - 1) - 0.5
    let down = false
    c.beginPath()
    for (let step = 0; step <= 260; step++) {
      const t = step / 260
      const width = 30 * (1 - Math.pow(t, 2.4) * 0.82) * Math.min(1, 0.35 + t * 14)
      const angle = start + t * sweep
      const r = radius + offset * width + Math.sin(t * 9 + k) * 0.6
      const dry = random() < t * 0.55 + Math.abs(offset) * 0.35 * t
      const x = CX + Math.cos(angle) * r
      const y = centerY + Math.sin(angle) * r
      if (dry) {
        down = false
      } else if (!down) {
        c.moveTo(x, y)
        down = true
      } else {
        c.lineTo(x, y)
      }
    }
    c.strokeStyle = `rgba(22, 18, 15, ${0.35 + random() * 0.4})`
    c.lineWidth = 1.7
    c.stroke()
  }
  c.fillStyle = 'rgba(22, 18, 15, 0.8)'
  for (let i = 0; i < 16; i++) {
    const angle = start + sweep + 0.05 + random() * 0.5
    const r = radius + (random() - 0.5) * 70
    dot(c, CX + Math.cos(angle) * r, centerY + Math.sin(angle) * r, 0.8 + random() * 2.4)
  }

  c.save()
  c.translate(300, 432)
  c.rotate(-0.07)
  c.fillStyle = '#c1272d'
  c.beginPath()
  c.roundRect(-34, -34, 68, 68, 7)
  c.fill()
  c.fillStyle = '#efe5cf'
  c.font = '700 33px Georgia, serif'
  c.textAlign = 'center'
  c.textBaseline = 'middle'
  c.fillText('C', -14, -11)
  c.fillText('B', 14, 14)
  c.strokeStyle = '#efe5cf'
  c.lineWidth = 2
  c.beginPath()
  c.moveTo(-22, 22)
  c.lineTo(22, -22)
  c.stroke()
  c.restore()
}

/* 6. Transit: every line runs through one interchange. The hub, literally. */
function transit(c: Ctx): void {
  fill(c, '#15171c')
  const cell = 28
  c.fillStyle = 'rgba(255,255,255,0.07)'
  for (let y = 0; y < BACK_HEIGHT; y += cell) {
    for (let x = 0; x < BACK_WIDTH; x += cell) dot(c, x, y, 1.1)
  }
  const random = rng('transit')
  const lines = [
    { colour: '#e4002b', axis: 0, shift: -10 },
    { colour: '#0098d4', axis: 2, shift: -10 },
    { colour: '#00a651', axis: 1, shift: 0 },
    { colour: '#ffd100', axis: 3, shift: 0 },
    { colour: '#9b2d8e', axis: 0, shift: 10 },
    { colour: '#f58220', axis: 2, shift: 10 },
  ]
  const headings = [
    [1, 0],
    [1, 1],
    [0, 1],
    [-1, 1],
    [-1, 0],
    [-1, -1],
    [0, -1],
    [1, -1],
  ] as const
  const stations: { x: number; y: number }[] = []
  c.lineJoin = 'round'
  c.lineCap = 'round'
  for (const line of lines) {
    const [ax, ay] = headings[line.axis]!
    const nx = -ay
    const ny = ax
    const originX = CX + nx * line.shift
    const originY = CY + ny * line.shift
    c.strokeStyle = line.colour
    c.lineWidth = 9
    c.beginPath()
    for (const sign of [1, -1]) {
      let heading = (line.axis + (sign === 1 ? 0 : 4)) % 8
      let x = originX
      let y = originY
      c.moveTo(x, y)
      for (let segment = 0; segment < 7; segment++) {
        const length = (2 + Math.floor(random() * 4)) * cell
        const [hx, hy] = headings[heading]!
        x += hx * length
        y += hy * length
        c.lineTo(x, y)
        stations.push({ x: x - hx * length * 0.5, y: y - hy * length * 0.5 })
        if (segment > 0 && segment % 2 === 1) stations.push({ x, y })
        heading = (heading + (random() < 0.5 ? 1 : 7)) % 8
        if (x < -80 || y < -80 || x > BACK_WIDTH + 80 || y > BACK_HEIGHT + 80) break
      }
      c.moveTo(originX, originY)
    }
    c.stroke()
  }
  for (const station of stations) {
    c.fillStyle = '#ffffff'
    c.strokeStyle = '#15171c'
    c.lineWidth = 2.5
    c.beginPath()
    c.arc(station.x, station.y, 5.2, 0, TAU)
    c.fill()
    c.stroke()
  }
  c.fillStyle = '#ffffff'
  c.strokeStyle = '#15171c'
  c.lineWidth = 5
  c.beginPath()
  c.arc(CX, CY, 30, 0, TAU)
  c.fill()
  c.stroke()
  c.fillStyle = '#15171c'
  c.font = '800 26px system-ui, sans-serif'
  c.textAlign = 'center'
  c.textBaseline = 'middle'
  c.fillText('CB', CX, CY + 1)
}

/* 7. Monte Carlo: pi estimated by throwing random points, with the real estimate printed. */
function monteCarlo(c: Ctx): void {
  fill(c, radial(c, '#251a12', '#100b08', 360))
  const size = 296
  const left = CX - size / 2
  const top = CY - size / 2 - 48
  const random = rng('monte-carlo')
  const total = 1700
  let inside = 0
  const points: { x: number; y: number; hit: boolean }[] = []
  for (let i = 0; i < total; i++) {
    const x = random()
    const y = random()
    const hit = x * x + y * y < 1
    if (hit) inside++
    points.push({ x, y, hit })
  }
  for (const hit of [false, true]) {
    c.fillStyle = hit ? 'rgba(244, 188, 70, 0.95)' : 'rgba(76, 184, 172, 0.8)'
    for (const point of points) {
      if (point.hit === hit) dot(c, left + point.x * size, top + (1 - point.y) * size, 2.1)
    }
  }
  c.strokeStyle = 'rgba(255, 240, 210, 0.45)'
  c.lineWidth = 1.5
  c.strokeRect(left, top, size, size)
  c.strokeStyle = '#fff2d2'
  c.lineWidth = 2.5
  c.beginPath()
  c.arc(left, top + size, size, -Math.PI / 2, 0)
  c.stroke()

  c.fillStyle = '#fff2d2'
  c.textAlign = 'center'
  c.textBaseline = 'alphabetic'
  c.font = 'italic 700 46px Georgia, serif'
  c.fillText(`π ≈ ${((4 * inside) / total).toFixed(3)}`, CX, top + size + 56)
  c.fillStyle = 'rgba(255, 242, 210, 0.55)'
  c.font = '15px ui-monospace, Consolas, monospace'
  c.fillText(`4 × ${inside} ÷ ${total}`, CX, top + size + 80)

  for (const [x, y, angle, pips] of [
    [CX - 38, 48, -0.14, 3],
    [CX + 38, 48, 0.12, 4],
  ] as const) {
    c.save()
    c.translate(x, y)
    c.rotate(angle)
    c.fillStyle = '#fff2d2'
    c.beginPath()
    c.roundRect(-20, -20, 40, 40, 8)
    c.fill()
    c.fillStyle = '#251a12'
    const layouts: Record<number, number[][]> = {
      3: [
        [-9, -9],
        [0, 0],
        [9, 9],
      ],
      4: [
        [-9, -9],
        [9, -9],
        [-9, 9],
        [9, 9],
      ],
    }
    for (const [px, py] of layouts[pips]!) dot(c, px!, py!, 3.4)
    c.restore()
  }
}

/* 8. Attention: three heads of a transformer, drawn as string art between two columns of tokens. */
function attention(c: Ctx): void {
  fill(c, radial(c, '#22123a', '#07040f', 340))
  const tokens = 16
  const top = 58
  const gap = (BACK_HEIGHT - top * 2) / (tokens - 1)
  const leftX = 78
  const rightX = BACK_WIDTH - 78
  const random = rng('attention')
  const heads = [
    { colour: '#ff4fa3', score: (i: number, j: number) => -Math.abs(i - j) * 0.9 },
    { colour: '#36d7ff', score: (i: number, j: number) => (j === i - 4 || j === i + 4 ? 3 : -1) },
    { colour: '#ffc14d', score: (_: number, j: number) => (j === 3 || j === 11 ? 3.2 : -1.5) },
  ]
  c.globalCompositeOperation = 'lighter'
  for (const head of heads) {
    c.strokeStyle = head.colour
    for (let i = 0; i < tokens; i++) {
      const raw = Array.from({ length: tokens }, (_, j) =>
        Math.exp(head.score(i, j) + random() * 0.6),
      )
      const sum = raw.reduce((a, b) => a + b, 0)
      raw.forEach((value, j) => {
        const weight = value / sum
        if (weight < 0.07) return
        c.globalAlpha = Math.min(0.95, 0.18 + weight * 1.1)
        c.lineWidth = 0.6 + weight * 5
        c.beginPath()
        c.moveTo(leftX + 16, top + i * gap)
        c.bezierCurveTo(CX - 20, top + i * gap, CX + 20, top + j * gap, rightX - 16, top + j * gap)
        c.stroke()
      })
    }
  }
  c.globalCompositeOperation = 'source-over'
  c.globalAlpha = 1
  for (const x of [leftX, rightX]) {
    for (let i = 0; i < tokens; i++) {
      c.fillStyle = 'rgba(255,255,255,0.14)'
      c.strokeStyle = 'rgba(255,255,255,0.5)'
      c.lineWidth = 1.5
      c.beginPath()
      c.roundRect(x - 18, top + i * gap - 7, 36, 14, 4)
      c.fill()
      c.stroke()
    }
  }
  c.fillStyle = '#12081f'
  c.strokeStyle = '#fff'
  c.lineWidth = 3
  dot(c, CX, CY, 44)
  c.stroke()
  c.fillStyle = '#fff'
  c.font = '700 40px Georgia, serif'
  c.textAlign = 'center'
  c.textBaseline = 'middle'
  c.fillText('CB', CX, CY + 2)
}

/* 9. Forge: a honeycomb word grid with FORGE spelled out along a lit path. */
function forge(c: Ctx): void {
  fill(c, '#160e08')
  const random = rng('forge')
  const radius = 36
  const width = Math.sqrt(3) * radius
  const stepY = radius * 1.5
  const columns = Math.ceil(BACK_WIDTH / width) + 1
  const rows = Math.ceil(BACK_HEIGHT / stepY) + 1
  const centerOf = (col: number, row: number) => ({
    x: col * width + (row % 2 === 0 ? 0 : width / 2) + 2,
    y: row * stepY + 8,
  })
  const hexPath = (x: number, y: number, r: number): void => {
    c.beginPath()
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * TAU - Math.PI / 6
      const px = x + Math.cos(angle) * r
      const py = y + Math.sin(angle) * r
      if (i === 0) c.moveTo(px, py)
      else c.lineTo(px, py)
    }
    c.closePath()
  }
  const alphabet = 'ABCDEGHILMNOPRSTUW'
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const { x, y } = centerOf(col, row)
      const warmth = random()
      c.fillStyle = `rgb(${52 + warmth * 52}, ${30 + warmth * 26}, ${16 + warmth * 8})`
      hexPath(x, y, radius - 1.5)
      c.fill()
      c.strokeStyle = '#0d0703'
      c.lineWidth = 2.5
      c.stroke()
      c.fillStyle = 'rgba(255, 220, 170, 0.16)'
      c.font = '700 24px Georgia, serif'
      c.textAlign = 'center'
      c.textBaseline = 'middle'
      c.fillText(alphabet[Math.floor(random() * alphabet.length)]!, x, y + 1)
    }
  }
  const neighbour = (col: number, row: number, dir: 'E' | 'SE' | 'SW' | 'NE') => {
    const odd = row % 2 === 1
    if (dir === 'E') return { col: col + 1, row }
    if (dir === 'SE') return { col: odd ? col + 1 : col, row: row + 1 }
    if (dir === 'SW') return { col: odd ? col : col - 1, row: row + 1 }
    return { col: odd ? col + 1 : col, row: row - 1 }
  }
  const word = 'FORGE'
  const route = ['SE', 'E', 'SW', 'SE'] as const
  const path = [{ col: 3, row: 4 }]
  for (const dir of route) {
    const last = path[path.length - 1]!
    path.push(neighbour(last.col, last.row, dir))
  }
  const points = path.map((cell) => centerOf(cell.col, cell.row))
  c.save()
  c.shadowColor = '#ffb347'
  c.shadowBlur = 22
  c.strokeStyle = '#ffb347'
  c.lineWidth = 9
  c.lineJoin = 'round'
  c.beginPath()
  points.forEach((p, i) => (i === 0 ? c.moveTo(p.x, p.y) : c.lineTo(p.x, p.y)))
  c.stroke()
  c.restore()
  points.forEach((p, i) => {
    c.save()
    c.shadowColor = '#ffb347'
    c.shadowBlur = 14
    c.fillStyle = '#fff1d0'
    hexPath(p.x, p.y, radius - 4)
    c.fill()
    c.restore()
    c.strokeStyle = '#ffb347'
    c.lineWidth = 3
    hexPath(p.x, p.y, radius - 4)
    c.stroke()
    c.fillStyle = '#2a1608'
    c.font = '700 36px Georgia, serif'
    c.textAlign = 'center'
    c.textBaseline = 'middle'
    c.fillText(word[i]!, p.x, p.y + 2)
  })
}

export const BACKS: readonly CardBack[] = [
  { id: 'arcana', name: 'Arcana', paint: arcana },
  { id: 'prism', name: 'Prism', paint: prism },
  { id: 'life', name: 'Life', paint: life },
  { id: 'orrery', name: 'Orrery', paint: orrery },
  { id: 'enso', name: 'Ensō', paint: enso },
  { id: 'transit', name: 'Hub line', paint: transit },
  { id: 'monte-carlo', name: 'Monte Carlo', paint: monteCarlo },
  { id: 'attention', name: 'Attention', paint: attention },
  { id: 'forge', name: 'Forge', paint: forge },
]

/** A back design chosen by `random` (0..1), never `avoid` when there is another to pick. */
export function pickBack(random: number, avoid?: string): CardBack {
  const pool = BACKS.length > 1 ? BACKS.filter((back) => back.id !== avoid) : BACKS
  const index = Math.min(pool.length - 1, Math.floor(Math.max(0, random) * pool.length))
  return pool[index]!
}

/** The maker's full name on a small plate along the bottom edge of every back. */
function namePlate(c: Ctx): void {
  const letters = [...PROFILE.name.toUpperCase()]
  c.font = '700 14px system-ui, sans-serif'
  const spacing = 3.2
  const widths = letters.map((letter) => c.measureText(letter).width + spacing)
  const textWidth = widths.reduce((a, b) => a + b, 0) - spacing
  const plateWidth = textWidth + 40
  const plateHeight = 30
  const x = CX - plateWidth / 2
  const y = BACK_HEIGHT - INSET - 16 - plateHeight
  c.beginPath()
  c.roundRect(x, y, plateWidth, plateHeight, plateHeight / 2)
  c.fillStyle = 'rgba(8, 8, 12, 0.78)'
  c.fill()
  c.strokeStyle = 'rgba(255, 255, 255, 0.45)'
  c.lineWidth = 1.5
  c.stroke()
  c.fillStyle = '#fff'
  c.textAlign = 'left'
  c.textBaseline = 'middle'
  let cursor = x + 20
  letters.forEach((letter, index) => {
    c.fillText(letter, cursor, y + plateHeight / 2 + 1)
    cursor += widths[index]!
  })
}

/** Paints a card back: paper edge, then the design inside a rounded inset frame. */
export function drawCardBack(canvas: HTMLCanvasElement, back: CardBack): void {
  const context = canvas.getContext('2d')
  if (!context) return
  context.clearRect(0, 0, BACK_WIDTH, BACK_HEIGHT)
  context.beginPath()
  context.roundRect(0, 0, BACK_WIDTH, BACK_HEIGHT, 28)
  context.fillStyle = PAPER
  context.fill()
  context.save()
  context.beginPath()
  context.roundRect(INSET, INSET, BACK_WIDTH - INSET * 2, BACK_HEIGHT - INSET * 2, 16)
  context.clip()
  back.paint(context)
  namePlate(context)
  context.restore()
  context.beginPath()
  context.roundRect(INSET, INSET, BACK_WIDTH - INSET * 2, BACK_HEIGHT - INSET * 2, 16)
  context.strokeStyle = 'rgba(0, 0, 0, 0.35)'
  context.lineWidth = 3
  context.stroke()
}
