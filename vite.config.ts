import { defineConfig } from 'vite'
import { vitePluginSFC } from './src/core/vite-plugin-sfc'

export default defineConfig({
  plugins: [vitePluginSFC()],
  server: {
    port: 3001,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
})