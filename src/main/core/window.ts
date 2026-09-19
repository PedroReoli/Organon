import { app, BrowserWindow, dialog, desktopCapturer, session } from 'electron'
import type { OpenDialogOptions } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { getDevServerUrl } from './devServerUrl'

let mainWindow: BrowserWindow | null = null

// Configura permissões globais de mídia e reconhecimento de voz no Electron
app.whenReady().then(() => {
  if (session.defaultSession) {
    session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
      callback(true)
    })
    session.defaultSession.setPermissionCheckHandler(() => {
      return true
    })
    session.defaultSession.setDisplayMediaRequestHandler((_request, callback) => {
      desktopCapturer.getSources({ types: ['screen'] }).then((sources) => {
        const videoSource = sources[0]
        if (!videoSource) {
          callback({})
          return
        }

        callback({
          video: videoSource,
          ...(process.platform === 'win32' ? { audio: 'loopback' as const } : {}),
        })
      }).catch(() => callback({}))
    })
  }
})

export const getMainWindow = (): BrowserWindow | null => {
  return mainWindow
}

export const focusMainWindow = (): void => {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore()
  }

  mainWindow.show()
  mainWindow.focus()
}

// Flag para controlar quit
let appQuitting = false

export const isAppQuitting = (): boolean => appQuitting

export const setAppQuitting = (value: boolean): void => {
  appQuitting = value
}

export const createWindow = (): void => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    focusMainWindow()
    return
  }

  const appRoot = app.getAppPath ? app.getAppPath() : process.cwd()

  let iconPath: string | undefined
  const possiblePaths = [
    path.join(__dirname, '..', 'renderer', 'images', 'logo.png'),
    path.join(__dirname, '..', '..', 'renderer', 'images', 'logo.png'),
    path.join(appRoot, 'src', 'renderer', 'images', 'logo.png'),
    path.join(appRoot, 'src', 'renderer', 'images', 'favicon.png'),
    path.join(process.resourcesPath, 'app', 'src', 'renderer', 'images', 'logo.png'),
    path.join(process.resourcesPath, 'app.asar', 'src', 'renderer', 'images', 'logo.png'),
    path.join(appRoot, 'public', 'favicon.png'),
  ]

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      iconPath = p
      break
    }
  }

  if (!iconPath) {
    console.warn('Icone da janela nao encontrado nas rotas especificadas.')
  }

  const preloadCandidates = [
    path.join(__dirname, '..', 'preload', 'index.js'),
    path.join(__dirname, '..', '..', 'preload', 'index.js'),
    path.join(appRoot, 'dist', 'preload', 'index.js'),
  ]
  const resolvedPreload = preloadCandidates.find(p => fs.existsSync(p)) || preloadCandidates[0]

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 400,
    minHeight: 250,
    frame: false,
    icon: iconPath,
    webPreferences: {
      preload: resolvedPreload,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    title: 'Organon',
    backgroundColor: '#0f172a',
    show: false,
  })

  // Hardening: Previne abertura arbitrária de janelas internas/popups
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsed = new URL(url)
      // Permite apenas protocolos seguros no navegador padrão do sistema
      if (['http:', 'https:', 'mailto:'].includes(parsed.protocol)) {
        import('electron').then(({ shell }) => shell.openExternal(url))
      }
    } catch {
      // URL inválida descartada silenciosamente
    }
    return { action: 'deny' }
  })

  // Hardening: Bloqueia navegação da janela principal para páginas externas
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const isDev = !app.isPackaged && url.startsWith('http://localhost')
    if (!isDev && !url.startsWith('file://')) {
      event.preventDefault()
      try {
        const parsed = new URL(url)
        if (['http:', 'https:', 'mailto:'].includes(parsed.protocol)) {
          import('electron').then(({ shell }) => shell.openExternal(url))
        }
      } catch {
        // ignora
      }
    }
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  if (!app.isPackaged) {
    const devServerUrl = getDevServerUrl()
    mainWindow.loadURL(devServerUrl)
    if (process.env.ELECTRON_DEVTOOLS === '1') {
      mainWindow.webContents.openDevTools()
    }
    // F12 abre/fecha DevTools apenas em desenvolvimento
    mainWindow.webContents.on('before-input-event', (_event, input) => {
      if (input.type === 'keyDown' && input.key === 'F12') {
        if (mainWindow?.webContents.isDevToolsOpened()) {
          mainWindow.webContents.closeDevTools()
        } else {
          mainWindow?.webContents.openDevTools()
        }
      }
    })
  } else {
    const htmlCandidates = [
      path.join(__dirname, '..', 'renderer', 'index.html'),
      path.join(__dirname, '..', '..', 'renderer', 'index.html'),
      path.join(appRoot, 'dist', 'renderer', 'index.html'),
    ]
    const resolvedHtml = htmlCandidates.find(p => fs.existsSync(p)) || htmlCandidates[0]
    mainWindow.loadFile(resolvedHtml)
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Esconde em vez de fechar quando clicar no X
  mainWindow.on('close', (event) => {
    if (!appQuitting) {
      event.preventDefault()
      mainWindow?.hide()
    }
  })
}

export const showOpenDialog = async (options: OpenDialogOptions) => {
  const focused = BrowserWindow.getFocusedWindow() ?? mainWindow
  return focused
    ? dialog.showOpenDialog(focused, options)
    : dialog.showOpenDialog(options)
}

export const openDirectoryPicker = async (): Promise<string | null> => {
  const result = await showOpenDialog({
    title: 'Selecionar pasta de dados',
    properties: ['openDirectory', 'createDirectory'],
  })

  if (result.canceled || result.filePaths.length === 0) {
    return null
  }

  return result.filePaths[0]
}

export const openFolderPicker = async (): Promise<string | null> => {
  const result = await showOpenDialog({
    title: 'Selecionar pasta',
    properties: ['openDirectory'],
  })

  if (result.canceled || result.filePaths.length === 0) {
    return null
  }

  return result.filePaths[0]
}
