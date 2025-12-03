import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
    // 代理配置：将 /api 和 /health 请求转发到后端
    proxy: {
      '/api': {
        target: 'http://localhost:8120',
        changeOrigin: true,
        secure: false,
      },
      '/health': {
        target: 'http://localhost:8120',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
