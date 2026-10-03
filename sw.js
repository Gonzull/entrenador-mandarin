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
      // uno por uno: con addAll, un solo archivo faltante (404) impide instalar el SW
      .then(cache => Promise.all(APP_SHELL.map(url => cache.add(url).catch(() => {}))))
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

// Responde con la copia guardada al instante y la actualiza por detrás,
// así un push nuevo se ve en la siguiente apertura sin subir CACHE_NAME
function staleWhileRevalidate(event) {
  const { request } = event;
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
    if (cached) event.waitUntil(network);
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

  if (url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(event));
    return;
  }

  if (
    url.hostname === 'cdn.jsdelivr.net' ||
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com'
  ) {
    event.respondWith(cacheFirst(request));
  }
});
