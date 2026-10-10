// Aumente a versão ao publicar alterações nos arquivos essenciais.
const CACHE = 'meu-treino-v1.0.2';
const FILES = ["./index.html","./style.css","./app.js","./config.js","./engine.js","./storage.js","./manifest.webmanifest","./IMAGENS.md","./assets/image-credits.json","./assets/icon.svg","./assets/icon-192.png","./assets/icon-512.png","./assets/icon-maskable.png","./assets/exercises/push-up/frame-1.svg","./assets/exercises/push-up/frame-2.svg","./assets/exercises/push-up/frame-3.svg","./assets/exercises/pike-push-up/frame-1.svg","./assets/exercises/pike-push-up/frame-2.svg","./assets/exercises/pike-push-up/frame-3.svg","./assets/exercises/decline-push-up/frame-1.svg","./assets/exercises/decline-push-up/frame-2.svg","./assets/exercises/decline-push-up/frame-3.svg","./assets/exercises/bodyweight-squat/frame-1.svg","./assets/exercises/bodyweight-squat/frame-2.svg","./assets/exercises/bodyweight-squat/frame-3.svg","./assets/exercises/plank-shoulder-tap/frame-1.svg","./assets/exercises/plank-shoulder-tap/frame-2.svg","./assets/exercises/plank-shoulder-tap/frame-3.svg","./assets/exercises/bicycle-crunch/frame-1.svg","./assets/exercises/bicycle-crunch/frame-2.svg","./assets/exercises/bicycle-crunch/frame-3.svg","./assets/exercises/dead-bug/frame-1.svg","./assets/exercises/dead-bug/frame-2.svg","./assets/exercises/dead-bug/frame-3.svg"];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES))));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('meu-treino-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('message', event => { if (event.data === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(caches.open(CACHE).then(async cache => {
    const hit = await cache.match(event.request, {ignoreSearch:true});
    if (hit) return hit;
    try { return await fetch(event.request); }
    catch { if (event.request.mode === 'navigate') return cache.match('./index.html'); return Response.error(); }
  }));
});
