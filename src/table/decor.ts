import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  CircleGeometry,
  Color,
  CylinderGeometry,
  DirectionalLight,
  ExtrudeGeometry,
  Group,
  HemisphereLight,
  Material,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  Points,
  PointsMaterial,
  Quaternion,
  RepeatWrapping,
  RingGeometry,
  Shape,
  SRGBColorSpace,
  Path,
  Texture,
  Vector3,
  type Object3D,
  type Raycaster,
  type Scene,
} from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { hashString, seededRandom } from '../engine/procedural-art'
import { CARD_HEIGHT, CARD_WIDTH, TABLE_MARGIN, type TableArea } from './layout'

const RAIL = 1.6
const WOOD = 1.0
const MOTES = 70
const TAU = Math.PI * 2
const GOLD = '#e0bb68'

export interface DecorOptions {
  /** What the glossy props (chips, dice, rail) reflect. */
  environment?: Texture

  /** One themed stack of chips per category, in order. */
  categories: readonly { name: string; count: number }[]
  /** A chip stack was clicked. */
  onChip: (category: string) => void
  /** The dice finished rolling with these faces up. */
  onRoll: (faces: readonly number[]) => void
}

export interface Decor {
  /** Rebuilds the felt, rail and props for a new table area. */
  rebuild(area: TableArea): void
  /** Whether the pointer is over a die or a chip stack; sets the tooltip text if so. */
  hover(raycaster: Raycaster): string | null
  /** Clicks whatever die or chip stack the ray hits (rolls the dice, flips a chip). */
  press(raycaster: Raycaster): boolean
  /** Whether a die or chip is mid-animation. */
  animating(): boolean
  /** Rings the stack of the category the table is filtered to. */
  setActive(category: string | null): void
  /** Drifts the dust in the lamp light. */
  update(deltaSeconds: number): void
  /** Lamp brightness for a card at (x, z): 1 under the light, dimmer toward the rail. */
  lamp(x: number, z: number): number
  dispose(): void
}

function canvasOf(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width))
  canvas.height = Math.max(1, Math.round(height))
  return canvas
}

function textureOf(canvas: HTMLCanvasElement, repeat = false): CanvasTexture {
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 8
  if (repeat) texture.wrapS = texture.wrapT = RepeatWrapping
  return texture
}

function noisePattern(context: CanvasRenderingContext2D): CanvasPattern | null {
  const tile = canvasOf(128, 128)
  const tileContext = tile.getContext('2d')
  if (!tileContext) return null
  const image = tileContext.createImageData(128, 128)
  const random = seededRandom(hashString('felt-noise'))
  for (let i = 0; i < image.data.length; i += 4) {
    const value = 90 + random() * 120
    image.data[i] = image.data[i + 1] = image.data[i + 2] = value
    image.data[i + 3] = 255
  }
  tileContext.putImageData(image, 0, 0)
  return context.createPattern(tile, 'repeat')
}

