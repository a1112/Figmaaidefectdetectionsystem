import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
    // 代理配置：将 /api 和 /health 请求转发到后端
    proxy: {
      "/api": {
        target: "http://localhost:8120",
        changeOrigin: true,
        secure: false,
      },
      // small 实例：监听 8130 端口，路径仍为 /api/...，通过前缀 /small-api 转发
      "/small-api": {
        target: "http://localhost:8130",
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/small-api/, "/api"),
      },
      "/health": {
        target: "http://localhost:8120",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});