import { registerBackupIpcHandlers } from './ipcBackup'
import { registerContentIpcHandlers } from './ipcContent'
import { registerCoreIpcHandlers } from './ipcCore'
import { registerConversationIpc } from './ipcConversation'
import { registerSuperWhisperIpc } from './tray'
import { registerProjectGraphIpc } from './projectGraph'
import { registerLocalSyncIpc } from './ipcLocalSync'
import { registerAutoUpdaterIpc } from './autoUpdaterService'
import { registerWakeWordIpc } from './wakeWordService'

export const registerIpcHandlers = (): void => {
  registerCoreIpcHandlers()
  registerContentIpcHandlers()
  registerBackupIpcHandlers()
  registerConversationIpc()
  registerProjectGraphIpc()
  registerSuperWhisperIpc()
  registerLocalSyncIpc()
  registerAutoUpdaterIpc()
  registerWakeWordIpc()
}
