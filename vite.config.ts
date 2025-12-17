import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    include: ['leaflet', 'react-leaflet'],
  },
  build: {
    // Use modern target for BigInt support (required by mapbox-gl)
    target: 'esnext',
    // Enhanced minification settings
    minify: 'esbuild',
    sourcemap: false, // Disable source maps in production for smaller bundle
    cssCodeSplit: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      // Tree shake unused code more aggressively
      treeshake: {
        preset: 'recommended',
        moduleSideEffects: false,
        propertyReadSideEffects: false,
        unknownGlobalSideEffects: false,
      },
    },
    // Additional esbuild minification options
    esbuild: {
      drop: ['console', 'debugger'], // Remove console.log and debugger statements
      minifyIdentifiers: true,
      minifySyntax: true,
      minifyWhitespace: true,
      treeShaking: true,
      legalComments: 'none', // Remove legal comments for smaller size
    },
  },
  // Production CSS optimization
  css: {
    devSourcemap: mode === 'development',
  },
}));
