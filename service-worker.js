self.addEventListener('install', (event) => {
  self.skipWaiting();
});
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then(
      (resp) => resp || fetch(event.request)
    )
  );
});