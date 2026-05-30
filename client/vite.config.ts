import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Dev server runs on 3000 (matches the CORS origin the server expects).
// We proxy /api/* to the Express backend on 4000 so the frontend can call
// '/api/simulate' without worrying about the cross-origin dance in dev.
// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
})
