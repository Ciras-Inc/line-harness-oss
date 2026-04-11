const CACHE_NAME = 'line-harness-v1'

// アプリシェルのキャッシュ対象
const APP_SHELL_URLS = [
  '/',
  '/chats',
  '/friends',
  '/broadcasts',
  '/templates',
  '/manifest.json',
  '/icon-192.svg',
  '/icon-512.svg',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(APP_SHELL_URLS).catch(() => {
        // 個別ページが存在しない場合でも続行
      })
    )
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  // APIリクエストはキャッシュしない（常にネットワーク優先）
  if (event.request.url.includes('/api/')) {
    return
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached
      return fetch(event.request).then((response) => {
        // 成功したレスポンスのみキャッシュ
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response
        }
        const cloned = response.clone()
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, cloned)
        })
        return response
      })
    })
  )
})
