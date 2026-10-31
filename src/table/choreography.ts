/** Hand-made card motion: dealing off the top of the pack, and a real riffle shuffle. */

export interface Pose {
  x: number
  y: number
  z: number
  yaw: number
  /** 0 face up, π face down. */
  flip: number
  scale: number
  /** Bend about the card's long axis, radians; the inner corners of a riffle lift with it. */
  roll: number
}

/** One leg of a card's journey. A card holds at `from` until `start`. */
export interface Segment {
  start: number
  dur: number
  from: Pose
  to: Pose
  /** Extra height at mid-flight. */
  arc: number
  /** Extra yaw swung out mid-flight, back to nothing at take-off and landing. */
  spin: number
  ease: 'inOut' | 'out'
}

export const DECK_STEP = 0.036
const PILE_GAP = 2.95
const PILE_ROLL = 0.13
const DROP_STAGGER = 0.024
const DROP_SECONDS = 0.27
const SPLIT_SECONDS = 0.5
const GATHER_SECONDS = 0.55
const RIFFLES = 2

const easeInOut = (t: number): number => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)
const easeOut = (t: number): number => 1 - (1 - t) ** 3

export const clonePose = (pose: Pose): Pose => ({ ...pose })

export function distance(a: Pose, b: Pose): number {
  return Math.hypot(a.x - b.x, a.z - b.z) + Math.abs(a.y - b.y) + Math.abs(a.flip - b.flip)
}

/** Where the card `level` cards up from the bottom of a stack of any height sits. */
export function stackPoseAt(level: number, x: number, z: number): Pose {
  const jitter = ((level * 7919) % 13) / 13 - 0.5
  return {
    x: x + jitter * 0.12,
    y: level * DECK_STEP,
    z: z - jitter * 0.1,
    yaw: jitter * 0.12,
    flip: Math.PI,
    scale: 1,
    roll: 0,
  }
}

/**
 * Writes the pose of `segment` at time `clock` into `out`. True once the segment is over, after
 * which `out` is exactly `segment.to`.
 */
export function sampleSegment(segment: Segment, clock: number, out: Pose): boolean {
  const { from, to } = segment
  if (clock >= segment.start + segment.dur) {
    Object.assign(out, to)
    return true
  }
  const p = Math.min(1, Math.max(0, (clock - segment.start) / segment.dur))
  const e = segment.ease === 'out' ? easeOut(p) : easeInOut(p)
  out.x = from.x + (to.x - from.x) * e
  out.z = from.z + (to.z - from.z) * e
  out.y = from.y + (to.y - from.y) * e + segment.arc * Math.sin(Math.PI * e)
  out.yaw = from.yaw + (to.yaw - from.yaw) * e + segment.spin * Math.sin(Math.PI * e)
  // A card turns over early, in the first stretch of its flight, and travels on already face up.
  const turn = easeInOut(Math.min(1, Math.max(0, (p - 0.04) / 0.5)))
  out.flip = from.flip + (to.flip - from.flip) * turn
  out.scale = from.scale + (to.scale - from.scale) * e
  out.roll = from.roll + (to.roll - from.roll) * e
  return p >= 1
}

/** A card flying from `from` to `to`: lifted off, arcing, turning a little on the way. */
export function flight(from: Pose, to: Pose, start: number, index: number): Segment {
  const reach = Math.hypot(from.x - to.x, from.z - to.z)
  const wobble = (((index * 2654435761) >>> 0) % 1000) / 1000 - 0.5
  return {
    start,
    // Flicked off the pack: quick away, skimming low, easing onto the felt.
    dur: 0.42 + Math.min(0.3, reach * 0.016),
    from: clonePose(from),
    to: clonePose(to),
    arc: 0.35 + Math.min(0.5, reach * 0.02),
    spin: wobble * 0.5,
    ease: 'out',
  }
}

export interface ShufflePlan {
  scripts: Map<string, Segment[]>
  /** The deck after the shuffle, bottom to top. */
  stack: string[]
  /** Scene time at which every card has come to rest. */
  end: number
}

interface ShuffleInput {
  /** The deck as it is now, bottom to top. */
  stack: readonly string[]
  /** Where every card is right now. */
  current: ReadonlyMap<string, Pose>
  deck: { x: number; z: number }
  /** Where the riffle happens: clear table in the middle. */
  center: { x: number; z: number }
  start: number
  random: () => number
}

