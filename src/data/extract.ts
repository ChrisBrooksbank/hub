export const CATEGORIES = [
  'Games',
  'Learning',
  'Wellbeing',
  'Local (Chelmsford)',
  'Tools',
  '3D & Visual',
  'Parliament',
] as const

export type Category = (typeof CATEGORIES)[number]

const HOST_SUFFIXES = ['netlify.app', 'azurewebsites.net', 'pages.dev', 'github.io', 'vercel.app']
const URL_PATTERN = new RegExp(
  String.raw`https?://[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.(?:${HOST_SUFFIXES.map((s) => s.replace(/\./g, String.raw`\.`)).join('|')})(?![a-z0-9-]|\.[a-z0-9])(?:/[^\s)"'<>\]]*)?`,
  'gi',
)

/** Hosts that are platform infrastructure, not sites (e.g. app.netlify.app, api docs). */
const IGNORED_HOSTS = new Set(['app.netlify.app', 'docs.github.io', 'pages.github.io'])

function normalise(raw: string): string | undefined {
  try {
    const url = new URL(raw.replace(/[.,;:]+$/, ''))
    const host = url.hostname.toLowerCase()
    if (IGNORED_HOSTS.has(host)) return undefined
    const path = url.pathname.replace(/\/+$/, '')
    return `https://${host}${path}`
  } catch {
    return undefined
  }
}

/** Extract deployed-site URLs from free text (README, CLAUDE.md, netlify.toml). Deduped, in first-seen order. */
export function extractUrls(text: string): string[] {
  const seen = new Set<string>()
  for (const match of text.matchAll(URL_PATTERN)) {
    const url = normalise(match[0])
    if (url) seen.add(url)
  }
  return [...seen]
}

/** Read the site id from the contents of `.netlify/state.json`; undefined if absent or malformed. */
export function netlifySiteId(stateJson: string): string | undefined {
  try {
    const parsed: unknown = JSON.parse(stateJson)
    if (typeof parsed === 'object' && parsed !== null && 'siteId' in parsed) {
      const id = (parsed as { siteId: unknown }).siteId
      return typeof id === 'string' && id.length > 0 ? id : undefined
    }
  } catch {
    // fall through
  }
  return undefined
}

const RULES: readonly (readonly [Category, RegExp])[] = [
  ['Parliament', /\b(parliament|hansard|mps?|westminster|commons|lords)\b/i],
  ['Local (Chelmsford)', /\b(chelmsford|essex|london|ldn|tfl|pub|pubs)\b|\bcm\d+/i],
  [
    'Wellbeing',
    /(hypnosis|mindful\w*|meditat\w*|breath\w*|wellbeing|wellness|shadow|inward|calm|sleep|therapy|self-?help|journal)/i,
  ],
  [
    'Games',
    /\b(game|games|puzzle|rummy|golf|wordle|word|cards?|maze|mazes|arcade|quiz|trivia|poker|chess|tarot|hang|race|racing|play)\b/i,
  ],
  [
    '3D & Visual',
    /\b(3d|three\.?js|webgl|shader|kaleidoscope|visuali[sz]\w*|globe|earth|fractal|prism|particles?|canvas|life|simulation|sim)\b/i,
  ],
  [
    'Learning',
    /\b(learn\w*|teach\w*|tutorial|explained|course|lesson|education\w*|css|training|study|flashcards?|monte\s?carlo)\b/i,
  ],
]

/** Heuristic category from the repo name, description and tags. Falls back to "Tools". */
export function guessCategory(input: {
  name: string
  description?: string
  tags?: readonly string[]
}): Category {
  const haystack = [input.name, input.description ?? '', ...(input.tags ?? [])].join(' ')
  for (const [category, pattern] of RULES) {
    if (pattern.test(haystack)) return category
  }
  return 'Tools'
}
