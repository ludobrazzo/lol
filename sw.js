// Nome della cache: cambia versione quando vuoi forzare aggiornamenti dei file salvati.
const CACHE_NAME = "wikischool-v2";
// File principali da salvare nel browser per rendere il sito più veloce e installabile.
const assetsToCache = [
  "./",
  "./index.html",
  "./archivio.html",
  "./styles.css",
  "./script.js",
  "./script_archivio.js",
  "./manifest.json"
];

// Installa e forza subito l'aggiornamento
self.addEventListener("install", (event) => {
  self.skipWaiting(); 
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(assetsToCache);
    })
  );
});

// Elimina la vecchia memoria "v1" che ti bloccava il sito
self.addEventListener("activate", (event) => {
  self.clients.claim();
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
});

// Network First: Cerca SEMPRE su internet prima di caricare la memoria vecchia
self.addEventListener("fetch", (event) => {
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
