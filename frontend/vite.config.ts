import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const gatewayUrl = env.VITE_GATEWAY_URL || "http://localhost:8080";

  return {
    plugins: [react()],
    server: {
      host: "0.0.0.0",
      proxy: {
        "/api": {
          target: gatewayUrl,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ""),
          timeout: 120_000,
          proxyTimeout: 120_000,
        },
      },
    },
  };
});
