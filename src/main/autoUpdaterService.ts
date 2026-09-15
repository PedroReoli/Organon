import { ipcMain, app } from 'electron'
import { createBackup } from './backup'
import { getDataPath } from './filesystem'
import { getMainWindow } from './window'

let autoUpdaterInstance: any = null

function getAutoUpdater() {
  if (!autoUpdaterInstance) {
    const { autoUpdater } = require('electron-updater')
    autoUpdater.autoDownload = false
    autoUpdater.autoInstallOnAppQuit = true

    autoUpdater.on('download-progress', (progressObj: any) => {
      const win = getMainWindow()
      if (win && !win.isDestroyed()) {
        win.webContents.send('updater:download-progress', {
          percent: Math.round(progressObj.percent),
          bytesPerSecond: progressObj.bytesPerSecond,
          transferred: progressObj.transferred,
          total: progressObj.total,
        })
      }
    })

    autoUpdater.on('update-downloaded', (info: any) => {
      const win = getMainWindow()
      if (win && !win.isDestroyed()) {
        win.webContents.send('updater:downloaded', info)
      }
    })

    autoUpdaterInstance = autoUpdater
  }
  return autoUpdaterInstance
}

export function registerAutoUpdaterIpc(): void {
  // 1. Verificar se existe nova versão
  ipcMain.handle('updater:check', async () => {
    try {
      if (!app.isPackaged) {
        return {
          isDev: true,
          updateAvailable: false,
          currentVersion: app.getVersion(),
        }
      }

      const updater = getAutoUpdater()
      const result = await updater.checkForUpdates()
      const updateInfo = result?.updateInfo
      const isNewer = updateInfo ? updateInfo.version !== app.getVersion() : false

      return {
        updateAvailable: isNewer,
        updateInfo: updateInfo || null,
        currentVersion: app.getVersion(),
      }
    } catch (err: any) {
      return {
        updateAvailable: false,
        error: err.message || 'Erro ao verificar atualizações.',
        currentVersion: app.getVersion(),
      }
    }
  })

  // 2. Baixar a atualização com BACKUP PREVENTIVO dos dados
  ipcMain.handle('updater:download', async () => {
    try {
      // GARANTIA MEGA SEGURA: Backup preventivo de toda a pasta userData antes de baixar/aplicar
      try {
        createBackup(getDataPath(), 'pre-update')
      } catch (backupErr) {
        console.warn('Aviso: Falha ao gerar backup pré-update, continuando...', backupErr)
      }

      if (!app.isPackaged) {
        return { success: false, error: 'Modo dev: download de update desativado.' }
      }

      const updater = getAutoUpdater()
      await updater.downloadUpdate()
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message || 'Erro ao baixar atualização.' }
    }
  })

  // 3. Instalar e reiniciar o app
  ipcMain.handle('updater:install', async () => {
    if (app.isPackaged) {
      const updater = getAutoUpdater()
      updater.quitAndInstall(false, true)
    }
    return { success: true }
  })
}
