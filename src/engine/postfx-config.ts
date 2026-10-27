import type { Theme } from '../themes/types'

export type PostFxConfig = Theme['postFx']

/** True when the config asks for at least one effect. */
export function hasPostFx(config: PostFxConfig): boolean {
  return Boolean(config.bloom || config.scanlines || config.vignette || config.grain)
}

/** True when a config needs the combined scanline/vignette/grain pass. */
export function needsFinishPass(config: PostFxConfig): boolean {
  return Boolean(config.scanlines || config.vignette || config.grain)
}

/** Names of the passes a config produces, in render order. */
export function passNames(config: PostFxConfig): string[] {
  const names = ['render']
  if (config.bloom) names.push('bloom')
  if (needsFinishPass(config)) names.push('finish')
  names.push('output')
  return names
}
