const CACHE_NAME = 'payconf-v1';
const ASSETS = [
  'index.html',
  'login.html',
  'reports.html',
  'settings.html',
  'verify.html',
  'style.css',
  'app.js',
  'auth_check.js',
  'firebase_config.js',
  'manifest.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting(); // Force the waiting service worker to become the active service worker
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim()); // Become available to all pages immediately
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
