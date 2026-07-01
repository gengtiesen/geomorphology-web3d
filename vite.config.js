import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import cesium from 'vite-plugin-cesium'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), cesium()],
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