import { ipcMain } from 'electron'
import { startLocalSyncServer, stopLocalSyncServer, getLocalSyncStatus } from './localSyncServer'

export function registerLocalSyncIpc(): void {
  ipcMain.handle('local-sync:start', async (_event, port?: number) => {
    return await startLocalSyncServer(port || 8765)
  })

  ipcMain.handle('local-sync:stop', async () => {
    return stopLocalSyncServer()
  })

  ipcMain.handle('local-sync:status', async () => {
    return getLocalSyncStatus()
  })
}
