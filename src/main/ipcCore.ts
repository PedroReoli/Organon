import { app, clipboard, ipcMain, shell } from 'electron'
import * as fs from 'fs'
import * as path from 'path'

import { startBackupTimer, stopBackupTimer } from './backup'
import {
  copyDirMerge,
  ensureDataDir,
  ensureFilesDir,
  ensureNotesDir,
  getConfig,
  getDataPath,
  getDefaultDataPath,
  setConfig,
} from './filesystem'
import { getDefaultStore, loadStore, loadStoreFromPath, normalizeStore, saveStore, saveStoreToPath } from './store'
import type { Store, ThemeName } from './types'
import { getMainWindow, openDirectoryPicker, openFolderPicker } from './window'

export const registerCoreIpcHandlers = (): void => {
  ipcMain.handle('store:load', () => {
    return loadStore()
  })

  ipcMain.handle('store:save', (_event, store: Store) => {
    const normalized = normalizeStore(store)
    const saved = saveStore(normalized)
    const settings = normalized.settings
    const backupEnabled = settings.backupEnabled ?? false
    const backupInterval = settings.backupIntervalMinutes ?? 15

    if (backupEnabled && backupInterval > 0) {
      startBackupTimer(backupInterval)
    } else {
      stopBackupTimer()
    }

    return saved
  })

  ipcMain.handle('external:open', (_event, url: string) => {
    return shell.openExternal(url).then(() => true).catch(() => false)
  })

  ipcMain.handle('path:open', (_event, targetPath: string) => {
    return shell.openPath(targetPath).then(result => result === '')
  })

  ipcMain.handle('path:select', async () => {
    return openFolderPicker()
  })

  ipcMain.handle('path:readdir', (_event, dirPath: string) => {
    try {
      if (!dirPath) return []
      if (!fs.existsSync(dirPath)) return []
      const stat = fs.statSync(dirPath)
      if (!stat.isDirectory()) return []
      const entries = fs.readdirSync(dirPath, { withFileTypes: true })
      return entries
        .map(entry => ({
          name: entry.name,
          isDirectory: entry.isDirectory(),
          isFile: entry.isFile(),
        }))
        .sort((a, b) => {
          if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
          return a.name.localeCompare(b.name)
        })
    } catch {
      return []
    }
  })

  ipcMain.handle('path:rename', (_event, oldPath: string, newPath: string) => {
    try {
      if (!oldPath || !newPath) return false
      if (!fs.existsSync(oldPath)) return false
      fs.renameSync(oldPath, newPath)
      return true
    } catch {
      return false
    }
  })

  ipcMain.handle('path:getFileUrl', (_event, absolutePath: string) => {
    if (!absolutePath) return ''
    const normalized = absolutePath.replace(/\\/g, '/')
    return `file:///${normalized}`
  })

  ipcMain.handle('clipboard:write', (_event, text: string) => {
    clipboard.writeText(text)
    return true
  })

  ipcMain.handle('data:getDir', () => {
    const config = getConfig()
    return {
      current: getDataPath(),
      custom: config.dataDir,
    }
  })

  ipcMain.handle('data:setDir', (_event, nextDir: string | null) => {
    const currentConfig = getConfig()
    const currentPath = getDataPath()
    const currentStore = loadStoreFromPath(currentPath)
    const normalized = nextDir && nextDir.trim().length > 0 ? nextDir.trim() : null
    const nextPath = normalized ? normalized : getDefaultDataPath()

    if (currentPath === nextPath) {
      setConfig({ ...currentConfig, dataDir: normalized })
      return true
    }

    ensureDataDir(nextPath)
    const storeOk = saveStoreToPath(currentStore, nextPath)
    if (!storeOk) return false

    copyDirMerge(path.join(currentPath, 'notes'), path.join(nextPath, 'notes'))
    copyDirMerge(path.join(currentPath, 'files'), path.join(nextPath, 'files'))

    setConfig({ ...currentConfig, dataDir: normalized })
    return true
  })

  ipcMain.handle('data:selectDir', async () => {
    return openDirectoryPicker()
  })

  ipcMain.handle('window:minimize', () => {
    getMainWindow()?.minimize()
  })

  ipcMain.handle('window:maximize', () => {
    const mainWindow = getMainWindow()
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow?.maximize()
    }
  })

  ipcMain.handle('window:close', () => {
    getMainWindow()?.close()
  })

  ipcMain.handle('window:isMaximized', () => {
    return getMainWindow()?.isMaximized() ?? false
  })

  ipcMain.handle('app:isPackaged', () => {
    return app.isPackaged
  })

  ipcMain.handle('app:isInstallerCompleted', () => {
    return getConfig().installerCompleted
  })

  ipcMain.handle('app:completeInstaller', (_event, dataDir: string | null, themeName: ThemeName) => {
    try {
      const config = getConfig()
      config.dataDir = dataDir
      config.installerCompleted = true
      setConfig(config)

      const basePath = dataDir ?? getDefaultDataPath()
      ensureDataDir(basePath)
      ensureNotesDir(basePath)
      ensureFilesDir(basePath)

      const store = getDefaultStore()
      store.settings.themeName = themeName
      store.settings.dataDir = dataDir
      store.settings.installerCompleted = true
      saveStoreToPath(store, basePath)

      return { success: true }
    } catch (error) {
      console.error('Erro no instalador:', error)
      return { success: false, error: String(error) }
    }
  })
}
