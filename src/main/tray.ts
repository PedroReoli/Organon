import { app, Tray, Menu, nativeImage, BrowserWindow, globalShortcut, ipcMain, screen } from 'electron'
import type { NativeImage } from 'electron'
import * as path from 'path'
import * as fs from 'fs'
import { getMainWindow } from './window'
import { loadStore } from './store'

let tray: Tray | null = null
let superWhisperWindow: BrowserWindow | null = null

// Callbacks para comunicação com renderer
let onQuickTranscribeCallback: (() => void) | null = null
let onOpenAppCallback: (() => void) | null = null

export const getTray = (): Tray | null => tray

// Temas disponíveis (espelha THEMES de types/index.ts do renderer).
// Mantém o popup independente de carregar o módulo completo.
const THEMES: Record<string, { primary: string; background: string; surface: string; text: string }> = {
  'dark-default': { primary: '#6366f1', background: '#0f172a', surface: '#1e293b', text: '#f1f5f9' },
  'dark-vscode': { primary: '#007acc', background: '#1e1e1e', surface: '#252526', text: '#d4d4d4' },
  'light-1': { primary: '#3b82f6', background: '#f8fafc', surface: '#ffffff', text: '#0f172a' },
  'light-2': { primary: '#6366f1', background: '#fafafa', surface: '#ffffff', text: '#18181b' },
  'dark-matcha': { primary: '#84cc16', background: '#1a2e05', surface: '#2d4a0e', text: '#ecfccb' },
  'light-rose': { primary: '#f43f5e', background: '#fff1f2', surface: '#ffffff', text: '#881337' },
  'dark-cyberpunk': { primary: '#f0f', background: '#0a0014', surface: '#1a0033', text: '#00fff0' },
  'dark-purple-neon': { primary: '#c026d3', background: '#0f0019', surface: '#1a0d2e', text: '#f5d0fe' },
  'light-orange-soft': { primary: '#f97316', background: '#fffbeb', surface: '#ffffff', text: '#7c2d12' },
  'dark-blue-professional': { primary: '#3b82f6', background: '#0c1e3d', surface: '#16315c', text: '#dbeafe' },
  'light-matcha-soft': { primary: '#65a30d', background: '#f7fee7', surface: '#ffffff', text: '#365314' },
  'dark-graphite-minimal': { primary: '#a3a3a3', background: '#0a0a0a', surface: '#171717', text: '#e5e5e5' },
  'light-ice-blue': { primary: '#0284c7', background: '#f0f9ff', surface: '#ffffff', text: '#0c4a6e' },
  'dark-deep-red': { primary: '#dc2626', background: '#1c0a0a', surface: '#2d0d0d', text: '#fecaca' },
  'dark-solarized-dark': { primary: '#268bd2', background: '#002b36', surface: '#073642', text: '#93a1a1' },
  'light-solarized-light': { primary: '#268bd2', background: '#fdf6e3', surface: '#eee8d5', text: '#073642' },
  'dark-forest': { primary: '#22c55e', background: '#0a1f0a', surface: '#14301b', text: '#dcfce7' },
  'dark-midnight-pink': { primary: '#ec4899', background: '#1a0d1f', surface: '#2d1a3a', text: '#fbcfe8' },
  'dark-dracula': { primary: '#bd93f9', background: '#282a36', surface: '#44475a', text: '#f8f8f2' },
  'dark-dracula-yellow': { primary: '#f1fa8c', background: '#282a36', surface: '#44475a', text: '#f8f8f2' },
}

export const getSuperWhisperWindow = (): BrowserWindow | null => superWhisperWindow

/**
 * Cria um ícone profissional para o tray
 * Usa o PNG customizado do Organon se existir, senão gera fallback
 */
