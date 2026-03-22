import { ipcMain, shell } from 'electron'

import {
  createBackup,
  listBackups,
  mergeDataFromOldPath,
  restoreBackup,
} from './backup'
import { importMarkdownsFromDir, importPlanningDataFromFile } from './backupImports'
import { ensureBackupDir, getBackupDir, getDataPath } from './filesystem'
import { showOpenDialog } from './window'

export const registerBackupIpcHandlers = (): void => {
  ipcMain.handle('backup:create', () => {
    return createBackup(getDataPath())
  })

  ipcMain.handle('backup:list', () => {
    return listBackups(getDataPath())
  })

  ipcMain.handle('backup:openDir', () => {
    const dataPath = getDataPath()
    ensureBackupDir(dataPath)
    const backupDir = getBackupDir(dataPath)
    return shell.openPath(backupDir).then(result => result === '')
  })

  ipcMain.handle('backup:restore', (_event, backupPath: string) => {
    return restoreBackup(backupPath, getDataPath())
  })

  ipcMain.handle('backup:mergeFromPath', async (_event, oldDataPath: string) => {
    return mergeDataFromOldPath(oldDataPath, getDataPath())
  })

  ipcMain.handle('backup:selectOldPath', async () => {
    const result = await showOpenDialog({
      title: 'Selecionar pasta antiga com dados',
      properties: ['openDirectory'],
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    return result.filePaths[0]
  })

  ipcMain.handle('backup:importMarkdowns', async (_event, sourceDir: string) => {
    return importMarkdownsFromDir(sourceDir)
  })

  ipcMain.handle('backup:selectJsonFile', async () => {
    const result = await showOpenDialog({
      title: 'Selecionar JSON de dados (store/planning/calendar)',
      properties: ['openFile'],
      filters: [{ name: 'JSON', extensions: ['json'] }],
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    return result.filePaths[0]
  })

  ipcMain.handle('backup:importPlanningData', async (_event, storeJsonPath: string) => {
    return importPlanningDataFromFile(storeJsonPath)
  })
}
