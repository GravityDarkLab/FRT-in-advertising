import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
// In production the site and the API share one origin and CloudFront sends
// /api/* to the API. This gives `pnpm dev` and `pnpm preview` the same shape.
const proxy = { '/api': 'http://localhost:8000' }

export default defineConfig({
  plugins: [react()],
  server: { proxy },
  preview: { proxy },
  build: {
    // Every asset is its own hashed file: only the two ads on screen are fetched,
    // and CloudFront can cache each one forever.
    assetsInlineLimit: 0,
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    restoreMocks: true,
    unstubGlobals: true,
    unstubEnvs: true,
  },
})
