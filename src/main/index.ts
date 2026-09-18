import { app, BrowserWindow } from 'electron'
import * as path from 'path'

import { startBackupTimer } from './backup'
import { startClipboardMonitor } from './services'
import { registerIpcHandlers } from './ipc/index'
import { loadStore } from './storage'
import {
  createWindow,
  focusMainWindow,
  getMainWindow,
  setAppQuitting,
  initTray,
  registerGlobalShortcuts,
  destroyTray,
} from './core'

// Flag para controlar quando o app está saindo de verdade
let isQuitting = false

if (!app.isPackaged) {
  try {
    require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') })
  } catch {
    // Ignora ausencia do dotenv em ambientes sem arquivo local.
  }
}

const isDevMode = !app.isPackaged
if (isDevMode) {
  const devName = `${app.getName()} Dev`
  app.setName(devName)
  app.setPath('userData', path.join(app.getPath('appData'), devName))
}

app.setAppUserModelId(isDevMode ? 'com.organon.dev' : 'com.organon')

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    const mainWindow = getMainWindow()
    if (!mainWindow || mainWindow.isDestroyed()) {
      createWindow()
      return
    }

    focusMainWindow()
  })
}

app.whenReady().then(() => {
  registerIpcHandlers()
  createWindow()

  // Inicializar System Tray
  initTray()
  registerGlobalShortcuts()

  startClipboardMonitor(() => getMainWindow())

  try {
    const store = loadStore()
    const backupEnabled = store.settings.backupEnabled ?? false
    const backupInterval = store.settings.backupIntervalMinutes ?? 15
    if (backupEnabled && backupInterval > 0) {
      startBackupTimer(backupInterval)
    }
  } catch {
    // Ignora erros ao carregar configuracoes.
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  // Não quit no Windows - fica no tray
  if (process.platform === 'darwin') {
    // No Mac, permite minimizar para tray
  }
})

// Sair apenas via tray menu ou Cmd+Q no Mac
app.on('before-quit', () => {
  // Marca que está saindo de verdade
  setAppQuitting(true)
  // Limpa tray ao sair
  destroyTray()
})
