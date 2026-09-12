import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import type { ProxyOptions } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vitest/config";

const api: ProxyOptions = {
  target: "http://127.0.0.1:8000",
  bypass(req) {
    if (req.headers.accept?.includes("text/html")) {
      return "/index.html";
    }
  },
};

const pwa =
  process.env.VITEST === "true"
    ? []
    : [
        VitePWA({
          registerType: "autoUpdate",
          includeAssets: ["icon.svg"],
          manifest: {
            name: "Espais",
            short_name: "Espais",
            lang: "ca",
            description: "Gestió d’ús i reserva d’espais de l’entitat. Ús intern i gratuït.",
            display: "standalone",
            start_url: "/",
            background_color: "#FFF8E8",
            theme_color: "#1677A8",
            icons: [
              { src: "icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
              { src: "icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
            ],
          },
          workbox: {
            globPatterns: ["**/*.{js,css,html,svg,ico,webmanifest}"],
            navigateFallback: "index.html",
            navigateFallbackDenylist: [/^\/salut/, /^\/registre/, /^\/sessio/, /^\/espais/, /^\/invitacions/, /^\/reserves/, /^\/avisos/, /^\/analisi/],
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
      "/salut": api,
      "/registre": api,
      "/sessio": api,
      "/espais": api,
      "/invitacions": api,
      "/reserves": api,
      "/avisos": api,
      "/analisi": api,
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
  },
});
