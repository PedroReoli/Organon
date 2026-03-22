import { registerBackupIpcHandlers } from './ipcBackup'
import { registerContentIpcHandlers } from './ipcContent'
import { registerCoreIpcHandlers } from './ipcCore'

export const registerIpcHandlers = (): void => {
  registerCoreIpcHandlers()
  registerContentIpcHandlers()
  registerBackupIpcHandlers()
}
