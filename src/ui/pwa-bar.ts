export interface PwaBar {
  readonly element: HTMLElement
  showInstall(install: () => Promise<void>): void
  showUpdate(apply: () => void): void
  hide(): void
}

const DISMISSED_KEY = 'hub.install-dismissed'

function dismissedBefore(): boolean {
  try {
    return sessionStorage.getItem(DISMISSED_KEY) === '1'
  } catch {
    return false
  }
}

/** A small bottom snackbar offering "Install" and, once a new version is waiting, "Reload". */
export function createPwaBar(parent: HTMLElement): PwaBar {
  const element = document.createElement('div')
  element.className = 'pwa-bar'
  element.setAttribute('role', 'status')
  element.hidden = true
  parent.append(element)

  const show = (
    message: string,
    action: string,
    onAction: () => void,
    dismissible: boolean,
  ): void => {
    const text = document.createElement('span')
    text.textContent = message
    const primary = document.createElement('button')
    primary.type = 'button'
    primary.className = 'primary'
    primary.textContent = action
    primary.addEventListener('click', onAction)
    const children: Node[] = [text, primary]
    if (dismissible) {
      const later = document.createElement('button')
      later.type = 'button'
      later.textContent = 'Not now'
      later.addEventListener('click', () => {
        try {
          sessionStorage.setItem(DISMISSED_KEY, '1')
        } catch {
          // Storage blocked: the bar simply comes back next visit.
        }
        element.hidden = true
      })
      children.push(later)
    }
    element.replaceChildren(...children)
    element.hidden = false
  }

  return {
    element,
    showInstall(install) {
      if (dismissedBefore()) return
      show(
        'Install this as an app?',
        'Install',
        () => {
          void install().finally(() => (element.hidden = true))
        },
        true,
      )
    },
    showUpdate(apply) {
      show('A new version is ready.', 'Reload', apply, false)
    },
    hide() {
      element.hidden = true
    },
  }
}
