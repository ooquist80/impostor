import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// Camera access needs HTTPS on phones, so dev runs on a self-signed cert (basic-ssl).
// `npm run dev` passes --host so phones on the LAN can reach it. /api goes to the backend
// through the same origin, so there is no mixed content and no CORS.
export default defineConfig({
  plugins: [react(), basicSsl()],
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
