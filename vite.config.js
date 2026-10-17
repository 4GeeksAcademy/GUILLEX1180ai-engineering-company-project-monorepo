import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// Base relativa: permite servir el build desde GitHub Pages
// en https://<usuario>.github.io/<repo>/ o desde un subdirectorio.
export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: {
        main: resolve(process.cwd(), 'index.html'),
        application: resolve(process.cwd(), 'application.html'),
        console: resolve(process.cwd(), 'console.html')
      }
    }
  }
});