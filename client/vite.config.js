import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiOrigin = (env.VITE_API_URL || "").trim().replace(/\/+$/, "").replace(/\/api$/i, "");

  if (!apiOrigin) {
    throw new Error("VITE_API_URL is required. Set it in client/.env.local for local development or client/.env for production.");
  }

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: apiOrigin,
          changeOrigin: true,
        },
      },
    },
  };
});
