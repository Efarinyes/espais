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
          includeAssets: ["icon.svg"],
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
              { src: "icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
              { src: "icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
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