function drawFelt(area: TableArea): CanvasTexture {
  const scale = 2048 / Math.max(area.width, area.depth)
  const width = area.width * scale
  const height = area.depth * scale
  const canvas = canvasOf(width, height)
  const c = canvas.getContext('2d')
  if (!c) return textureOf(canvas)
  const u = (units: number): number => units * scale
  const toX = (x: number): number => (x - area.centerX + area.width / 2) * scale
  const toY = (z: number): number => (z - area.centerZ + area.depth / 2) * scale

  const base = c.createRadialGradient(
    width / 2,
    height * 0.46,
    0,
    width / 2,
    height * 0.46,
    Math.hypot(width, height) * 0.56,
  )
  base.addColorStop(0, '#2f7656')
  base.addColorStop(0.55, '#1e5841')
  base.addColorStop(1, '#0c2e21')
  c.fillStyle = base
  c.fillRect(0, 0, width, height)

  const pattern = noisePattern(c)
  if (pattern) {
    c.globalCompositeOperation = 'overlay'
    c.globalAlpha = 0.45
    c.fillStyle = pattern
    c.fillRect(0, 0, width, height)
    c.globalCompositeOperation = 'source-over'
    c.globalAlpha = 1
  }

  c.strokeStyle = 'rgba(255, 255, 255, 0.04)'
  c.lineWidth = Math.max(1, u(0.05))
  const step = u(2.2)
  for (let offset = -height; offset < width + height; offset += step) {
    c.beginPath()
    c.moveTo(offset, 0)
    c.lineTo(offset + height, height)
    c.moveTo(offset + height, 0)
    c.lineTo(offset, height)
    c.stroke()
  }

  c.globalCompositeOperation = 'screen'
  const lamp = c.createRadialGradient(
    width / 2,
    height * 0.42,
    0,
    width / 2,
    height * 0.42,
    Math.max(width, height) * 0.62,
  )
  lamp.addColorStop(0, 'rgba(255, 224, 160, 0.26)')
  lamp.addColorStop(1, 'rgba(255, 224, 160, 0)')
  c.fillStyle = lamp
  c.fillRect(0, 0, width, height)
  c.globalCompositeOperation = 'source-over'
  const vignette = c.createRadialGradient(
    width / 2,
    height / 2,
    Math.min(width, height) * 0.3,
    width / 2,
    height / 2,
    Math.hypot(width, height) * 0.55,
  )
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)')
  vignette.addColorStop(1, 'rgba(0, 0, 0, 0.55)')
  c.fillStyle = vignette
  c.fillRect(0, 0, width, height)

  for (const [inset, alpha, line] of [
    [0.8, 0.85, 0.09],
    [1.15, 0.45, 0.04],
  ] as const) {
    c.strokeStyle = GOLD
    c.globalAlpha = alpha
    c.lineWidth = Math.max(1.5, u(line))
    c.beginPath()
    c.roundRect(u(inset), u(inset), width - u(inset) * 2, height - u(inset) * 2, u(1.4))
    c.stroke()
  }
  c.globalAlpha = 1

  c.save()
  c.strokeStyle = GOLD
  c.globalAlpha = 0.07
  c.lineWidth = u(0.12)
  for (const radius of [5.2, 5.6, 7.4]) {
    c.beginPath()
    c.arc(width / 2, height / 2, u(radius), 0, TAU)
    c.stroke()
  }
  c.restore()

  const deckX = toX(area.deckX)
  const deckY = toY(area.deckZ)
  c.save()
  c.setLineDash([u(0.3), u(0.22)])
  c.strokeStyle = GOLD
  c.globalAlpha = 0.55
  c.lineWidth = Math.max(2, u(0.07))
  c.fillStyle = 'rgba(0, 0, 0, 0.14)'
  c.beginPath()
  c.roundRect(
    deckX - u(CARD_WIDTH / 2),
    deckY - u(CARD_HEIGHT / 2),
    u(CARD_WIDTH),
    u(CARD_HEIGHT),
    u(0.25),
  )
  c.fill()
  c.stroke()
  c.restore()

  const band =
    'THE HUB    ♠    CHRIS BROOKSBANK    ♥    IDEAS AND STEERING    ♦    TYPING BY ROBOTS    ♣'
  const available = width - u(2 * 4.6)
  let fontSize = u(0.62)
  c.font = `700 ${fontSize}px Georgia, serif`
  const spacing = (size: number): string => `${size * 0.22}px`
  const measured = (size: number): number => {
    c.font = `700 ${size}px Georgia, serif`
    if ('letterSpacing' in c)
      (c as unknown as { letterSpacing: string }).letterSpacing = spacing(size)
    return c.measureText(band).width
  }
  const natural = measured(fontSize)
  if (natural > available) fontSize *= available / natural
  if (fontSize >= u(0.3)) {
    measured(fontSize)
    c.fillStyle = GOLD
    c.globalAlpha = 0.62
    c.textAlign = 'center'
    c.textBaseline = 'middle'
    c.fillText(band, width / 2, height - u(1.95))
    c.save()
    c.translate(width / 2, u(1.95))
    c.rotate(Math.PI)
    c.fillText(band, 0, 0)
    c.restore()
  }
  if ('letterSpacing' in c) (c as unknown as { letterSpacing: string }).letterSpacing = '0px'

  c.globalAlpha = 0.5
  c.textAlign = 'center'
  c.textBaseline = 'middle'
  c.font = `700 ${u(2.1)}px Georgia, serif`
  for (const [glyph, x, y, colour] of [
    ['♠', u(2.05), u(2.05), GOLD],
    ['♥', width - u(2.05), u(2.05), '#d9625a'],
    ['♣', u(2.05), height - u(2.05), GOLD],
    ['♦', width - u(2.05), height - u(2.05), '#d9625a'],
  ] as const) {
    c.fillStyle = colour
    c.fillText(glyph, x, y)
  }
  c.globalAlpha = 1
  return textureOf(canvas)
}

