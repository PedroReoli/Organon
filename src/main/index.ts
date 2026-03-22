import { app, BrowserWindow } from 'electron'
import * as path from 'path'

import { startBackupTimer } from './backup'
import { registerIpcHandlers } from './ipc'
import { loadStore } from './store'
import { createWindow, focusMainWindow, getMainWindow } from './window'

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

app.setAppUserModelId(isDevMode ? 'com.organizador.semanal.dev' : 'com.organizador.semanal')

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
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
