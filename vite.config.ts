import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { readFileSync, writeFileSync, unlinkSync } from 'fs'

const pkg = JSON.parse(readFileSync(path.join(__dirname, 'package.json'), 'utf-8')) as { version: string }

const devServerUrlSyncPlugin = {
  name: 'organon-dev-port-sync',
  configureServer(server: any) {
    server.httpServer?.once('listening', () => {
      const address = server.httpServer?.address()
      if (address && typeof address === 'object') {
        const port = address.port
        const url = `http://localhost:${port}`
        try {
          writeFileSync(path.join(__dirname, '.dev-server-url'), url, 'utf-8')
        } catch {}
      }
    })
    server.httpServer?.once('close', () => {
      try {
        unlinkSync(path.join(__dirname, '.dev-server-url'))
      } catch {}
    })
  },
}

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
    plugins: [react(), devServerUrlSyncPlugin],
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
    },
    root: 'src/renderer',
    envDir: path.resolve(__dirname), // lê .env da raiz do projeto, não de src/renderer
    base: './',
    build: {
      outDir: '../../dist/renderer',
      emptyOutDir: true,
      sourcemap: false,
      // Sub-upgrade 07-C: code splitting via manualChunks.
      // Separa libs pesadas do bundle inicial. Cada chunk vira load assincrono
      // quando o codigo que importa ele e finalmente avaliado.
      rollupOptions: {
        input: { main: path.resolve(__dirname, 'src/renderer/index.html'), whisper: path.resolve(__dirname, 'src/renderer/super-whisper.html') },
        output: {
          manualChunks(id) {
            const modulePath = id.replaceAll('\\', '/')
            const isPackage = (packageName: string) =>
              modulePath.includes(`/node_modules/${packageName}/`)

            // Capture internal CommonJS files too, not only package entries.
            // This keeps the React runtime out of feature chunks and prevents
            // bootstrap cycles such as Radix -> Tiptap -> Radix.
            if ([
              'react',
              'react-dom',
              'react-is',
              'scheduler',
              'use-sync-external-store',
            ].some(isPackage)) {
              return 'react-vendor'
            }

            // Assign only the public entries. Their internal dynamic imports
            // must remain split instead of being folded into one huge chunk.
            if (modulePath.endsWith('/node_modules/@excalidraw/excalidraw/dist/prod/index.js')) {
              return 'excalidraw'
            }
            if (modulePath.endsWith('/node_modules/mermaid/dist/mermaid.core.mjs')) {
              return 'mermaid'
            }

            if (isPackage('@tiptap') || modulePath.includes('/node_modules/prosemirror-')) {
              return 'tiptap'
            }
            if (isPackage('katex')) return 'katex'
            if (isPackage('jspdf') || isPackage('html2canvas')) return 'pdf'
            if (isPackage('@radix-ui')) return 'radix-ui'
            if (isPackage('@dnd-kit')) return 'dnd-kit'

            return undefined
          },
        },
      },
      // Aumentar limite de warning (esses chunks sao deliberadamente grandes
      // mas isolados em manualChunks, entao nao precisam aviso)
      chunkSizeWarningLimit: 800,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src/renderer'),
        '@shared': path.resolve(__dirname, './src/renderer/pages/shared'),
        '@shared/components': path.resolve(__dirname, './src/renderer/pages/shared/components'),
        '@shared/components/primitives': path.resolve(__dirname, './src/renderer/pages/shared/components/primitives'),
        '@shared/components/display': path.resolve(__dirname, './src/renderer/pages/shared/components/display'),
        '@shared/hooks': path.resolve(__dirname, './src/renderer/pages/shared/hooks'),
        '@shared/utils': path.resolve(__dirname, './src/renderer/pages/shared/utils'),
        '@shared/modals': path.resolve(__dirname, './src/renderer/pages/shared/modals'),
        '@types': path.resolve(__dirname, './src/renderer/types'),
        '@utils': path.resolve(__dirname, './src/renderer/utils'),
        '@hooks': path.resolve(__dirname, './src/renderer/hooks'),
        '@config': path.resolve(__dirname, './src/renderer/config'),
        '@api': path.resolve(__dirname, './src/api'),
        '@pages': path.resolve(__dirname, './src/renderer/pages'),
        '@Dashboard': path.resolve(__dirname, './src/renderer/pages/DashboardPage'),
        '@Calendar': path.resolve(__dirname, './src/renderer/pages/CalendarPage'),
        '@CRM': path.resolve(__dirname, './src/renderer/pages/CRMPage'),
        '@Financial': path.resolve(__dirname, './src/renderer/pages/FinancialPage'),
        '@Shortcuts': path.resolve(__dirname, './src/renderer/pages/ShortcutsPage'),
        '@Clipboard': path.resolve(__dirname, './src/renderer/pages/ClipboardPage'),
        '@Notes': path.resolve(__dirname, './src/renderer/pages/NotesPage'),
        '@Settings': path.resolve(__dirname, './src/renderer/pages/SettingsPage'),
        '@Habits': path.resolve(__dirname, './src/renderer/pages/HabitsPage'),
        '@Study': path.resolve(__dirname, './src/renderer/pages/StudyPage'),
        '@Playbook': path.resolve(__dirname, './src/renderer/pages/PlaybookPage'),
        '@Projects': path.resolve(__dirname, './src/renderer/pages/ProjectsPage'),
        '@Canvas': path.resolve(__dirname, './src/renderer/pages/CanvasPage'),
      },
    },
    server: {
      port: devServerPort,
      strictPort: false,
      host: true,
      hmr: {
        overlay: true,
      },
      watch: {
        usePolling: true,
        interval: 100,
      },
    },
  }
})
