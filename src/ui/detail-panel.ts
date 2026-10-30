import type { Site } from '../data/schema'
import { PROFILE, type ProfileLink } from '../profile'
import type { Favourites } from './favourites'
import { repoUrl } from './links'

const FOCUSABLE =
  'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'

export interface DetailPanel {
  readonly element: HTMLElement
  /** Shows the site; remembers the focused element so close() can restore it. */
  open(site: Site): void
  /** Shows an About panel (the Joker cards): a name, a line of text and outbound links. */
  openAbout(about: AboutContent): void
  /** Hides the panel and restores focus; does not call `onClose`. */
  close(): void
  readonly isOpen: boolean
  dispose(): void
}

export interface AboutContent {
  name: string
  text: string
  links: readonly ProfileLink[]
  /** Optional portrait shown above the text. */
  photo?: string
}

export interface DetailPanelOptions {
  /** When given, the panel shows a favourite toggle for the open site. */
  favourites?: Favourites

  /** Called after the user closes the panel via its button or Escape (not via close()). */
  onClose?: () => void
}

/** Formats an ISO timestamp as e.g. "27 Oct 2026"; falls back to "Unknown". */
export function formatLastUpdated(iso: string | null): string {
  if (!iso) return 'Unknown'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'Unknown'
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function text<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  content: string,
  className?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  node.textContent = content
  if (className) node.className = className
  return node
}

/**
 * Modal DOM detail panel for the selected site. Traps Tab focus while open and restores
 * focus to the previously focused element on close.
 */
export function createDetailPanel(
  parent: HTMLElement,
  options: DetailPanelOptions = {},
): DetailPanel {
  const element = document.createElement('aside')
  element.className = 'detail-panel'
  element.setAttribute('role', 'dialog')
  element.setAttribute('aria-modal', 'true')
  element.hidden = true

  let opener: HTMLElement | null = null
  let open = false

  const finish = (): void => {
    if (!open) return
    open = false
    element.hidden = true
    element.replaceChildren()
    element.removeAttribute('aria-labelledby')
    const target = opener
    opener = null
    if (target && target.isConnected) target.focus()
  }

  const requestClose = (): void => {
    finish()
    options.onClose?.()
  }

  const onKeydown = (event: KeyboardEvent): void => {
    if (!open) return
    if (event.key === 'Escape') {
      event.preventDefault()
      requestClose()
      return
    }
    if (event.key !== 'Tab') return
    const items = [...element.querySelectorAll<HTMLElement>(FOCUSABLE)]
    const first = items[0]
    const last = items[items.length - 1]
    if (!first || !last) {
      event.preventDefault()
      return
    }
    const active = document.activeElement
    const outside = !element.contains(active)
    if (event.shiftKey && (active === first || outside)) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && (active === last || outside)) {
      event.preventDefault()
      first.focus()
    }
  }
  document.addEventListener('keydown', onKeydown)

  parent.append(element)

  return {
    element,
    get isOpen() {
      return open
    },
    open(site) {
      if (!open) {
        const active = document.activeElement
        opener = active instanceof HTMLElement && active !== document.body ? active : null
      }
      open = true

      const heading = text('h2', site.name)
      heading.id = 'detail-title'
      element.setAttribute('aria-labelledby', heading.id)

      const launch = site.url ? text('a', `Launch ${site.name}`, 'launch') : undefined
      if (launch && site.url) {
        launch.href = site.url
        launch.target = '_blank'
        launch.rel = 'noopener'
      }

      const close = text('button', 'Close')
      close.type = 'button'
      close.addEventListener('click', requestClose)

      const facts = document.createElement('dl')
      const fact = (label: string, value: string): void => {
        facts.append(text('dt', label), text('dd', value))
      }
      fact('Category', site.category)
      fact('Language', site.language ?? 'Unknown')
      fact('Last updated', formatLastUpdated(site.lastPushed))
      if (site.tags.length > 0) fact('Tags', site.tags.join(', '))

      const children: Node[] = [heading]
      if (site.thumb) {
        const img = document.createElement('img')
        img.src = site.thumb
        img.alt = `Screenshot of ${site.name}`
        children.push(img)
      }
      if (site.description) children.push(text('p', site.description))
      children.push(text('p', PROFILE.credit, 'credit'))
      if (site.status === 'dead') children.push(text('p', 'May be offline', 'offline'))
      children.push(facts)
      if (launch) children.push(launch)
      else children.push(text('p', 'No live demo yet. The code is on GitHub.', 'offline'))
      const { favourites } = options
      if (favourites) {
        const heart = text('button', '', 'fav')
        heart.type = 'button'
        const paint = (): void => {
          const on = favourites.has(site.id)
          heart.textContent = on ? '★ Favourite' : '☆ Add to favourites'
          heart.setAttribute('aria-pressed', String(on))
        }
        paint()
        heart.addEventListener('click', () => {
          favourites.toggle(site.id)
          paint()
        })
        children.push(heart)
      }
      if (site.repo && !site.isPrivateRepo) {
        const repo = text('a', 'View source on GitHub', launch ? '' : 'launch')
        repo.href = repoUrl(site.repo)
        repo.rel = 'noopener'
        repo.target = '_blank'
        children.push(repo)
      }
      children.push(close)

      element.replaceChildren(...children)
      element.hidden = false
      const first = launch ?? element.querySelector<HTMLElement>('a.launch, button')
      first?.focus()
    },
    openAbout(about) {
      if (!open) {
        const active = document.activeElement
        opener = active instanceof HTMLElement && active !== document.body ? active : null
      }
      open = true
      const heading = text('h2', about.name)
      heading.id = 'detail-title'
      element.setAttribute('aria-labelledby', heading.id)
      const close = text('button', 'Close')
      close.type = 'button'
      close.addEventListener('click', requestClose)
      const links = about.links.map((link) => {
        const anchor = text('a', link.label, 'launch')
        anchor.href = link.href
        anchor.target = '_blank'
        anchor.rel = 'noopener'
        return anchor
      })
      const children: Node[] = [heading]
      if (about.photo) {
        const img = document.createElement('img')
        img.src = about.photo
        img.alt = about.name
        img.addEventListener('error', () => img.remove(), { once: true })
        children.push(img)
      }
      children.push(text('p', about.text), ...links, close)
      element.replaceChildren(...children)
      element.hidden = false
      ;(links[0] ?? close).focus()
    },
    close: finish,
    dispose() {
      document.removeEventListener('keydown', onKeydown)
      finish()
      element.remove()
    },
  }
}
