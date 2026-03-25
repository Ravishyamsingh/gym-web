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
      // Configure middleware to properly serve large files
      middlewareMode: false,
      // Set proper headers for model files
      headers: {
        "Access-Control-Allow-Origin": "*",
        // Disable compression for model files to avoid Content-Length issues
        "Content-Encoding": "identity",
      },
      proxy: {
        "/api": {
          target: apiOrigin,
          changeOrigin: true,
        },
      },
    },
    // Configure optimizations for large files
    build: {
      // Increase chunk size limit to handle large model files better
      chunkSizeWarningLimit: 10000,
      // Use rollup option for better handling
      rollupOptions: {
        output: {
          manualChunks: undefined,
        },
      },
    },
    // Ensure models are served as-is
    publicDir: "public",
  };
});
