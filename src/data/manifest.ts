import { ManifestSchema, type Site } from './schema'

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
