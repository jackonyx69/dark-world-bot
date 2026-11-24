import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  root: path.resolve(__dirname, ".."),
  plugins: [react(), tailwindcss()],
  base: process.env.BASE_PATH || "/",
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
    dedupe: ["react", "react-dom", "@tanstack/react-query"],
  },
  build: {
    outDir: path.resolve(__dirname, "..", "dist", "public"),
    emptyOutDir: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "wouter", "@tanstack/react-query"],
          icons: ["lucide-react", "react-icons"],
        },
      },
    },
  },
  server: {
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
