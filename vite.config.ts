import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const devServerUrl = env.VITE_DEV_SERVER_URL || 'http://localhost:5173'
  let devServerPort = 5173

  try {
    devServerPort = Number(new URL(devServerUrl).port) || devServerPort
  } catch {
    // Mantem porta padrao se a URL for invalida
  }

  return {
    plugins: [react()],
    root: 'src/renderer',
    base: './',
    build: {
      outDir: '../../dist/renderer',
      emptyOutDir: true,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src/renderer'),
      },
    },
    server: {
      port: devServerPort,
      strictPort: true,
    },
  }
})
