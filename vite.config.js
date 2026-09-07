import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    host: '127.0.0.1'
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        privacidad: resolve(import.meta.dirname, 'politica-de-privacidad.html'),
        terminos: resolve(import.meta.dirname, 'terminos-de-servicio.html'),
        eliminacion: resolve(import.meta.dirname, 'eliminacion-de-datos.html'),
        login: resolve(import.meta.dirname, 'login.html')
      }
    }
  }
});
