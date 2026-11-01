const GIF_PATTERN = /(?:\]\(|src=["']|\()\s*<?([^\s)"'>]+\.gif)(?:[?#][^\s)"'>]*)?/gi
/** Names that suggest the GIF is the one to show off, best first. */
const PREFERRED = ['hero', 'demo', 'walkthrough', 'tour']

/**
 * The repo-relative path of an absolute GitHub URL that points into the given repo
 * (`raw.githubusercontent.com/<owner>/<repo>/<branch>/<path>`, or a github.com `raw`/`blob` link).
 * Anything else, including other repos, gives undefined.
 */
export function repoPathFromUrl(url: string, owner: string, repo: string): string | undefined {
  const own = `${owner}/${repo}`.toLowerCase()
  const raw = /^https:\/\/raw\.githubusercontent\.com\/([^/]+\/[^/]+)\/[^/]+\/(.+)$/i.exec(url)
  const web = /^https:\/\/github\.com\/([^/]+\/[^/]+)\/(?:raw|blob)\/[^/]+\/(.+)$/i.exec(url)
  const match = raw ?? web
  if (!match || match[1]?.toLowerCase() !== own) return undefined
  return match[2]
}

/**
 * The repo-relative path of the GIF to turn into a card's clip, from a README's Markdown or HTML.
 * Relative paths are used as they are. An absolute URL only counts when it points into this same
 * repo (pass `repo` so it can be recognised); other absolute URLs are ignored. A "hero"/"demo"
 * style name wins, else the first GIF listed.
 */
export function pickGif(
  readme: string,
  repo?: { owner: string; name: string },
): string | undefined {
  const found: string[] = []
  for (const match of readme.matchAll(GIF_PATTERN)) {
    const target = match[1]
    const path = /^[a-z]+:\/\//i.test(target ?? '')
      ? repo && target
        ? repoPathFromUrl(target, repo.owner, repo.name)
        : undefined
      : target?.replace(/^\.\//, '')
    if (path && !found.includes(path)) found.push(path)
  }
  for (const word of PREFERRED) {
    const hit = found.find((path) => path.toLowerCase().includes(word))
    if (hit) return hit
  }
  return found[0]
}
