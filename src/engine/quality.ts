export interface QualitySettings {
  /** Upper bound for the renderer pixel ratio. */
  pixelRatio: number
  /** Whether optional post-processing may run. */
  postFx: boolean
  /** Multiplier applied to a theme's particle count (0 disables particles). */
  particleScale: number
}

export type QualityTier = 'high' | 'low'

export const QUALITY: Record<QualityTier, QualitySettings> = {
  high: { pixelRatio: 2, postFx: true, particleScale: 1 },
  low: { pixelRatio: 1, postFx: false, particleScale: 0.25 },
}

export interface DeviceInfo {
  userAgent?: string
  hardwareConcurrency?: number
  deviceMemory?: number
  maxTouchPoints?: number
}

const LOW_CORE_COUNT = 4
const LOW_MEMORY_GB = 4
const MOBILE_UA = /android|iphone|ipad|ipod|mobile/i

/** True for devices likely to struggle with full effects: mobile, few cores or little memory. */
export function isLowPowerDevice(device: DeviceInfo): boolean {
  if (device.userAgent && MOBILE_UA.test(device.userAgent)) return true
  if (device.hardwareConcurrency !== undefined && device.hardwareConcurrency <= LOW_CORE_COUNT) {
    return true
  }
  if (device.deviceMemory !== undefined && device.deviceMemory <= LOW_MEMORY_GB) return true
  return false
}

export function initialTier(device: DeviceInfo): QualityTier {
  return isLowPowerDevice(device) ? 'low' : 'high'
}

export function readDevice(nav: Navigator = navigator): DeviceInfo {
  const memory = (nav as Navigator & { deviceMemory?: number }).deviceMemory
  return {
    userAgent: nav.userAgent,
    hardwareConcurrency: nav.hardwareConcurrency,
    ...(memory === undefined ? {} : { deviceMemory: memory }),
    maxTouchPoints: nav.maxTouchPoints,
  }
}

export interface FrameMonitorOptions {
  /** Frames sampled before judging. */
  sampleFrames?: number
  /** Average frame time (seconds) above which the device counts as slow. */
  slowFrameSeconds?: number
  /** Initial frames ignored while shaders compile and textures upload. */
  warmupFrames?: number
}

/**
 * Watches the first frames after warm-up and reports once whether they were too slow.
 * Feed it per-frame deltas; `onSlow` fires at most once.
 */
export class FrameMonitor {
  private readonly sampleFrames: number
  private readonly slowFrameSeconds: number
  private warmup: number
  private total = 0
  private count = 0
  private done = false

  constructor(
    private readonly onSlow: () => void,
    options: FrameMonitorOptions = {},
  ) {
    this.sampleFrames = options.sampleFrames ?? 60
    this.slowFrameSeconds = options.slowFrameSeconds ?? 1 / 30
    this.warmup = options.warmupFrames ?? 10
  }

  get finished(): boolean {
    return this.done
  }

  update(deltaSeconds: number): void {
    if (this.done || deltaSeconds <= 0) return
    if (this.warmup > 0) {
      this.warmup -= 1
      return
    }
    this.total += deltaSeconds
    this.count += 1
    if (this.count < this.sampleFrames) return
    this.done = true
    if (this.total / this.count > this.slowFrameSeconds) this.onSlow()
  }
}
