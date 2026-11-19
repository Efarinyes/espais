/* Web Push d’Espais. Es carrega dins del Service Worker generat per vite-plugin-pwa
   (workbox.importScripts). No fa servir cap dada fora del que envia el backend. */

self.addEventListener("push", (event) => {
  let dades = {};
  try {
    dades = event.data ? event.data.json() : {};
  } catch {
    dades = {};
  }
  const titol = typeof dades.title === "string" && dades.title ? dades.title : "Espais";
  const opcions = {
    body: typeof dades.body === "string" ? dades.body : "",
    tag: typeof dades.tag === "string" ? dades.tag : undefined,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    lang: "ca",
    data: { url: typeof dades.url === "string" && dades.url.startsWith("/") ? dades.url : "/avisos" },
  };
  event.waitUntil(
    (async () => {
      await self.registration.showNotification(titol, opcions);
      // Desperta les pestanyes obertes perquè tornin a llegir els avisos del backend.
      const finestres = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const finestra of finestres) {
        finestra.postMessage({ type: "espais-push" });
      }
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const desti = (event.notification.data && event.notification.data.url) || "/avisos";
  event.waitUntil(
    (async () => {
      const finestres = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const finestra of finestres) {
        if (new URL(finestra.url).origin === self.location.origin && "focus" in finestra) {
          await finestra.focus();
          if ("navigate" in finestra) {
            await finestra.navigate(desti);
          }
          return;
        }
      }
      await self.clients.openWindow(desti);
    })(),
  );
});
