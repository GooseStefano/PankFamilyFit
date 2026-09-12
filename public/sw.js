const CACHE_NAME = 'pankfit-shell-v0.11.1'
const CORE_SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icons/pankfit.svg',
  '/icons/pankfit-192.png',
  '/icons/pankfit-512.png',
  '/icons/pankfit-maskable-512.png',
]

const ownUrl = value => {
  const url = new URL(value, self.location.origin)
  return url.origin === self.location.origin ? `${url.pathname}${url.search}` : null
}

const cacheUrls = async urls => {
  const cache = await caches.open(CACHE_NAME)
  await Promise.all(urls.filter(Boolean).map(url => cache.add(url).catch(() => undefined)))
}

const cacheProductionShell = async () => {
  const cache = await caches.open(CACHE_NAME)
  await cache.addAll(CORE_SHELL)
  const index = await cache.match('/index.html')
  const html = await index?.text()
  const assets = [...(html || '').matchAll(/(?:src|href)="([^"]+)"/g)]
    .map(([, value]) => ownUrl(value))
    .filter(url => url?.startsWith('/assets/'))
  await cacheUrls(assets)
}

self.addEventListener('install', event => {
  event.waitUntil(cacheProductionShell())
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('message', event => {
  if (event.data?.type === 'CACHE_ASSETS') event.waitUntil(cacheUrls(event.data.urls || []))
})

self.addEventListener('fetch', event => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  // Supabase lives on another origin and must always use its own network/auth flow.
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put('/index.html', response.clone()))
          return response
        })
        .catch(() => caches.match('/index.html')),
    )
    return
  }

  if (['script', 'style', 'image', 'font'].includes(request.destination)) {
    event.respondWith(
      caches.match(request).then(cached => cached || fetch(request).then(response => {
        if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()))
        return response
      })),
    )
  }
})
