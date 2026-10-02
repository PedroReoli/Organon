import { registerBackupIpcHandlers } from './backup.ipc'
import { registerContentIpcHandlers } from './content.ipc'
import { registerCoreIpcHandlers } from './core.ipc'
import { registerConversationIpc } from './conversation.ipc'
import { registerLocalSyncIpc } from './localSync.ipc'
import { registerMeetingResearchIpc } from './meeting.ipc'
import { registerMeetingRecordingIpc } from './meetingRecording.ipc'
import { registerSuperWhisperIpc, registerAutoUpdaterIpc } from '../core'
import { registerProjectGraphIpc } from '../services'
import { registerWakeWordIpc } from '../whisper'
import { registerRuntimeMetricsIpc } from '../diagnostics/runtimeMetrics'

export * from './backup.ipc'
export * from './content.ipc'
export * from './core.ipc'
export * from './conversation.ipc'
export * from './localSync.ipc'
export * from './meeting.ipc'
export * from './meetingRecording.ipc'

export const registerIpcHandlers = (): void => {
  registerCoreIpcHandlers()
  registerContentIpcHandlers()
  registerMeetingRecordingIpc()
  registerBackupIpcHandlers()
  registerConversationIpc()
  registerProjectGraphIpc()
  registerSuperWhisperIpc()
  registerLocalSyncIpc()
  registerAutoUpdaterIpc()
  registerWakeWordIpc()
  registerRuntimeMetricsIpc()
}
