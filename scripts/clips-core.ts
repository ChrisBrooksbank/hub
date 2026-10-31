const GIF_PATTERN = /(?:\]\(|src=["']|\()\s*<?([^\s)"'>]+\.gif)(?:[?#][^\s)"'>]*)?/gi
/** Names that suggest the GIF is the one to show off, best first. */
const PREFERRED = ['hero', 'demo', 'walkthrough', 'tour']

/**
 * The repo-relative path of the GIF to turn into a card's clip, from a README's Markdown or HTML.
 * Absolute URLs are ignored (they are not in the repo); a "hero"/"demo" style name wins, else
 * the first GIF listed.
 */
export function pickGif(readme: string): string | undefined {
  const found: string[] = []
  for (const match of readme.matchAll(GIF_PATTERN)) {
    const path = match[1]?.replace(/^\.\//, '')
    if (path && !/^[a-z]+:\/\//i.test(path) && !found.includes(path)) found.push(path)
  }
  for (const word of PREFERRED) {
    const hit = found.find((path) => path.toLowerCase().includes(word))
    if (hit) return hit
  }
  return found[0]
}
