import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { localesApi } from '../scripts/vite-locales.ts';
import { reviewApi, homePage } from '../scripts/vite-review.ts';

// Standalone text editor: `npm run text`. Its own server and port, so it never
// opens the game. Reads and writes src/locales/<lang>/*.json on save; the review
// ledger lives next to this file. Game code is imported for context (speakers,
// checks, outcomes, art), so the root is the repo.
const repo = fileURLToPath(new URL('..', import.meta.url));

export default defineConfig({
  root: repo,
  cacheDir: 'node_modules/.vite-text',
  plugins: [
    homePage('text-editor/index.html'),
    localesApi(`${repo}src/locales`),
    reviewApi(fileURLToPath(new URL('./review.json', import.meta.url))),
  ],
  server: {
    // Fixed, and fail rather than hunt: a second copy on another port would
    // write the same files from two tabs.
    port: 5180,
    strictPort: true,
    open: '/',
  },
});
