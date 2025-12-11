const CACHE_VERSION = 'v3';
const CACHE_NAME = `omniflow-${CACHE_VERSION}`;
const STATIC_CACHE = `omniflow-static-${CACHE_VERSION}`;
const API_CACHE = `omniflow-api-${CACHE_VERSION}`;

// Skip service worker caching in development
const IS_LOCALHOST = self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1';

const APP_SHELL = [
  '/',
  '/offline',
  '/logo.png',
  '/favicon.ico',
  '/manifest.json',
  '/apple-touch-icon.png',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

const STATIC_ASSET_PATTERNS = [
  /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
  /\.(?:woff|woff2|ttf|eot)$/,
  /\.(?:css|js)$/
];

const API_PATTERNS = [
  /\/api\//,
  /firestore\.googleapis\.com/,
  /firebase/
];

const CACHE_EXPIRY = {
  STATIC: 90 * 24 * 60 * 60 * 1000,
  API: 5 * 60 * 1000
};

self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching app shell');
        return cache.addAll(APP_SHELL).catch((err) => {
          console.error('[Service Worker] Failed to cache some app shell resources:', err);
          return Promise.resolve();
        });
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (
            cacheName !== CACHE_NAME &&
            cacheName !== STATIC_CACHE &&
            cacheName !== API_CACHE
          ) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip caching in development (localhost)
  if (IS_LOCALHOST) {
    return;
  }

  if (request.method !== 'GET') {
    return;
  }

  if (url.origin === location.origin) {
    if (isStaticAsset(url.pathname)) {
      event.respondWith(cacheFirstStrategy(request, STATIC_CACHE));
      return;
    }

    if (isAPIRequest(url.pathname)) {
      event.respondWith(networkFirstStrategy(request, API_CACHE));
      return;
    }

    if (isNavigationRequest(request)) {
      event.respondWith(navigationStrategy(request));
      return;
    }
  }

  if (isExternalAPI(url.href)) {
    event.respondWith(networkFirstStrategy(request, API_CACHE));
    return;
  }
});

function isStaticAsset(pathname) {
  return STATIC_ASSET_PATTERNS.some((pattern) => pattern.test(pathname));
}

function isAPIRequest(pathname) {
  return API_PATTERNS.some((pattern) => pattern.test(pathname));
}

function isExternalAPI(href) {
  return API_PATTERNS.some((pattern) => pattern.test(href));
}

function isNavigationRequest(request) {
  return request.mode === 'navigate';
}

async function cacheFirstStrategy(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  if (cached) {
    const cacheTime = await getCacheTime(cacheName, request.url);
    if (cacheTime && Date.now() - cacheTime < CACHE_EXPIRY.STATIC) {
      console.log('[Service Worker] Serving from cache:', request.url);
      return cached;
    }
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
      await setCacheTime(cacheName, request.url);
      console.log('[Service Worker] Cached new resource:', request.url);
    }
    return response;
  } catch (error) {
    if (cached) {
      console.log('[Service Worker] Network failed, serving stale cache:', request.url);
      return cached;
    }
    throw error;
  }
}

async function networkFirstStrategy(request, cacheName) {
  const cache = await caches.open(cacheName);

  try {
    const response = await fetch(request, {
      headers: request.headers,
    });

    if (response.ok) {
      cache.put(request, response.clone());
      await setCacheTime(cacheName, request.url);
      console.log('[Service Worker] Network success, cached:', request.url);
    }

    return response;
  } catch (error) {
    console.log('[Service Worker] Network failed, trying cache:', request.url);
    const cached = await cache.match(request);

    if (cached) {
      const cacheTime = await getCacheTime(cacheName, request.url);
      if (cacheTime && Date.now() - cacheTime < CACHE_EXPIRY.API) {
        console.log('[Service Worker] Serving from cache:', request.url);
        return cached;
      }
    }

    throw error;
  }
}

async function navigationStrategy(request) {
  const url = new URL(request.url);
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request);
    
    if (response.ok && url.pathname === '/offline') {
      cache.put(request, response.clone());
      console.log('[Service Worker] Cached offline page:', request.url);
    }
    return response;
  } catch (error) {
    console.log('[Service Worker] Navigation failed, showing offline page');
    
    const offlinePage = await cache.match('/offline');
    if (offlinePage) {
      return offlinePage;
    }

    return new Response(
      `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Offline - OmniFlow</title>
        <style>
          body {
            font-family: system-ui, -apple-system, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-align: center;
            padding: 20px;
          }
          .container {
            max-width: 500px;
          }
          h1 {
            font-size: 2.5rem;
            margin-bottom: 1rem;
          }
          p {
            font-size: 1.1rem;
            line-height: 1.6;
            opacity: 0.9;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>📡 You're Offline</h1>
          <p>It looks like you've lost your internet connection. Don't worry, OmniFlow will work again once you're back online.</p>
          <p>Some cached content may still be available.</p>
        </div>
      </body>
      </html>`,
      {
        headers: { 'Content-Type': 'text/html' },
      }
    );
  }
}

async function getCacheTime(cacheName, url) {
  const cacheTimeKey = new Request(`${self.registration.scope}__cache-metadata__/${cacheName}/${encodeURIComponent(url)}`);
  const cache = await caches.open(`${cacheName}-metadata`);
  const response = await cache.match(cacheTimeKey);
  if (response) {
    const text = await response.text();
    return parseInt(text, 10);
  }
  return null;
}

async function setCacheTime(cacheName, url) {
  const cacheTimeKey = new Request(`${self.registration.scope}__cache-metadata__/${cacheName}/${encodeURIComponent(url)}`);
  const cache = await caches.open(`${cacheName}-metadata`);
  const timestamp = Date.now().toString();
  await cache.put(
    cacheTimeKey,
    new Response(timestamp, { headers: { 'Content-Type': 'text/plain' } })
  );
}

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
