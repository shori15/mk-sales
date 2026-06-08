const CACHE_NAME = 'mk-sales-v90';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(
        names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  // Firebase/Google/CDN系は常にネットから直接取得(SWを通さない)
  if (url.includes('gstatic.com') ||
      url.includes('firebaseio.com') ||
      url.includes('googleapis.com') ||
      url.includes('google-analytics.com') ||
      url.includes('googletagmanager.com') ||
      url.includes('firebase')) {
    return;
  }

  // index.html はネット優先: 常に最新を取得し、オフライン時のみキャッシュを使う
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
        return res;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // アイコン・manifest・Chart.js はキャッシュ優先(変更頻度が低いため)
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).then((res) => {
        if (event.request.method === 'GET' && res.status === 200) {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
        }
        return res;
      }).catch(() => new Response('', { status: 504 }));
    })
  );
});
