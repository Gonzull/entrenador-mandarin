const CACHE_NAME = 'entrenador-chino-v4';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/styles.css',
  './js/main.js',
  './js/storage.js',
  './js/tts.js',
  './js/data.js',
  './js/chars.js',
  './js/lessonFilter.js',
  './js/diagnostico.js',
  './js/tonos.js',
  './js/sibilantes.js',
  './js/aspiracion.js',
  './js/grabadora.js',
  './js/correccion.js',
  './js/pinyinMatch.js',
  './js/tongueDiagrams.js',
  './js/escritura.js',
  './js/oraciones.js',
  './js/chengyu.js',
  './js/progreso.js',
  './data/hsk1.json',
  './data/hsk2.json',
  './data/hsk3.json',
  './data/hsk4.json',
  './data/hsk5.json',
  './data/hsk6.json',
  './data/diagnostico.json',
  './data/sibilantes.json',
  './data/aspiracion.json',
  './data/correccion.json',
  './data/oraciones.json',
  './data/chengyu.json',
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

// Con conexión siempre se sirve la versión más reciente (y se guarda una copia);
// sin conexión se responde con la copia guardada. Así, tras un push, todos los
// archivos de la app llegan de la misma versión y no se mezclan nuevos con viejos.
function networkFirst(request) {
  return caches.open(CACHE_NAME).then(cache =>
    fetch(request, { cache: 'no-cache' })
      .then(response => {
        if (response && response.ok) cache.put(request, response.clone());
        return response;
      })
      .catch(() => cache.match(request))
  );
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
    event.respondWith(networkFirst(request));
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