function woodTexture(): CanvasTexture {
  const canvas = canvasOf(512, 512)
  const c = canvas.getContext('2d')
  if (c) {
    const random = seededRandom(hashString('wood'))
    c.fillStyle = '#5a3419'
    c.fillRect(0, 0, 512, 512)
    for (let i = 0; i < 150; i++) {
      const y = random() * 512
      c.strokeStyle = random() < 0.5 ? 'rgba(30, 14, 4, 0.35)' : 'rgba(150, 95, 50, 0.3)'
      c.lineWidth = 0.6 + random() * 2
      c.beginPath()
      c.moveTo(0, y)
      for (let x = 0; x <= 512; x += 32)
        c.lineTo(x, y + Math.sin(x * 0.02 + i) * (2 + random() * 3))
      c.stroke()
    }
  }
  const texture = textureOf(canvas, true)
  texture.repeat.set(1 / 7, 1 / 7)
  return texture
}

function softDisc(): CanvasTexture {
  const canvas = canvasOf(128, 128)
  const c = canvas.getContext('2d')
  if (c) {
    const gradient = c.createRadialGradient(64, 64, 0, 64, 64, 64)
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)')
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
    c.fillStyle = gradient
    c.fillRect(0, 0, 128, 128)
  }
  return textureOf(canvas)
}

function roundedRectPath(path: Shape | Path, width: number, height: number, radius: number): void {
  const x = -width / 2
  const y = -height / 2
  const r = Math.min(radius, width / 2, height / 2)
  path.moveTo(x + r, y)
  path.lineTo(x + width - r, y)
  path.absarc(x + width - r, y + r, r, -Math.PI / 2, 0, false)
  path.lineTo(x + width, y + height - r)
  path.absarc(x + width - r, y + height - r, r, 0, Math.PI / 2, false)
  path.lineTo(x + r, y + height)
  path.absarc(x + r, y + height - r, r, Math.PI / 2, Math.PI, false)
  path.lineTo(x, y + r)
  path.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false)
}

function ringGeometry(
  outerWidth: number,
  outerDepth: number,
  innerWidth: number,
  innerDepth: number,
  radius: number,
  options: { depth: number; bevel: number; thickness: number },
): ExtrudeGeometry {
  const shape = new Shape()
  roundedRectPath(shape, outerWidth, outerDepth, radius + RAIL)
  const hole = new Path()
  roundedRectPath(hole, innerWidth, innerDepth, radius)
  shape.holes.push(hole)
  const geometry = new ExtrudeGeometry(shape, {
    depth: options.depth,
    bevelEnabled: true,
    bevelThickness: options.thickness,
    bevelSize: options.bevel,
    bevelOffset: -options.bevel,
    bevelSegments: 8,
    curveSegments: 24,
  })
  geometry.rotateX(-Math.PI / 2)
  return geometry
}

interface ChipTheme {
  colour: string
  glyph: string
}

/** The chip a category gets; anything unlisted falls back to a plain grey chip. */
const CHIP_THEMES: Record<string, ChipTheme> = {
  Games: { colour: '#b3202a', glyph: '♠' },
  Learning: { colour: '#1f4fb5', glyph: '♦' },
  Wellbeing: { colour: '#1f8f4e', glyph: '♥' },
  'Local (Chelmsford)': { colour: '#7a3fa0', glyph: '⌂' },
  Tools: { colour: '#1d1b19', glyph: '⚙' },
  '3D & Visual': { colour: '#c9761a', glyph: '3D' },
  Parliament: { colour: '#12315c', glyph: '♛' },
}
const PLAIN_CHIP: ChipTheme = { colour: '#4a4a48', glyph: '•' }

