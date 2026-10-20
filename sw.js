// Service worker de Peldaño: guarda el juego en el dispositivo para que funcione sin conexión.
// Al cambiar cualquier archivo del juego, sube VERSION para que los móviles reciban la nueva versión.
const VERSION = 'peldano-v19';
const ARCHIVOS = [
  './', 'index.html', 'css/estilo.css', 'js/juego.js', 'data/retos.json', 'data/diccionario.json', 'manifest.webmanifest',
  'fonts/bricolage.woff2', 'fonts/atkinson-400.woff2', 'fonts/atkinson-700.woff2',
  'icons/favicon.svg', 'icons/favicon.ico', 'icons/icon-192.png', 'icons/icon-512.png',
  'icons/icon-maskable-192.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    // solo las copias viejas de Peldaño: los demás juegos del mismo sitio guardan aquí las suyas
    .then(keys => Promise.all(keys.filter(k => k.startsWith('peldano') && k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// La página, los datos (retos y diccionario) y el manifiesto: primero la red (para recibir novedades) y, sin conexión, lo guardado.
// El resto (estilos, código, fuentes, iconos): primero lo guardado.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  const ruta = new URL(req.url).pathname;
  const manifiesto = ruta.endsWith('/manifest.webmanifest');
  const red = req.mode === 'navigate' || /\/data\/[^/]+\.json$/.test(ruta) || manifiesto;
  if (red) {
    // el manifiesto se revalida siempre con el servidor, sin fiarse de la caché HTTP del navegador
    e.respondWith(fetch(req, manifiesto ? {cache: 'no-cache'} : undefined).then(res => {
      if (res.ok) { const copia = res.clone(); caches.open(VERSION).then(c => c.put(req, copia)); }
      return res;
    }).catch(() => caches.match(req, {ignoreSearch: true}).then(r => r || caches.match('index.html'))));
  } else {
    e.respondWith(caches.match(req).then(r => r || fetch(req)));
  }
});
