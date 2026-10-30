/* Hub service worker. __BUILD_ID__ is stamped at build time, so every deploy is a new worker. */
const CACHE = 'hub-__BUILD_ID__'
const SHELL = ['/', '/manifest.webmanifest', '/icons/icon-192.png']

self.addEventListener('install', (event) => {
  // No skipWaiting here: the page offers "Reload" and asks the waiting worker to take over.
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)))
})

self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    // Network first so a deploy shows up at once; the cached shell is the offline fallback.
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          void caches.open(CACHE).then((cache) => cache.put('/', copy))
          return response
        })
        .catch(() => caches.match('/')),
    )
    return
  }

  // Assets and thumbnails: serve what we have, refresh it in the background.
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(request)
      const refresh = fetch(request)
        .then((response) => {
          if (response.ok) void cache.put(request, response.clone())
          return response
        })
        .catch(() => cached)
      return cached ?? refresh
    }),
  )
})
