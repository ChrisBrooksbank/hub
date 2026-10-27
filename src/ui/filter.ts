import type { Site } from '../data/schema'

export interface FilterState {
  /** Selected category, or null for all. */
  category: string | null
  query: string
}

export const INITIAL_FILTER: FilterState = { category: null, query: '' }

/** Sites matching the category and the search query (name, tags, description; case-insensitive, all terms must match). */
export function filterSites(sites: readonly Site[], filter: FilterState): Site[] {
  const terms = filter.query.toLowerCase().split(/\s+/).filter(Boolean)
  return sites.filter((site) => {
    if (filter.category !== null && site.category !== filter.category) return false
    if (terms.length === 0) return true
    const haystack = [site.name, site.description, ...site.tags].join(' ').toLowerCase()
    return terms.every((term) => haystack.includes(term))
  })
}

/** Distinct categories in first-seen order. */
export function categoriesOf(sites: readonly Site[]): string[] {
  return [...new Set(sites.map((site) => site.category))]
}

/** Text for the live region, e.g. "12 sites shown". */
export function resultsMessage(count: number): string {
  return `${count} ${count === 1 ? 'site' : 'sites'} shown`
}
