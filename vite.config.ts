import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // CRITICAL: Ensures assets use relative paths (e.g., "./assets/...") so they load on GitHub Pages subdirectories
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
  },
  define: {
    // Polyfill to prevent "process is not defined" error in some libs
    'process.env': {} 
  }
});