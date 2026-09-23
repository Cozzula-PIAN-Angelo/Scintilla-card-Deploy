import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // porta fissa: è l'unica origine ammessa dal CORS del backend
  server: { port: 5173, strictPort: true },
})
