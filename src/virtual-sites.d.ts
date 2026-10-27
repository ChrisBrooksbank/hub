declare module 'virtual:sites' {
  import type { Site } from './data/schema'
  /** Merged manifest with `hidden` entries already removed at build time. */
  export const sites: Site[]
}