function createTrayIcon(): NativeImage {
  // Caminhos candidatos para o ícone PNG (gerado pelo gen-icon.js).
  // A fonte da verdade em dev é `src/renderer/public/super-whisper/tray-icon.png`.
  // Em packaged o Vite copia `public/` para `dist/renderer/`.
  const iconPaths = [
    path.join(app.getAppPath(), 'dist', 'renderer', 'images', 'favicon.png'),
    path.join(app.getAppPath(), 'src', 'renderer', 'images', 'favicon.png'),
    path.join(app.getAppPath(), 'public', 'favicon.png'),
    path.join(process.resourcesPath || '', 'app', 'dist', 'renderer', 'images', 'favicon.png'),
    path.join(app.getAppPath(), 'dist', 'renderer', 'super-whisper', 'tray-icon.png'),
  ]

  for (const iconPath of iconPaths) {
    if (fs.existsSync(iconPath)) {
      return nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })
    }
  }

  // Fallback: ícone gerado por código (gradiente roxo com O)
  const size = 16
  const buf = Buffer.alloc(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const t = (x + y) / (size * 2)
      const r = Math.round(99 + (139 - 99) * t)
      const g = Math.round(102 + (92 - 102) * t)
      const b = Math.round(241 + (246 - 241) * t)
      const i = (y * size + x) * 4
      buf[i] = r
      buf[i + 1] = g
      buf[i + 2] = b
      buf[i + 3] = 255
    }
  }
  return nativeImage.createFromBuffer(buf, { width: size, height: size })
}

/**
 * Cria o menu de contexto do tray
 */
