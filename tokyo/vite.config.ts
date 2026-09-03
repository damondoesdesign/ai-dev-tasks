import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectRegister: false,
      manifest: false, // public/manifest.webmanifest is hand-written
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest,woff2}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
      },
      devOptions: { enabled: false },
    }),
  ],
  // MapLibre loads its worker via new URL(..., import.meta.url); pre-bundling breaks that path in dev.
  optimizeDeps: { exclude: ['maplibre-gl'] },
  worker: { format: 'es' },
  server: { host: true, port: 5174 },
  preview: { host: true, port: 4174 },
  build: {
    target: 'es2022',
    sourcemap: false,
    rollupOptions: {
      output: {
        advancedChunks: {
          groups: [
            { name: 'maplibre', test: /node_modules[\\/](maplibre-gl|pmtiles|@protomaps|@maplibre)/ },
            { name: 'firebase', test: /node_modules[\\/](firebase|@firebase)/ },
          ],
        },
      },
    },
  },
})