function chipTextures(theme: ChipTheme): { side: CanvasTexture; face: CanvasTexture } {
  const { colour, glyph } = theme
  const sideCanvas = canvasOf(256, 32)
  const side = sideCanvas.getContext('2d')
  if (side) {
    side.fillStyle = colour
    side.fillRect(0, 0, 256, 32)
    side.fillStyle = '#f4efe2'
    for (let i = 0; i < 8; i++) side.fillRect(i * 32 + 6, 0, 20, 32)
  }
  const faceCanvas = canvasOf(256, 256)
  const face = faceCanvas.getContext('2d')
  if (face) {
    face.fillStyle = colour
    face.fillRect(0, 0, 256, 256)
    face.strokeStyle = '#f4efe2'
    face.lineWidth = 16
    face.setLineDash([32, 22])
    face.beginPath()
    face.arc(128, 128, 108, 0, TAU)
    face.stroke()
    face.setLineDash([])
    face.lineWidth = 5
    face.beginPath()
    face.arc(128, 128, 82, 0, TAU)
    face.stroke()
    face.fillStyle = 'rgba(244, 239, 226, 0.14)'
    face.beginPath()
    face.arc(128, 128, 78, 0, TAU)
    face.fill()
    face.fillStyle = '#f4efe2'
    face.textAlign = 'center'
    face.textBaseline = 'middle'
    face.font = `700 ${glyph.length > 1 ? 66 : 92}px Georgia, 'Segoe UI Symbol', serif`
    face.fillText(glyph, 128, 134)
  }
  return { side: textureOf(sideCanvas, true), face: textureOf(faceCanvas) }
}

function grainTexture(seed: string, size = 128, from = 70, to = 190): CanvasTexture {
  const canvas = canvasOf(size, size)
  const c = canvas.getContext('2d')
  if (c) {
    const image = c.createImageData(size, size)
    const random = seededRandom(hashString(seed))
    for (let i = 0; i < image.data.length; i += 4) {
      image.data[i] = image.data[i + 1] = image.data[i + 2] = from + random() * (to - from)
      image.data[i + 3] = 255
    }
    c.putImageData(image, 0, 0)
  }
  return textureOf(canvas, true)
}

function pipTexture(pips: number): CanvasTexture {
  const canvas = canvasOf(128, 128)
  const c = canvas.getContext('2d')
  if (c) {
    c.fillStyle = '#f3ead6'
    c.fillRect(0, 0, 128, 128)
    const layouts: Record<number, number[][]> = {
      1: [[64, 64]],
      2: [
        [34, 34],
        [94, 94],
      ],
      3: [
        [34, 34],
        [64, 64],
        [94, 94],
      ],
      4: [
        [34, 34],
        [94, 34],
        [34, 94],
        [94, 94],
      ],
      5: [
        [34, 34],
        [94, 34],
        [64, 64],
        [34, 94],
        [94, 94],
      ],
      6: [
        [34, 30],
        [94, 30],
        [34, 64],
        [94, 64],
        [34, 98],
        [94, 98],
      ],
    }
    c.fillStyle = pips === 1 ? '#b3202a' : '#1b1612'
    for (const [x, y] of layouts[pips]!) {
      c.beginPath()
      c.arc(x!, y!, pips === 1 ? 17 : 11, 0, TAU)
      c.fill()
    }
  }
  return textureOf(canvas)
}

function disposeTree(root: Object3D, keep?: Texture): void {
  root.traverse((object) => {
    if (!(object instanceof Mesh) && !(object instanceof Points)) return
    object.geometry.dispose()
    const materials: Material | Material[] = object.material
    for (const material of Array.isArray(materials) ? materials : [materials]) {
      for (const value of Object.values(material)) {
        if (value instanceof Texture && value !== keep) value.dispose()
      }
      material.dispose()
    }
  })
}

