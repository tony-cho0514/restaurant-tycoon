/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: process.env.GITHUB_PAGES ? '/restaurant-tycoon/' : '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png', 'assets/*.webp', 'models/**/*'],
      manifest: {
        name: '피자집 경영',
        short_name: '피자집 경영',
        description: '작은 피자집을 키우며 경영을 배우는 게임',
        lang: 'ko',
        display: 'standalone',
        orientation: 'any',
        background_color: '#fbf4e6',
        theme_color: '#d4472f',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,webp,svg,glb}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
    }),
  ],
  test: {
    globals: true,
    include: ['tests/**/*.test.{ts,tsx}'],
  },
});
