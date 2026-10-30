/** Chromium's install prompt event, which TypeScript's DOM lib does not describe. */
interface InstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export interface PwaHandlers {
  /** The browser will let the visitor install; call `install` from a button click. */
  onInstallAvailable(install: () => Promise<void>): void
  onInstalled(): void
  /** A new version finished installing and waits; call `apply` to switch and reload. */
  onUpdateReady(apply: () => void): void
}

const UPDATE_CHECK_MS = 60 * 60 * 1000

/** Offers install, and registers the service worker (production only) with a manual update step. */
export function startPwa(handlers: PwaHandlers, register: boolean = import.meta.env.PROD): void {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    const prompt = event as InstallPromptEvent
    handlers.onInstallAvailable(async () => {
      await prompt.prompt()
      await prompt.userChoice
    })
  })
  window.addEventListener('appinstalled', () => handlers.onInstalled())

  if (!register || !('serviceWorker' in navigator)) return

  let reloading = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return
    reloading = true
    location.reload()
  })

  void navigator.serviceWorker
    .register('/sw.js')
    .then((registration) => {
      const offerUpdate = (): void => {
        const waiting = registration.waiting
        // On the very first visit there is no controller and nothing to update from.
        if (waiting && navigator.serviceWorker.controller) {
          handlers.onUpdateReady(() => waiting.postMessage('skip-waiting'))
        }
      }
      offerUpdate()
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'installed') offerUpdate()
        })
      })
      const check = (): void => void registration.update().catch(() => undefined)
      setInterval(check, UPDATE_CHECK_MS)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check()
      })
    })
    .catch(() => undefined)
}
