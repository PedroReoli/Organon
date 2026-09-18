import { registerBackupIpcHandlers } from './backup.ipc'
import { registerContentIpcHandlers } from './content.ipc'
import { registerCoreIpcHandlers } from './core.ipc'
import { registerConversationIpc } from './conversation.ipc'
import { registerLocalSyncIpc } from './localSync.ipc'
import { registerMeetingResearchIpc } from './meeting.ipc'
import { registerSuperWhisperIpc, registerAutoUpdaterIpc } from '../core'
import { registerProjectGraphIpc } from '../services'
import { registerWakeWordIpc } from '../whisper'

export * from './backup.ipc'
export * from './content.ipc'
export * from './core.ipc'
export * from './conversation.ipc'
export * from './localSync.ipc'
export * from './meeting.ipc'

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
