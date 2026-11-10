// Service Worker — Finance Nomad
// Provee resiliencia offline para el shell de la aplicación (CSS, JS, fuentes) y páginas cacheadas

const CACHE_NAME = 'fn-static-v1'
const PRECACHE_URLS = ['/', '/dashboard']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS).catch(() => {}))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('fn-') && key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)

  // 1. Excluir peticiones no GET (Server Actions, mutations POST, etc.)
  if (request.method !== 'GET') {
    return
  }

  // 2. Excluir esquemas no soportados (extensiones, data URIs)
  if (!url.protocol.startsWith('http')) {
    return
  }

  // 3. Excluir llamadas de autenticación, Supabase y el bootstrap dinámico
  if (
    url.hostname.includes('supabase.co') ||
    url.pathname.startsWith('/auth') ||
    url.pathname.startsWith('/api/auth') ||
    url.pathname === '/api/bootstrap'
  ) {
    return
  }

  // 4. Recursos estáticos inmutables de Next.js (_next/static, fuentes, imágenes) -> Cache First
  const isStaticAsset =
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.ico')

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse
        return fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const clone = networkResponse.clone()
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
            }
            return networkResponse
          })
          .catch(() => cachedResponse)
      })
    )
    return
  }

  // 5. Navegación de páginas HTML -> Network First con timeout y fallback a caché
  if (request.mode === 'navigate') {
    event.respondWith(
      new Promise((resolve) => {
        const timeoutId = setTimeout(() => {
          // Si la red demora más de 2.5s, intentar servir desde caché
          caches.match(request).then((cached) => {
            if (cached) resolve(cached)
          })
        }, 2500)

        fetch(request)
          .then((networkResponse) => {
            clearTimeout(timeoutId)
            if (networkResponse && networkResponse.status === 200) {
              const clone = networkResponse.clone()
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
            }
            resolve(networkResponse)
          })
          .catch(() => {
            clearTimeout(timeoutId)
            caches.match(request).then((cached) => {
              if (cached) {
                resolve(cached)
              } else {
                // Fallback a dashboard en caché o mensaje amigable
                caches.match('/dashboard').then((dash) => {
                  if (dash) {
                    resolve(dash)
                  } else {
                    resolve(
                      new Response(
                        '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Finance Nomad — Sin conexión</title><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="font-family:system-ui,-apple-system,sans-serif;background:#09090b;color:#f4f4f5;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;padding:20px;box-sizing:border-box;text-align:center;"><div><h1 style="font-size:20px;font-weight:700;margin-bottom:8px;">Sin conexión a internet</h1><p style="font-size:14px;color:#a1a1aa;max-width:400px;margin:0 auto 16px;">Finance Nomad opera en modo offline con tus datos locales. Si ya abriste la app previamente, navegá a tu Dashboard para seguir gestionando tus finanzas.</p><a href="/dashboard" style="display:inline-block;background:#3b82f6;color:#ffffff;text-decoration:none;padding:8px 16px;border-radius:6px;font-size:13px;font-weight:500;">Ir al Dashboard</a></div></body></html>',
                        {
                          headers: { 'Content-Type': 'text/html; charset=utf-8' }
                        }
                      )
                    )
                  }
                })
              }
            })
          })
      })
    )
    return
  }
})

