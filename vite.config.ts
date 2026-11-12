import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import pkg from './package.json' with { type: 'json' };

export default defineConfig({
  base: './',
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  build: { target: 'es2020', sourcemap: false, chunkSizeWarningLimit: 400 },
  plugins: [
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Red Outpost: Mars Survival Trainer',
        short_name: 'Red Outpost',
        description: 'Run a Mars outpost with real NASA data. Works offline.',
        theme_color: '#1a0f0d',
        background_color: '#1a0f0d',
        display: 'standalone',
        orientation: 'any',
        start_url: './',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,json,woff2,webp,png}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        navigateFallback: 'index.html',
      },
    }),
  ],
  test: { include: ['tests/unit/**/*.test.ts'], environment: 'node' },
});
