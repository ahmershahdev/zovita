import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [tailwindcss()],
  build: {
    outDir: "frontend/assets/css/dist",
    emptyOutDir: true,
    rollupOptions: {
      input: "frontend/assets/css/tailwind-entry.css",
      output: {
        assetFileNames: "tailwind.[ext]",
      },
    },
  },
});
