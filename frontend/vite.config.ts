import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    proxy: {
      "/api": {
        target: "http://gateway:8080",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
        // Для больших файлов (изображения/видео)
        timeout: 120_000,
        proxyTimeout: 120_000,
      },
    },
  },
});
