import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,  // 포트 충돌 시 자동 증가 대신 오류 발생 → 포트 고갈 방지
    allowedHosts: ['.ngrok-free.app'],
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        ws: true,  // WebSocket 프록시 활성화 (아레나 실시간 채팅)
      },
    },
  },
})
