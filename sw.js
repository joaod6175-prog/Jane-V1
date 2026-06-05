/* ============================================
   JARVIS MOBILE AI — SERVICE WORKER
   Cache-first strategy for offline support
   ============================================ */

const CACHE_NAME = 'jarvis-v1.0.0';
const STATIC_ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './assets/icon.png',
  'https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;900&family=Share+Tech+Mono&family=Rajdhani:wght@300;400;500;600&display=swap',
];

// ── INSTALL: cache static assets ──
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando JARVIS Service Worker...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Cacheando assets estáticos');
      return cache.addAll(STATIC_ASSETS.map(url => new Request(url, { cache: 'reload' })));
    }).then(() => self.skipWaiting())
  );
});

// ── ACTIVATE: cleanup old caches ──
self.addEventListener('activate', (event) => {
  console.log('[SW] Ativando JARVIS Service Worker...');
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log('[SW] Removendo cache antigo:', key);
            return caches.delete(key);
          })
      )
    ).then(() => self.clients.claim())
  );
});

// ── FETCH: cache-first for static, network-first for API ──
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Don't intercept Gemini or Supabase API calls
  if (
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('supabase.io') ||
    event.request.method !== 'GET'
  ) {
    return;
  }

  // Don't intercept Chrome extensions
  if (url.protocol === 'chrome-extension:') return;

  // For Google Fonts
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        const response = await fetch(event.request);
        cache.put(event.request, response.clone());
        return response;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Cache-first for everything else
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return response;
      }).catch(() => {
        // Fallback to index.html for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});

// ── PUSH NOTIFICATIONS (opcional) ──
self.addEventListener('push', (event) => {
  const data = event.data?.json() || { title: 'JARVIS', body: 'Nova notificação' };
  event.waitUntil(
    self.registration.showNotification(data.title || 'JARVIS', {
      body: data.body,
      icon: './assets/icon.png',
      badge: './assets/icon.png',
      vibrate: [100, 50, 100],
      data: { url: './' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || './')
  );
});