/**
 * Plans a shuffle: the cards gather into the deck, the deck slides to the middle, is riffled
 * twice (cut, halves pushed apart, cards dropped alternately from the top of each half), then
 * carried home. The order the cards land in is the new order of the deck.
 */
export function planShuffle(input: ShuffleInput): ShufflePlan {
  const { current, deck, center, random } = input
  const scripts = new Map<string, Segment[]>()
  const push = (id: string, segment: Segment): void => {
    const list = scripts.get(id)
    if (list) list.push(segment)
    else scripts.set(id, [segment])
  }
  const move = (
    id: string,
    from: Pose,
    to: Pose,
    start: number,
    dur: number,
    options: Partial<Pick<Segment, 'arc' | 'spin' | 'ease'>> = {},
  ): void =>
    push(id, {
      start,
      dur,
      from: clonePose(from),
      to: clonePose(to),
      arc: options.arc ?? 0,
      spin: options.spin ?? 0,
      ease: options.ease ?? 'inOut',
    })

  let stack = [...input.stack]
  const total = stack.length
  let t = input.start

  // 1. Every card flies onto the deck, bottom first; 2. the deck slides to the middle.
  stack.forEach((id, level) => {
    const start = t + level * 0.012
    const home = stackPoseAt(level, deck.x, deck.z)
    const from = current.get(id) ?? home
    move(id, from, home, start, GATHER_SECONDS, { arc: 0.8, spin: (random() - 0.5) * 0.6 })
    move(
      id,
      home,
      stackPoseAt(level, center.x, center.z),
      t + total * 0.012 + GATHER_SECONDS + 0.1,
      0.55,
      {
        arc: 0.5,
      },
    )
  })
  t += total * 0.012 + GATHER_SECONDS + 0.1 + 0.55 + 0.1

  // 3. Riffles.
  for (let round = 0; round < RIFFLES; round++) {
    const cut = Math.round(total / 2 + (random() - 0.5) * 4)
    const lower = stack.slice(0, cut)
    const upper = stack.slice(cut)
    const pile = (half: 'lower' | 'upper', index: number): Pose => {
      const side = half === 'lower' ? 1 : -1
      return {
        x: center.x + side * PILE_GAP,
        y: index * DECK_STEP,
        z: center.z,
        yaw: -side * 0.05,
        flip: Math.PI,
        scale: 1,
        roll: -side * PILE_ROLL,
      }
    }
    const levels = new Map<string, Pose>()
    stack.forEach((id, level) => levels.set(id, stackPoseAt(level, center.x, center.z)))
    const piles = new Map<string, Pose>()
    lower.forEach((id, i) => piles.set(id, pile('lower', i)))
    upper.forEach((id, i) => piles.set(id, pile('upper', i)))
    for (const id of stack) {
      move(id, levels.get(id)!, piles.get(id)!, t, SPLIT_SECONDS, { arc: 0.6 })
    }

    // Drop alternately from the top of each half, in runs of one to three.
    let nextLower = lower.length - 1
    let nextUpper = upper.length - 1
    let fromLower = random() < 0.5
    let run = 0
    const merged: string[] = []
    const dropStart = t + SPLIT_SECONDS + 0.12
    while (nextLower >= 0 || nextUpper >= 0) {
      if (run === 0) {
        run = 1 + (random() < 0.28 ? 1 : 0) + (random() < 0.08 ? 1 : 0)
        fromLower = !fromLower
      }
      let useLower = fromLower
      if (useLower && nextLower < 0) useLower = false
      if (!useLower && nextUpper < 0) useLower = true
      const id = useLower ? lower[nextLower--]! : upper[nextUpper--]!
      run--
      const level = merged.length
      merged.push(id)
      move(
        id,
        piles.get(id)!,
        stackPoseAt(level, center.x, center.z),
        dropStart + level * DROP_STAGGER,
        DROP_SECONDS,
        { arc: 0.9, spin: (random() - 0.5) * 0.12, ease: 'out' },
      )
    }
    stack = merged
    t = dropStart + total * DROP_STAGGER + DROP_SECONDS + 0.12
  }

  // 4. The shuffled deck is carried home and squared up.
  stack.forEach((id, level) => {
    move(
      id,
      stackPoseAt(level, center.x, center.z),
      stackPoseAt(level, deck.x, deck.z),
      t + level * 0.006,
      0.6,
      { arc: 0.9 },
    )
  })
  return { scripts, stack, end: t + total * 0.006 + 0.6 }
}
