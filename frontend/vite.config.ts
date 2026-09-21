import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '')
  const devPort = Number(env.VITE_DEV_PORT || 3000)
  const backendUrl = env.VITE_BACKEND_URL || 'http://127.0.0.1:8000'
  return {
    plugins: [vue()],
    server: {
      port: devPort,
      // 端口被占用时直接报错退出，而不是静默切换到其他端口
      strictPort: true,
      proxy: {
        '/api': backendUrl,
        '/ws': { target: backendUrl.replace(/^http/, 'ws'), ws: true },
      },
    },
  }
})
