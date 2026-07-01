import { defineConfig } from 'vite';

// Relative base so the build works both locally and from a GitHub Pages
// project subpath (https://<user>.github.io/Ronin-Duel/).
export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1500, // Phaser is a large single dependency
  },
  server: {
    // Dedicated port so this game never collides with other local Vite
    // projects (e.g. another app squatting on Vite's default 5173).
    port: 5180,
    strictPort: true, // fail loudly if 5180 is busy instead of silently bumping
    open: true, // auto-open the correct URL in the browser
    host: true,
  },
});
