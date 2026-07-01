import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import cesium from 'vite-plugin-cesium'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), cesium()],
  // GitHub Pages部署：设置base为仓库名，构建后所有资源路径自动加前缀
  // 如果仓库名不同，请修改此处
  base: '/geomorphology-web3d/',
  define: {
    // Define global constants - remove the custom CESIUM_BASE_URL as vite-plugin-cesium handles this
  },
  server: {
    port: 5173,
    host: true,
    open: true,  // 启动后自动打开浏览器
    cors: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // cesium is handled by vite-plugin-cesium
        }
      }
    }
  },
  // Ensure proper handling of static assets
  assetsInclude: ['**/*.gltf', '**/*.glb', '**/*.jpg', '**/*.png', '**/*.json']
}) 