const DIE_SIZE = 0.95
/** Local face normals of the die, in the order of its materials: 3, 4, 1, 6, 2, 5. */
const DIE_FACES: readonly (readonly [number, Vector3])[] = [
  [3, new Vector3(1, 0, 0)],
  [4, new Vector3(-1, 0, 0)],
  [1, new Vector3(0, 1, 0)],
  [6, new Vector3(0, -1, 0)],
  [2, new Vector3(0, 0, 1)],
  [5, new Vector3(0, 0, -1)],
]
const UP = new Vector3(0, 1, 0)
const ROLL_SECONDS = 1.25
const HOP_SECONDS = 0.8
/** Spots for the chip stacks: a cluster in the near-right corner, another far-left. */
const STACK_SPOTS: readonly (readonly [corner: 0 | 1, dx: number, dz: number])[] = [
  [0, 0, 0],
  [0, -1.4, 0.8],
  [0, 0.2, -1.3],
  [0, -1.6, -0.9],
  [1, 0, 0],
  [1, 1.2, -0.5],
  [1, 0.4, 1.2],
]

interface Die {
  mesh: Mesh
  homeX: number
  homeZ: number
  rolling: boolean
  clock: number
  duration: number
  value: number
  fromX: number
  fromZ: number
  toX: number
  toZ: number
  from: Quaternion
  to: Quaternion
  axis: Vector3
  turns: number
}

interface Stack {
  category: string
  chips: Mesh[]
  topY: number
  hop: number
  ring: Mesh
}

const easeOut = (t: number): number => 1 - (1 - t) ** 3

