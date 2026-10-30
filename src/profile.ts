/** The maker of the sites: shown on the Joker cards, the card backs and the list footer. */
export const PROFILE = {
  name: 'Chris Brooksbank',
  githubLogin: 'ChrisBrooksbank',
  github: 'https://github.com/ChrisBrooksbank',
  /** Set to the full LinkedIn profile URL to show it everywhere the GitHub link appears. */
  linkedin: 'https://www.linkedin.com/in/chrisbrooksbank',
  /** Optional portrait (put the file in `public/`); the Jokers show it when it loads. */
  photo: '/chris.webp',
  tagline:
    'Chris Brooksbank: ideas man and professional steerer of robots. I had the ideas and said “no, not like that” a lot. Claude (mostly) and OpenAI (occasionally) did the actual building.',
  /** What the cards on the table are, and how to read them. */
  scope:
    'The bright cards are my currently deployed sites. Projects with no live demo yet wait in the deck: tap “No live demo” to deal them out, faded.',
  /** Short credit line used under the title and in site details. */
  credit: 'Ideas and steering: Chris Brooksbank. Actual typing: Claude, and occasionally OpenAI.',
  /** Tongue-in-cheek line under the title. */
  byline: 'Ideas and steering by me. Typing by Claude (mostly) and OpenAI (sometimes).',
} as const

export interface ProfileLink {
  label: string
  href: string
}

/** The profile's outbound links, skipping any that are not configured. */
export function profileLinks(
  profile: { github: string; linkedin: string } = PROFILE,
): ProfileLink[] {
  const links: ProfileLink[] = [{ label: 'GitHub', href: profile.github }]
  if (profile.linkedin) links.push({ label: 'LinkedIn', href: profile.linkedin })
  return links
}
