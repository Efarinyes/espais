import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vitest/config";

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
            background_color: "#F1F5F9",
            theme_color: "#0B5ED7",
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
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
  },
});
