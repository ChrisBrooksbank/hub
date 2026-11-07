// Adds/updates a "Part of the hub" line in the README of every public repo listed in the hub.
// Dry run by default; pass --apply to commit to each repo's default branch.
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const HUB_URL = 'https://chrisbrooksbank-hub.netlify.app'
const OWNER = 'ChrisBrooksbank'
const START = '<!-- hub-link -->'
const END = '<!-- /hub-link -->'
const BLOCK = `${START}\n> Part of [Chris's app hub](${HUB_URL}) - a directory of all my deployed apps.\n${END}`

export function withHubLink(readme: string): string {
  const re = new RegExp(`${START}[\\s\\S]*?${END}`)
  if (re.test(readme)) return readme.replace(re, BLOCK)
  const lines = readme.split('\n')
  const h1 = lines.findIndex((l) => /^# /.test(l))
  if (h1 === -1) return `${BLOCK}\n\n${readme}`
  lines.splice(h1 + 1, 0, '', BLOCK)
  return lines.join('\n')
}

function gh(args: string[], input?: string): string {
  return execFileSync('gh', args, { encoding: 'utf8', input, maxBuffer: 20 * 1024 * 1024 })
}

interface Site {
  repo: string
  isPrivateRepo?: boolean
}
interface Meta {
  isFork: boolean
  isArchived: boolean
  isPrivate: boolean
}
interface ReadmeFile {
  path: string
  sha: string
  content: string
}

const apply = process.argv.includes('--apply')
const generated = JSON.parse(readFileSync(join(ROOT, 'data', 'sites.generated.json'), 'utf8'))
const sites: Site[] = Array.isArray(generated) ? generated : generated.sites
const overrides: Record<string, { hidden?: boolean }> = JSON.parse(
  readFileSync(join(ROOT, 'data', 'sites.overrides.json'), 'utf8'),
)

for (const site of sites) {
  const { repo } = site
  if (repo === 'hub') continue
  if (overrides[repo]?.hidden) {
    console.log(`skip  ${repo}: hidden`)
    continue
  }
  try {
    const meta: Meta = JSON.parse(
      gh(['repo', 'view', `${OWNER}/${repo}`, '--json', 'isFork,isArchived,isPrivate']),
    )
    if (meta.isPrivate || meta.isFork || meta.isArchived) {
      console.log(`skip  ${repo}: private/fork/archived`)
      continue
    }
    const f: ReadmeFile = JSON.parse(gh(['api', `repos/${OWNER}/${repo}/readme`]))
    const old = Buffer.from(f.content, 'base64').toString('utf8')
    const next = withHubLink(old)
    if (next === old) {
      console.log(`ok    ${repo}: already up to date`)
      continue
    }
    if (!apply) {
      console.log(`would ${repo}: update ${f.path}`)
      continue
    }
    const body = JSON.stringify({
      message: 'docs: link to the app hub in README',
      content: Buffer.from(next, 'utf8').toString('base64'),
      sha: f.sha,
    })
    gh(['api', '-X', 'PUT', `repos/${OWNER}/${repo}/contents/${f.path}`, '--input', '-'], body)
    console.log(`done  ${repo}: updated ${f.path}`)
  } catch (e) {
    console.log(`fail  ${repo}: ${(e as Error).message.split('\n')[0]}`)
  }
}
