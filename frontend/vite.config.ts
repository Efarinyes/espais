import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      "/salut": "http://127.0.0.1:8000",
      "/registre": "http://127.0.0.1:8000",
      "/sessio": "http://127.0.0.1:8000",
      "/espais": "http://127.0.0.1:8000",
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
  },
});
