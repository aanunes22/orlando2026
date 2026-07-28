const CACHE = 'orlando2026-v1'

const CDN_ASSETS = [
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.css',
  'https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.js',
  'https://unpkg.com/dexie@3.2.6/dist/dexie.js',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
]

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => {
      return cache.addAll(CDN_ASSETS).catch(err => {
        console.warn('SW: alguns assets CDN falharam no cache', err)
      })
    })
  )
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    })
  )
  self.clients.claim()
})

self.addEventListener('fetch', event => {
  const url = event.request.url

  // Cache-first para CDN e assets locais
  if (url.includes('unpkg.com') || url.includes('cdn.jsdelivr.net') || url.includes('cdnjs.cloudflare.com') || url.includes('/icon.svg') || url.endsWith('manifest.json')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        return cached || fetch(event.request).then(response => {
          const clone = response.clone()
          caches.open(CACHE).then(cache => cache.put(event.request, clone))
          return response
        })
      })
    )
    return
  }

  // Network-first para o HTML principal (sempre traz o mais novo se online)
  if (url.endsWith('index.html') || url.endsWith('/')) {
    event.respondWith(
      fetch(event.request).then(response => {
        const clone = response.clone()
        caches.open(CACHE).then(cache => cache.put(event.request, clone))
        return response
      }).catch(() => caches.match(event.request))
    )
    return
  }

  // Fallback: tenta cache, depois rede
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  )
})
