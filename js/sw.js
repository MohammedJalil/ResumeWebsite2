const CACHE = 'mtj-portfolio-v7';
const ASSETS = [
  '/',
  '/index.html',
  '/swiss.html',
  '/parsed.html',
  '/css/style.css',
  '/js/script.js',
  '/js/chat.js'
];

self.addEventListener('install', (e) => {
  // Skip waiting to activate immediately
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
});

self.addEventListener('activate', (e) => {
  // Take control of all pages immediately
  e.waitUntil(
    Promise.all([
      caches.keys().then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      ),
      self.clients.claim() // Take control of all clients immediately
    ])
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  
  // Don't cache API requests - let them go through normally
  // Also skip POST requests entirely (they're always API calls)
  if (url.pathname.startsWith('/api/') || req.method !== 'GET') {
    return; // Let the browser handle it normally, don't intercept
  }
  
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok && !res.redirected) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match('/')))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then((cached) =>
      cached || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      })
    )
  );
});
 

