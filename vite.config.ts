import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import electron from "vite-plugin-electron";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => ({
  base: mode === "development" ? "/" : "./",
  plugins: [
    react(),
    tailwindcss(),
    electron([
      {
        entry: "electron/main.ts",
        onstart:
          mode === "development"
            ? (args) => {
                // Start electron in development mode
                args.startup();
              }
            : undefined,
        vite: {
          build: {
            outDir: "dist-electron",
            sourcemap: mode === "development",
          },
        },
      },
      {
        entry: "electron/preload.ts",
        vite: {
          build: {
            outDir: "dist-electron",
            sourcemap: mode === "development",
            rollupOptions: {
              output: {
                format: "cjs", // Preload must be CommonJS
              },
            },
          },
        },
      },
    ]),
  ],
  build: {
    outDir: "dist",
    sourcemap: mode === "development",
  },
  server: {
    port: 5173,
    strictPort: true,
  },
}));
