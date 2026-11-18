/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />
// Offline-Fähigkeit: App-Dateien werden im Gerät zwischengespeichert. Noten liegen ohnehin in IndexedDB.
import { build, files, version } from '$service-worker';

const sw = self as unknown as ServiceWorkerGlobalScope;
const CACHE = `leo-${version}`;
const ASSETS = [...build, ...files, '/'];

sw.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => sw.skipWaiting()));
});
sw.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => sw.clients.claim())
  );
});
sw.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== sw.location.origin) return;
  if (url.pathname.startsWith('/WebUntis/')) return; // Durchreicher zu WebUntis: nie zwischenspeichern
  e.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      if (ASSETS.includes(url.pathname)) {
        const treffer = await cache.match(url.pathname);
        if (treffer) return treffer;
      }
      try {
        return await fetch(e.request);
      } catch {
        // Offline: Seitenaufrufe bekommen die App-Hülle
        if (e.request.mode === 'navigate') return (await cache.match('/'))!;
        throw new Error('offline');
      }
    })()
  );
});
