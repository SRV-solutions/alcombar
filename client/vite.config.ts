import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));

// El código compartido con la API (permisos, validaciones, catálogos) vive en api/src/shared
// y se importa como '@shared'. Así no hay copias que mantener sincronizadas.
const SHARED = here('../api/src/shared');

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@shared': SHARED },
    // zod se toma siempre de client/node_modules, aunque lo importe un archivo de api/src/shared
    dedupe: ['zod'],
  },
  server: {
    port: 5173,
    fs: { allow: [here('.'), SHARED] },
    // En desarrollo, /api va a la API local (igual que Netlify en producción):
    // el navegador ve un solo dominio y las cookies funcionan sin CORS.
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: false },
    },
  },
});
