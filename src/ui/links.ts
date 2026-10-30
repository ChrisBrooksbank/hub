import { PROFILE } from '../profile'

/**
 * GitHub URL for a manifest `repo` value: a full URL as is, `owner/name` on github.com,
 * and a bare repo name under the profile owner.
 */
export function repoUrl(repo: string, owner: string = PROFILE.githubLogin): string {
  if (/^https?:\/\//.test(repo)) return repo
  return `https://github.com/${repo.includes('/') ? repo : `${owner}/${repo}`}`
}
