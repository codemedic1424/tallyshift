const CACHE_NAME = 'tallyshift-cache-v2'
const OFFLINE_URLS = ['/', '/manifest.json']

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME)
      await cache.addAll(OFFLINE_URLS)
      self.skipWaiting()
    })(),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
  // ✅ Only handle GET requests — skip POST, PUT, DELETE, etc.
  if (event.request.method !== 'GET') return

  event.respondWith(
    (async () => {
      try {
        const net = await fetch(event.request)
        const cache = await caches.open(CACHE_NAME)
        cache.put(event.request, net.clone())
        return net
      } catch (e) {
        const cached = await caches.match(event.request)
        if (cached) return cached
        return caches.match('/')
      }
    })(),
  )
})