/** The table dressing: felt, padded rail, wood trim, chips, dice, lamp light and drifting dust. */
export function createDecor(scene: Scene, reducedMotion: boolean, options: DecorOptions): Decor {
  scene.background = new Color('#0b0806')
  const root = new Group()
  scene.add(root)
  let current: TableArea = { centerX: 0, centerZ: 0, width: 30, depth: 20, deckX: 0, deckZ: 0 }
  let motes: Points | undefined
  let seeds: Float32Array = new Float32Array(0)
  let dice: Die[] = []
  let stacks: Stack[] = []
  let active: string | null = null
  let pickables: Mesh[] = []
  const dieRandom = seededRandom(hashString('dice'))

  const blob = (parent: Group, x: number, z: number, radius: number, opacity: number): void => {
    const material = new MeshBasicMaterial({
      map: softDisc(),
      color: 0x000000,
      transparent: true,
      opacity,
      depthWrite: false,
    })
    const mesh = new Mesh(new CircleGeometry(radius, 24), material)
    mesh.rotation.x = -Math.PI / 2
    mesh.position.set(x, 0.01, z)
    mesh.renderOrder = -1
    parent.add(mesh)
  }

  const chipStack = (
    parent: Group,
    x: number,
    z: number,
    category: { name: string; count: number },
  ): void => {
    const theme = CHIP_THEMES[category.name] ?? PLAIN_CHIP
    const { side, face } = chipTextures(theme)
    const geometry = new CylinderGeometry(0.6, 0.6, 0.14, 48)
    const plastic = (map: CanvasTexture): MeshPhysicalMaterial =>
      new MeshPhysicalMaterial({
        map,
        envMap: options.environment,
        envMapIntensity: 0.5,
        roughness: 0.4,
        clearcoat: 0.6,
        clearcoatRoughness: 0.3,
      })
    const materials = [plastic(side), plastic(face), plastic(face)]
    const random = seededRandom(hashString(category.name))
    const count = Math.min(10, Math.max(3, Math.ceil(category.count / 2)))
    const ring = new Mesh(
      new RingGeometry(0.8, 0.95, 48),
      new MeshBasicMaterial({
        color: 0xffd34d,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    )
    ring.rotation.x = -Math.PI / 2
    ring.position.set(x, 0.02, z)
    ring.visible = active === category.name
    parent.add(ring)
    const stack: Stack = { category: category.name, chips: [], topY: 0, hop: -1, ring }
    for (let i = 0; i < count; i++) {
      const chip = new Mesh(geometry, materials)
      chip.position.set(x + (random() - 0.5) * 0.06, 0.07 + i * 0.145, z + (random() - 0.5) * 0.06)
      // The top chip faces the camera the right way up; the rest are scattered.
      chip.rotation.y = i === count - 1 ? Math.PI / 2 : random() * TAU
      chip.castShadow = true
      chip.receiveShadow = true
      chip.userData.stack = stack
      parent.add(chip)
      stack.chips.push(chip)
      pickables.push(chip)
    }
    stack.topY = 0.07 + (count - 1) * 0.145
    stacks.push(stack)
    blob(parent, x + 0.2, z + 0.25, 1.1, 0.35)
  }

  const die = (parent: Group, x: number, z: number, yaw: number): void => {
    const materials = [3, 4, 1, 6, 2, 5].map(
      (pips) =>
        new MeshPhysicalMaterial({
          map: pipTexture(pips),
          envMap: options.environment,
          envMapIntensity: 0.5,
          roughness: 0.28,
          clearcoat: 1,
          clearcoatRoughness: 0.12,
        }),
    )
    const mesh = new Mesh(new RoundedBoxGeometry(DIE_SIZE, DIE_SIZE, DIE_SIZE, 4, 0.1), materials)
    mesh.position.set(x, DIE_SIZE / 2, z)
    mesh.rotation.y = yaw
    mesh.castShadow = true
    mesh.receiveShadow = true
    const record: Die = {
      mesh,
      homeX: x,
      homeZ: z,
      rolling: false,
      clock: 0,
      duration: ROLL_SECONDS,
      value: 1,
      fromX: x,
      fromZ: z,
      toX: x,
      toZ: z,
      from: new Quaternion(),
      to: new Quaternion(),
      axis: new Vector3(0, 1, 0),
      turns: 2,
    }
    mesh.userData.die = record
    dice.push(record)
    pickables.push(mesh)
    parent.add(mesh)
    blob(parent, x + 0.15, z + 0.2, 1.1, 0.35)
  }

  const roll = (): void => {
    if (dice.some((d) => d.rolling)) return
    for (const d of dice) {
      d.value = 1 + Math.floor(dieRandom() * 6)
      const normal = DIE_FACES.find(([value]) => value === d.value)![1]
      d.from.copy(d.mesh.quaternion)
      d.to
        .setFromUnitVectors(normal, UP)
        .premultiply(new Quaternion().setFromAxisAngle(UP, dieRandom() * TAU))
      d.fromX = d.mesh.position.x
      d.fromZ = d.mesh.position.z
      d.toX = d.homeX + (dieRandom() - 0.5) * 0.7
      d.toZ = d.homeZ + (dieRandom() - 0.5) * 0.7
      d.axis.set(dieRandom() - 0.5, dieRandom() - 0.5, dieRandom() - 0.5).normalize()
      d.turns = 2 + Math.floor(dieRandom() * 2)
      d.duration = ROLL_SECONDS + dieRandom() * 0.35
      d.clock = 0
      d.rolling = !reducedMotion
      if (reducedMotion) {
        d.mesh.quaternion.copy(d.to)
        d.mesh.position.set(d.toX, DIE_SIZE / 2, d.toZ)
      }
    }
    if (reducedMotion) options.onRoll(dice.map((d) => d.value))
  }

  const spin = new Quaternion()
  const stepDice = (deltaSeconds: number): void => {
    let finished = false
    for (const d of dice) {
      if (!d.rolling) continue
      d.clock += deltaSeconds
      const p = Math.min(1, d.clock / d.duration)
      const e = easeOut(p)
      d.mesh.position.set(
        d.fromX + (d.toX - d.fromX) * e,
        DIE_SIZE / 2 + 2.4 * (1 - p) ** 1.5 * Math.abs(Math.sin(p * Math.PI * 3)),
        d.fromZ + (d.toZ - d.fromZ) * e,
      )
      d.mesh.quaternion.slerpQuaternions(d.from, d.to, e)
      spin.setFromAxisAngle(d.axis, (1 - e) * d.turns * TAU)
      d.mesh.quaternion.premultiply(spin)
      if (p >= 1) {
        d.rolling = false
        finished = true
      }
    }
    if (finished && dice.every((d) => !d.rolling)) options.onRoll(dice.map((d) => d.value))
  }

  const stepStacks = (deltaSeconds: number): void => {
    for (const stack of stacks) {
      if (stack.hop < 0) continue
      stack.hop += deltaSeconds / HOP_SECONDS
      const top = stack.chips[stack.chips.length - 1]
      if (!top) continue
      const p = Math.min(1, stack.hop)
      top.position.y = stack.topY + Math.sin(p * Math.PI) * 2.2
      top.rotation.x = easeOut(p) * TAU
      if (p >= 1) {
        stack.hop = -1
        top.position.y = stack.topY
        top.rotation.x = 0
      }
    }
  }

  const hit = (raycaster: Raycaster): { die?: Die; stack?: Stack } | null => {
    const first = raycaster.intersectObjects(pickables, false)[0]
    if (!first) return null
    const data = first.object.userData as { die?: Die; stack?: Stack }
    return data.die || data.stack ? data : null
  }

  const build = (area: TableArea): void => {
    disposeTree(root, options.environment)
    root.clear()
    dice = []
    stacks = []
    pickables = []
    const group = new Group()
    root.add(group)
    const { centerX, centerZ, width, depth } = area
    const minX = centerX - width / 2
    const maxX = centerX + width / 2
    const minZ = centerZ - depth / 2
    const maxZ = centerZ + depth / 2

    const weave = grainTexture('felt-weave', 256, 60, 200)
    weave.repeat.set(width / 1.6, depth / 1.6)
    const felt = new Mesh(
      new PlaneGeometry(width, depth),
      new MeshStandardMaterial({
        map: drawFelt(area),
        bumpMap: weave,
        bumpScale: 0.9,
        roughness: 1,
        metalness: 0,
      }),
    )
    felt.rotation.x = -Math.PI / 2
    felt.position.set(centerX, -0.02, centerZ)
    felt.receiveShadow = true
    group.add(felt)

    const hide = grainTexture('leather', 128, 90, 200)
    hide.repeat.set(width / 1.2, 1)
    const leather = new Mesh(
      ringGeometry(width + RAIL * 2, depth + RAIL * 2, width, depth, 2.6, {
        depth: 0.3,
        bevel: 0.6,
        thickness: 0.55,
      }),
      new MeshStandardMaterial({
        color: 0x6a1a2a,
        envMap: options.environment,
        envMapIntensity: 0.5,
        roughness: 0.4,
        bumpMap: hide,
        bumpScale: 0.35,
      }),
    )
    leather.position.set(centerX, 0.25, centerZ)
    leather.castShadow = true
    leather.receiveShadow = true
    group.add(leather)

    const wood = new Mesh(
      ringGeometry(
        width + (RAIL + WOOD) * 2,
        depth + (RAIL + WOOD) * 2,
        width + RAIL * 2 - 0.3,
        depth + RAIL * 2 - 0.3,
        3.2,
        { depth: 0.2, bevel: 0.3, thickness: 0.3 },
      ),
      new MeshStandardMaterial({
        map: woodTexture(),
        envMap: options.environment,
        envMapIntensity: 0.5,
        roughness: 0.4,
      }),
    )
    wood.position.set(centerX, 0.05, centerZ)
    wood.receiveShadow = true
    group.add(wood)

    const shadow = new Mesh(
      new PlaneGeometry(width + 18, depth + 18),
      new MeshBasicMaterial({
        map: softDisc(),
        color: 0x000000,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      }),
    )
    shadow.rotation.x = -Math.PI / 2
    shadow.position.set(centerX, -1.4, centerZ)
    group.add(shadow)

    const inset = TABLE_MARGIN - 0.8
    const corners = [
      [maxX - inset + 0.9, maxZ - inset + 0.4],
      [minX + inset - 0.6, minZ + inset - 0.8],
    ] as const
    options.categories.forEach((category, index) => {
      const [corner, dx, dz] = STACK_SPOTS[index % STACK_SPOTS.length]!
      const [cx, cz] = corners[corner]
      chipStack(group, cx + dx, cz + dz, category)
    })
    die(group, minX + inset - 0.5, maxZ - inset + 0.9, 0.5)
    die(group, minX + inset + 0.9, maxZ - inset + 0.3, 1.0)

    group.add(new HemisphereLight(0xfff6ea, 0x3a2418, 0.55))
    const key = new DirectionalLight(0xffecd0, 1.5)
    key.position.set(centerX - 8, 22, centerZ + 12)
    key.target.position.set(centerX, 0, centerZ)
    const reach = Math.hypot(width, depth) / 2 + 4
    key.castShadow = true
    const small = typeof matchMedia === 'function' && matchMedia('(max-width: 700px)').matches
    key.shadow.mapSize.set(small ? 1024 : 2048, small ? 1024 : 2048)
    Object.assign(key.shadow.camera, {
      left: -reach,
      right: reach,
      top: reach,
      bottom: -reach,
      near: 1,
      far: 70,
    })
    key.shadow.bias = -0.0004
    key.shadow.normalBias = 0.03
    key.shadow.radius = 3
    group.add(key, key.target)

    const positions = new Float32Array(MOTES * 3)
    seeds = new Float32Array(MOTES * 3)
    const random = seededRandom(hashString('motes'))
    for (let i = 0; i < MOTES; i++) {
      positions[i * 3] = centerX + (random() - 0.5) * width * 0.9
      positions[i * 3 + 1] = 0.6 + random() * 9
      positions[i * 3 + 2] = centerZ + (random() - 0.5) * depth * 0.9
      seeds[i * 3] = random() * TAU
      seeds[i * 3 + 1] = 0.12 + random() * 0.2
      seeds[i * 3 + 2] = 0.1 + random() * 0.25
    }
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new BufferAttribute(positions, 3))
    motes = new Points(
      geometry,
      new PointsMaterial({
        map: softDisc(),
        color: 0xffe2a8,
        size: 0.22,
        transparent: true,
        opacity: 0.6,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    )
    group.add(motes)
    current = area
  }

  let elapsed = 0
  return {
    rebuild: build,
    hover(raycaster) {
      const found = hit(raycaster)
      if (found?.die) return 'Roll the dice'
      if (found?.stack) return `${found.stack.category} chips: filter the cards`
      return null
    },
    press(raycaster) {
      const found = hit(raycaster)
      if (found?.die) {
        roll()
        return true
      }
      if (found?.stack) {
        if (!reducedMotion) found.stack.hop = 0
        options.onChip(found.stack.category)
        return true
      }
      return false
    },
    animating() {
      return dice.some((d) => d.rolling) || stacks.some((stack) => stack.hop >= 0)
    },
    setActive(category) {
      active = category
      for (const stack of stacks) stack.ring.visible = stack.category === category
    },
    update(deltaSeconds) {
      stepDice(deltaSeconds)
      stepStacks(deltaSeconds)
      if (reducedMotion || !motes) return
      elapsed += deltaSeconds
      const position = motes.geometry.getAttribute('position')
      for (let i = 0; i < MOTES; i++) {
        const phase = seeds[i * 3]!
        const rise = seeds[i * 3 + 1]!
        const sway = seeds[i * 3 + 2]!
        let y = position.getY(i) + rise * deltaSeconds
        if (y > 9.8) y = 0.5
        position.setXYZ(
          i,
          position.getX(i) + Math.sin(elapsed * 0.3 + phase) * sway * deltaSeconds,
          y,
          position.getZ(i) + Math.cos(elapsed * 0.25 + phase) * sway * deltaSeconds,
        )
      }
      position.needsUpdate = true
    },
    lamp(x, z) {
      const nx = (x - current.centerX) / (current.width / 2)
      const nz = (z - (current.centerZ - current.depth * 0.04)) / (current.depth / 2)
      const t = Math.min(1, Math.max(0, (Math.hypot(nx, nz) - 0.2) / 0.9))
      return 1 - 0.3 * t * t * (3 - 2 * t)
    },
    dispose() {
      disposeTree(root, options.environment)
      root.removeFromParent()
    },
  }
}
