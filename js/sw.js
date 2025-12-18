const CACHE = 'mtj-portfolio-v2';
const ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/script.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
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
 

