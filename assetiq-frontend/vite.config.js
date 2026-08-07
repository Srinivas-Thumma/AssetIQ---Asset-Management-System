import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
  ],
  
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})

// The Socket.IO connection in SocketContext.jsx does NOT go through the Vite proxy. It connects directly to http://localhost:5000 (hardcoded when window.location.hostname is localhost). This works because the backend socket.js has its own CORS config that explicitly allows http://localhost:5173.