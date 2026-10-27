import { mergeSites, type SiteRecord } from './merge.ts'
import { ManifestSchema, type Site } from './schema.ts'

/** Validate raw manifest JSON, throwing an Error with one readable line per problem. */
export function parseManifest(raw: unknown, source = 'manifest'): Site[] {
  const result = ManifestSchema.safeParse(raw)
  if (result.success) return result.data
  const lines = result.error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join('.') : '(root)'
    return `  - ${path}: ${issue.message}`
  })
  throw new Error(`Invalid ${source}:\n${lines.join('\n')}`)
}

/** Merge overrides over generated data, validate, and split into publishable and hidden sites. */
export function resolveManifest(
  generated: readonly SiteRecord[],
  overrides: readonly SiteRecord[],
): { visible: Site[]; hidden: Site[] } {
  const sites = parseManifest(mergeSites(generated, overrides), 'merged manifest')
  return {
    visible: sites.filter((site) => !site.hidden),
    hidden: sites.filter((site) => site.hidden),
  }
}
