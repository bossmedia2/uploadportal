import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In "npm run dev" läuft Vite auf Port 5173 und der Upload-Server auf Port 3001.
// Der Proxy sorgt dafür, dass /api-Aufrufe automatisch an den Server gehen -
// so braucht deine Kundin nur EINEN Link, egal ob im Dev- oder im Prod-Modus.
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
