import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/',
  plugins: [
    react({
      babel: {
        parserOpts: {
          plugins: ['typescript', 'jsx'],
        },
      },
    }),
  ],
  server: {
    host: '127.0.0.1',
    port: 5500,
    strictPort: true,
  },
  // Sin manualChunks a propósito (Tarjeta [224]): un manualChunks con catch-all
  // le pone nombre fijo a TODO node_modules y termina precargando (modulepreload)
  // hasta los chunks que solo alcanzan imports dinámicos, anulando el
  // code-splitting que Vite hace bien solo. Se deja que Vite decida: lo que solo
  // se alcanza por import() (MapaConductores→mapbox, y los helpers de export)
  // queda en chunks async que NO se precargan.
})