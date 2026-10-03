const CACHE_NAME = 'entrenador-chino-v3';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/styles.css',
  './js/main.js',
  './js/storage.js',
  './js/tts.js',
  './js/data.js',
  './js/diagnostico.js',
  './js/tonos.js',
  './js/sibilantes.js',
  './js/aspiracion.js',
  './js/grabadora.js',
  './js/correccion.js',
  './js/tongueDiagrams.js',
  './js/escritura.js',
  './js/progreso.js',
  './data/hsk1.json',
  './data/hsk2.json',
  './data/hsk3.json',
  './data/hsk4.json',
  './data/hsk5.json',
  './data/diagnostico.json',
  './data/sibilantes.json',
  './data/aspiracion.json',
  './data/correccion.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function isAppData(url) {
  return url.origin === self.location.origin && url.pathname.includes('/data/');
}

function staleWhileRevalidate(request) {
  return caches.open(CACHE_NAME).then(async cache => {
    const cached = await cache.match(request);
    const network = fetch(request, { cache: 'no-cache' })
      .then(response => {
        if (response && (response.ok || response.type === 'opaque')) {
          cache.put(request, response.clone());
        }
        return response;
      })
      .catch(() => cached);
    return cached || network;
  });
}

function cacheFirst(request) {
  return caches.match(request).then(cached => {
    if (cached) return cached;
    return fetch(request).then(response => {
      if (response && (response.ok || response.type === 'opaque')) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
      }
      return response;
    });
  });
}

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (isAppData(url)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  if (
    url.origin === self.location.origin ||
    url.hostname === 'cdn.jsdelivr.net' ||
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com'
  ) {
    event.respondWith(cacheFirst(request));
  }
});
