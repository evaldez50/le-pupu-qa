const CACHE_NAME = 'lpg-v1';
const ASSETS = [
  './',
  './index.html',
  './assets/index-C03ObVeJ.js',
  './assets/index-CH2eyl1P.css'
];

const OFFLINE_HTML = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sin conexión — Le Pupu Le Guagua</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,-apple-system,sans-serif;background:#0f172a;color:#e2e8f0;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:2rem;text-align:center}.card{max-width:400px}.emoji{font-size:4rem;margin-bottom:1rem}h1{font-size:1.4rem;margin-bottom:.75rem}p{color:#94a3b8;line-height:1.6;margin-bottom:1.5rem}button{background:#0055A4;color:#fff;border:none;padding:.75rem 2rem;border-radius:10px;font-size:1rem;font-weight:700;cursor:pointer}button:hover{background:#003d7a}</style></head><body><div class="card"><div class="emoji">📡</div><h1>Sin conexión a internet</h1><p>Parece que no tienes conexión. Verifica tu internet e intenta de nuevo. Tu progreso local está guardado.</p><button onclick="location.reload()">Reintentar</button></div></body></html>`;

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // API calls: network-first
  if (url.hostname.includes('supabase') || url.hostname.includes('stripe')) {
    e.respondWith(
      fetch(e.request).catch(() =>
        new Response(JSON.stringify({ error: 'offline' }), {
          headers: { 'Content-Type': 'application/json' }
        })
      )
    );
    return;
  }

  // Static assets: cache-first
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        if (response.ok && e.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => {
        if (e.request.destination === 'document') {
          return new Response(OFFLINE_HTML, {
            headers: { 'Content-Type': 'text/html' }
          });
        }
      });
    })
  );
});
