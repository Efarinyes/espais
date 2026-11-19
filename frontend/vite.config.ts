import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vitest/config";

// El navegador només actualitza el Service Worker si canvia el seu text: la versió de
// push-sw.js viatja a la URL d’importScripts i qualsevol canvi del fitxer el renova.
const versioPush = createHash("sha256").update(readFileSync(new URL("./public/push-sw.js", import.meta.url))).digest("hex").slice(0, 12);

const pwa =
  process.env.VITEST === "true"
    ? []
    : [
        VitePWA({
          registerType: "autoUpdate",
          includeAssets: ["icon.svg", "icon-192.png", "icon-512.png", "apple-touch-icon.png"],
          manifest: {
            name: "Espais",
            short_name: "Espais",
            lang: "ca",
            description: "Gestió d’ús i reserva d’espais de l’entitat. Ús intern i gratuït.",
            display: "standalone",
            start_url: "/",
            background_color: "#F3F6F6",
            theme_color: "#1B4F86",
            icons: [
              { src: "icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
              { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
              { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
            ],
          },
          workbox: {
            globPatterns: ["**/*.{js,css,html,svg,ico,webmanifest}"],
            navigateFallback: "index.html",
            navigateFallbackDenylist: [/^\/api/],
            importScripts: [`push-sw.js?v=${versioPush}`],
          },
          devOptions: {
            enabled: true,
            type: "module",
          },
        }),
      ];

export default defineConfig({
  plugins: [vue(), tailwindcss(), ...pwa],
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        rewrite: (path) => path.replace(/^\/api/, ""),
        ws: true,
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
  },
});
