import type { Site } from '../data/schema'

const FOCUSABLE =
  'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'

export interface DetailPanel {
  readonly element: HTMLElement
  /** Shows the site; remembers the focused element so close() can restore it. */
  open(site: Site): void
  /** Hides the panel and restores focus; does not call `onClose`. */
  close(): void
  readonly isOpen: boolean
  dispose(): void
}

export interface DetailPanelOptions {
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

      const launch = text('a', `Launch ${site.name}`, 'launch')
      launch.href = site.url
      launch.target = '_blank'
      launch.rel = 'noopener'

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
      if (site.status === 'dead') children.push(text('p', 'May be offline', 'offline'))
      children.push(facts, launch)
      if (site.repo && !site.isPrivateRepo) {
        const repo = text('a', 'View source on GitHub')
        repo.href = site.repo.startsWith('http') ? site.repo : `https://github.com/${site.repo}`
        repo.rel = 'noopener'
        repo.target = '_blank'
        children.push(repo)
      }
      children.push(close)

      element.replaceChildren(...children)
      element.hidden = false
      launch.focus()
    },
    close: finish,
    dispose() {
      document.removeEventListener('keydown', onKeydown)
      finish()
      element.remove()
    },
  }
}
