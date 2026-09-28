// The site used to be a Flutter web app that registered this service worker
// and cached the whole bundle. This version replaces it: it clears the old
// caches, unregisters itself and reloads open tabs onto the new static site.
self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
    await self.registration.unregister();
    const windows = await self.clients.matchAll({ type: "window" });
    windows.forEach((client) => client.navigate(client.url));
  })());
});
