import { ipcMain } from 'electron'

import {
  MeetingRecordingSessionManager,
  type MeetingAudioChannel,
} from '../meeting/recordingSession'

const recordingSessions = new MeetingRecordingSessionManager()

export function registerMeetingRecordingIpc(): void {
  ipcMain.handle('meetings:recordingStart', (event, request: {
    meetingId: string
    channels: MeetingAudioChannel[]
    sampleRate?: number
  }) => {
    event.sender.once('destroyed', () => { void recordingSessions.cancelOwner(event.sender.id) })
    return recordingSessions.start(event.sender.id, request)
  })

  ipcMain.handle('meetings:recordingAppend', (event, request: {
    sessionId: string
    channel: MeetingAudioChannel
    pcm: ArrayBuffer
  }) => recordingSessions.append(event.sender.id, request))

  ipcMain.handle('meetings:recordingFinalize', (event, request: {
    sessionId: string
    durationMs?: number
  }) => recordingSessions.finalize(event.sender.id, request))

  ipcMain.handle('meetings:recordingCancel', (event, sessionId: string) => (
    recordingSessions.cancel(event.sender.id, sessionId)
  ))
}
