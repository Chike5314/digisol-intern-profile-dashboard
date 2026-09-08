import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  // During local development, forward API requests through Vite. This keeps
  // browser requests same-origin and avoids API Gateway CORS preflight issues.
  // Production still calls API Gateway directly after its CDK CORS deployment.
  server: {
    proxy: {
      '/api': {
        target: 'https://l8ko517zxc.execute-api.us-east-1.amazonaws.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/prod'),
      },
    },
  },
})
