/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { localesApi } from './scripts/vite-locales.ts';

// Relative base so the build works at any GitHub Pages project path.
// Only index.html is built. The text editor is a separate dev app: text-editor/vite.config.ts.
export default defineConfig({
  base: './',
  plugins: [localesApi()],
  build: { target: 'es2022', outDir: 'dist', assetsInlineLimit: 0 },
  test: { include: ['tests/**/*.test.ts'] },
});
