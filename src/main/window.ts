import { app, BrowserWindow, dialog } from 'electron'
import type { OpenDialogOptions } from 'electron'
import * as fs from 'fs'
import * as path from 'path'

let mainWindow: BrowserWindow | null = null

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

export const createWindow = (): void => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    focusMainWindow()
    return
  }

  let iconPath: string | undefined
  if (app.isPackaged) {
    iconPath = path.join(process.resourcesPath, 'app', 'dist', 'renderer', 'images', 'logo.png')
  } else {
    const devPaths = [
      path.join(__dirname, '..', 'renderer', 'images', 'logo.png'),
      path.join(process.cwd(), 'src', 'renderer', 'images', 'logo.png'),
      path.join(__dirname, '..', '..', 'src', 'renderer', 'images', 'logo.png'),
    ]

    for (const devPath of devPaths) {
      if (fs.existsSync(devPath)) {
        iconPath = devPath
        break
      }
    }

    if (!iconPath) {
      console.warn('Icone nao encontrado em desenvolvimento. Isso e normal e aparecera corretamente no app empacotado.')
    }
  }

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    frame: false,
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: 'Organon',
    backgroundColor: '#0f172a',
    show: false,
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  if (!app.isPackaged) {
    const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173'
    mainWindow.loadURL(devServerUrl)
    if (process.env.ELECTRON_DEVTOOLS === '1') {
      mainWindow.webContents.openDevTools()
    }
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
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
