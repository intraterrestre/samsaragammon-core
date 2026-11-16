// 16 nov 2026 — v3: el service worker solo atiende las peticiones GET del
// propio juego (mismo origen). Antes interceptaba TODO, también las de
// Supabase: si una fallaba, Safari mostraba "FetchEvent.respondWith
// received an error" en lugar del error real. Ahora Supabase va directo.
const CACHE_NAME = "samsaragammon-v3";
const PRECACHE = ["/", "/index.html"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  // Supabase, fuentes externas, POST…: el navegador se encarga, sin intervenir.
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  // Network-first: siempre intenta la red; sin red, la copia guardada.
  event.respondWith(
    fetch(req).catch(() =>
      caches.match(req).then((cached) => cached || Response.error())
    )
  );
});
