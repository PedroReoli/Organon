import { ipcMain, app } from 'electron'
import { createPreUpdateBackup } from '../backup/backupService'
import { getDataPath } from '../storage/filesystem'
import { getMainWindow } from './window'

let autoUpdaterInstance: any = null

type UpdateChannel = 'stable' | 'canary'

function getUpdateChannel(): UpdateChannel {
  const configured = process.env.ORGANON_UPDATE_CHANNEL
  if (configured === 'canary' || configured === 'stable') return configured
  return /-canary\.\d+$/.test(app.getVersion()) ? 'canary' : 'stable'
}

function getAutoUpdater() {
  if (!autoUpdaterInstance) {
    const { autoUpdater } = require('electron-updater')
    const channel = getUpdateChannel()
    autoUpdater.autoDownload = false
    autoUpdater.autoInstallOnAppQuit = true
    autoUpdater.channel = channel
    autoUpdater.allowPrerelease = channel === 'canary'
    autoUpdater.allowDowngrade = false

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
          channel: getUpdateChannel(),
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
        channel: getUpdateChannel(),
      }
    } catch (err: any) {
      return {
        updateAvailable: false,
        error: err.message || 'Erro ao verificar atualizações.',
        currentVersion: app.getVersion(),
        channel: getUpdateChannel(),
      }
    }
  })

  // 2. Baixar a atualização com BACKUP PREVENTIVO dos dados
  ipcMain.handle('updater:download', async () => {
    try {
      if (!app.isPackaged) {
        return { success: false, error: 'Modo dev: download de update desativado.' }
      }

      const backup = createPreUpdateBackup(getDataPath())
      if (!backup.success) {
        console.error('Atualizacao cancelada: backup preventivo invalido.', backup.error)
        return {
          success: false,
          error: `Atualizacao cancelada: ${backup.error ?? 'falha no backup preventivo.'}`,
        }
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
