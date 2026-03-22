import { app, BrowserWindow } from 'electron'
import * as path from 'path'
import { registerIpcHandlers } from './ipc'
import { createWindow, getMainWindow } from './window'

const isDevMode = !app.isPackaged
if (isDevMode) {
  app.setName('Organon Manager Dev')
  app.setPath('userData', path.join(app.getPath('appData'), 'Organon Manager Dev'))
}

app.setAppUserModelId(isDevMode ? 'com.organon.manager.dev' : 'com.organon.manager')

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    const win = getMainWindow()
    if (!win || win.isDestroyed()) {
      createWindow()
      return
    }
    if (win.isMinimized()) win.restore()
    win.focus()
  })
}

app.whenReady().then(() => {
  registerIpcHandlers()
  createWindow()

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
