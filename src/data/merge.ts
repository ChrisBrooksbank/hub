import { SiteSchema } from './schema.ts'

export type SiteRecord = Record<string, unknown> & { id: string }

const KEY_ORDER: readonly string[] = Object.keys(SiteSchema.shape)

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Deep-merge `override` over `base`. Plain objects recurse; arrays and scalars are replaced; `undefined` is skipped. */
function deepMerge(base: Record<string, unknown>, override: Record<string, unknown>) {
  const out: Record<string, unknown> = { ...base }
  for (const [key, value] of Object.entries(override)) {
    if (value === undefined) continue
    const existing = out[key]
    out[key] = isPlainObject(existing) && isPlainObject(value) ? deepMerge(existing, value) : value
  }
  return out
}

/** Known schema keys first in schema order, then any extras alphabetically. */
function orderKeys(record: Record<string, unknown>): Record<string, unknown> {
  const known = KEY_ORDER.filter((key) => key in record)
  const extra = Object.keys(record)
    .filter((key) => !KEY_ORDER.includes(key))
    .sort()
  return Object.fromEntries([...known, ...extra].map((key) => [key, record[key]]))
}

/**
 * Merge hand-edited overrides over generated sites, matched by `id`. Overrides win field by field,
 * and an override with an unknown id is added as a new (e.g. repo-less) site. Output is sorted by id
 * with stable key order so regenerated files diff cleanly. Inputs are not mutated and the result is
 * not validated; pass it through `parseManifest`.
 */
export function mergeSites(
  generated: readonly SiteRecord[],
  overrides: readonly SiteRecord[],
): SiteRecord[] {
  const byId = new Map<string, Record<string, unknown>>()
  for (const site of generated) byId.set(site.id, site)
  for (const override of overrides) {
    const base = byId.get(override.id)
    byId.set(override.id, base ? deepMerge(base, override) : deepMerge({}, override))
  }
  return [...byId.keys()]
    .sort()
    .map((id) => orderKeys(byId.get(id) as Record<string, unknown>) as SiteRecord)
}
