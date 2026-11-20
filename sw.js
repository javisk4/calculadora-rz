/* Calculadora RZ · service worker: guarda la app en el teléfono para que funcione sin internet.
   Al publicar una versión nueva, cambia VERSION: el teléfono baja la nueva y borra la anterior. */
"use strict";

const VERSION = "calcrz-v2";       // v2: fuente recortada (carga mucho más rápida)
const ARCHIVOS = [
  "./", "index.html", "manifest.webmanifest", "css/app.css", "js/calculo.js", "js/app.js",
  "fuentes/montserrat-500.woff2", "fuentes/montserrat-800.woff2",
  "iconos/rz.png", "iconos/icono-192.png", "iconos/icono-512.png", "iconos/icono-maskable-512.png",
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(claves => Promise.all(claves.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Primero lo guardado en el teléfono (funciona en modo avión); si no está, la red.
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(r => r || fetch(e.request)));
});
