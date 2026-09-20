import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

// 地址与端口全部来自环境配置(见 .env.example),不再写死
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const devPort = Number(env.VITE_DEV_PORT ?? 3000)
  const backendHost = env.VITE_BACKEND_HOST ?? '127.0.0.1'
  const backendPort = Number(env.VITE_BACKEND_PORT ?? 8000)
  const backendOrigin = `http://${backendHost}:${backendPort}`

  return {
    plugins: [vue()],
    server: {
      port: devPort,
      // 端口被占用时直接报错退出,不静默换端口(否则代理与后端 CORS 口径会错位)
      strictPort: true,
      proxy: {
        '/api': { target: backendOrigin, changeOrigin: true },
        '/ws': { target: backendOrigin.replace(/^http/, 'ws'), ws: true, changeOrigin: true },
        '/health': { target: backendOrigin, changeOrigin: true }
      }
    }
  }
})