function createTrayMenu(): Menu {
  return Menu.buildFromTemplate([
    {
      label: 'Super Whisper',
      click: () => showSuperWhisperWindow(),
    },
    {
      label: 'Transcrição Rápida',
      accelerator: 'CmdOrCtrl+Shift+V',
      click: () => {
        if (onQuickTranscribeCallback) {
          onQuickTranscribeCallback()
        } else {
          showSuperWhisperWindow()
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Abrir Organon',
      click: () => {
        if (onOpenAppCallback) {
          onOpenAppCallback()
        }
        const mainWindow = BrowserWindow.getAllWindows()[0]
        if (mainWindow) {
          mainWindow.show()
          mainWindow.focus()
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Sair',
      click: () => {
        app.quit()
      },
    },
  ])
}

/**
 * Cria a janela do Super Whisper (popup flutuante)
 */
export function createSuperWhisperWindow(): BrowserWindow {
  if (superWhisperWindow && !superWhisperWindow.isDestroyed()) {
    superWhisperWindow.show()
    superWhisperWindow.focus()
    return superWhisperWindow
  }

  superWhisperWindow = new BrowserWindow({
    width: 420,
    height: 420,
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  // Posição: canto inferior direito (respeitando offset da taskbar)
  const primaryDisplay = screen.getPrimaryDisplay()
  const { x: workX, y: workY, width: workW, height: workH } = primaryDisplay.workArea

  superWhisperWindow.setPosition(
    workX + workW - 440,   // 420 width + 20 margin
    workY + workH - 440    // 420 height + 20 margin
  )

  // Carrega a página do Super Whisper
  if (app.isPackaged) {
    // Em packaged, super-whisper.html é copiado para dist/renderer/super-whisper/
    superWhisperWindow.loadFile(
      path.join(__dirname, '..', 'renderer', 'super-whisper.html')
    )
  } else {
    // Em dev, Vite serve src/renderer/public em / via publicDir default
    const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173'
    superWhisperWindow.loadURL(`${devServerUrl}/super-whisper.html`)
  }

  superWhisperWindow.once('ready-to-show', () => superWhisperWindow?.showInactive())

  superWhisperWindow.on('closed', () => {
    superWhisperWindow = null
  })

  return superWhisperWindow
}

/**
 * Mostra/esconde a janela do Super Whisper
 */
export function showSuperWhisperWindow(): void {
  if (!superWhisperWindow || superWhisperWindow.isDestroyed()) {
    const win = createSuperWhisperWindow()
    win.webContents.once('did-finish-load', () => win.webContents.send('super-whisper:toggle-recording'))
  } else {
    superWhisperWindow.showInactive()
    superWhisperWindow.webContents.send('super-whisper:toggle-recording')
  }
}

/**
 * Esconde a janela do Super Whisper
 */
export function hideSuperWhisperWindow(): void {
  if (superWhisperWindow && !superWhisperWindow.isDestroyed()) {
    superWhisperWindow.hide()
  }
}

/**
 * Inicializa o System Tray
 */
export function initTray(): void {
  if (tray) return

  const icon = createTrayIcon()
  tray = new Tray(icon)
  tray.setToolTip('Organon - Assistente de IA')
  tray.setContextMenu(createTrayMenu())

  // Clique único: abre menu
  tray.on('click', () => {
    const mainWindow = BrowserWindow.getAllWindows()[0]
    if (mainWindow) {
      mainWindow.show()
      mainWindow.focus()
    }
  })

  // Clique direito: mostra menu
  tray.on('right-click', () => {
    tray?.popUpContextMenu(createTrayMenu())
  })

  console.log('[Tray] System Tray inicializado')
}

/**
 * Registra atalhos globais
 */
export function registerGlobalShortcuts(): void {
  // Super Whisper: Ctrl+Shift+V
  globalShortcut.register('CommandOrControl+Shift+V', () => {
    console.log('[Shortcut] Super Whisper (Ctrl+Shift+V) ativado')
    showSuperWhisperWindow()
  })

  // Super Whisper: Alt+V
  globalShortcut.register('Alt+V', () => {
    console.log('[Shortcut] Super Whisper (Alt+V) ativado')
    showSuperWhisperWindow()
  })

  // Super Whisper: Ctrl+Shift+Space
  globalShortcut.register('CommandOrControl+Shift+Space', () => {
    console.log('[Shortcut] Super Whisper (Ctrl+Shift+Space) ativado')
    showSuperWhisperWindow()
  })

  console.log('[Tray] Atalhos globais (Ctrl+Shift+V, Alt+V, Ctrl+Shift+Space) registrados com sucesso')
}

/**
 * Define callbacks para ações do tray
 */
export function setTrayCallbacks(callbacks: {
  onQuickTranscribe?: () => void
  onOpenApp?: () => void
}): void {
  if (callbacks.onQuickTranscribe) {
    onQuickTranscribeCallback = callbacks.onQuickTranscribe
  }
  if (callbacks.onOpenApp) {
    onOpenAppCallback = callbacks.onOpenApp
  }
}

/**
 * Destrói o tray ao fechar
 */
export function destroyTray(): void {
  if (tray) {
    tray.destroy()
    tray = null
  }
  globalShortcut.unregisterAll()
}

/**
 * Registra handlers IPC para o Super Whisper
 */
export function registerSuperWhisperIpc(): void {
  ipcMain.handle('super-whisper:show', () => {
    showSuperWhisperWindow()
  })

  ipcMain.handle('super-whisper:hide', () => {
    hideSuperWhisperWindow()
  })

  ipcMain.handle('super-whisper:toggle', () => {
    showSuperWhisperWindow()
  })

  ipcMain.handle('super-whisper:is-open', () => {
    return superWhisperWindow !== null && !superWhisperWindow.isDestroyed() && superWhisperWindow.isVisible()
  })

  // Enviar transcrição para a janela principal
  ipcMain.handle('super-whisper:send', async (_event, text: string) => {
    const mainWindow = getMainWindow()

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('super-whisper:transcription', text)
      return true
    }
    return false
  })

  // Fornece o tema atual para o popup do Super Whisper (sincronização de tema).
  ipcMain.handle('super-whisper:get-theme', () => {
    try {
      const store = loadStore()
      const themeName = store.settings?.themeName
      if (themeName && THEMES[themeName]) {
        return THEMES[themeName]
      }
    } catch (err) {
      console.warn('[IPC] Falha ao carregar tema para Super Whisper:', err)
    }
    // Fallback: dark-default
    return THEMES['dark-default']
  })

  console.log('[IPC] Handlers do Super Whisper registrados')
}
