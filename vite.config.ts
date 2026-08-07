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
  build: {
    // Separar los pesos muertos en chunks propios para que no viajen en el
    // bundle inicial: así una admin que solo aprueba una recarga no baja
    // mapbox / recharts / jspdf / xlsx. (Tarjeta [224])
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('mapbox-gl')) return 'mapbox'
          if (id.includes('recharts') || id.includes('/d3-')) return 'charts'
          if (id.includes('jspdf') || id.includes('html2canvas')) return 'pdf'
          if (id.includes('xlsx')) return 'xlsx'
          if (id.includes('firebase') || id.includes('@firebase')) return 'firebase'
          return 'vendor'
        },
      },
    },
    chunkSizeWarningLimit: 800,
  },
})