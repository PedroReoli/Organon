import { WhisperStreamingRecorder } from './WhisperStreamingRecorder'
import type { WhisperAudioLevel } from './WhisperPcmRecorder'

export type MeetingAudioChannel = 'microphone' | 'system' | 'mixed'

export interface MeetingAudioTrack {
  channel: MeetingAudioChannel
  path: string
  sha256: string
  bytes: number
  codec: string
  durationMs: number
  sampleRate: number
}

interface MeetingAudioCaptureOptions {
  meetingId: string
  microphoneDeviceId?: string
  captureSystemAudio: boolean
  onMicrophoneLevel?: (level: WhisperAudioLevel) => void
}

export class MeetingAudioCapture {
  readonly meetingId: string
  readonly microphoneStream: MediaStream
  readonly systemStream?: MediaStream
  readonly mixedStream: MediaStream
  readonly hasSystemAudio: boolean
  private readonly recorders: WhisperStreamingRecorder[]
  private readonly mixContext?: AudioContext
  private sessionId: string
  private stopped = false

  private constructor(input: {
    meetingId: string
    sessionId: string
    microphoneStream: MediaStream
    systemStream?: MediaStream
    mixedStream: MediaStream
    mixContext?: AudioContext
    recorders: WhisperStreamingRecorder[]
  }) {
    this.meetingId = input.meetingId
    this.sessionId = input.sessionId
    this.microphoneStream = input.microphoneStream
    this.systemStream = input.systemStream
    this.mixedStream = input.mixedStream
    this.mixContext = input.mixContext
    this.recorders = input.recorders
    this.hasSystemAudio = Boolean(input.systemStream?.getAudioTracks().length)
  }

  static async start(options: MeetingAudioCaptureOptions): Promise<MeetingAudioCapture> {
    const api = window.electronAPI
    if (!api?.startMeetingRecording || !api.appendMeetingRecording) {
      throw new Error('A gravação incremental requer o aplicativo desktop atualizado.')
    }

    const microphoneStream = await navigator.mediaDevices.getUserMedia({
      audio: options.microphoneDeviceId && options.microphoneDeviceId !== 'default'
        ? { deviceId: { exact: options.microphoneDeviceId } }
        : true,
    })
    let systemStream: MediaStream | undefined
    let mixContext: AudioContext | undefined
    let mixedStream = microphoneStream
    let sessionId: string | undefined
    const recorders: WhisperStreamingRecorder[] = []

    try {
      if (options.captureSystemAudio) {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
        if (!displayStream.getAudioTracks().length) {
          displayStream.getTracks().forEach(track => track.stop())
          throw new Error('A fonte selecionada não forneceu áudio do sistema. Ative o compartilhamento de áudio.')
        }
        systemStream = displayStream
        mixContext = new AudioContext({ sampleRate: 16_000 })
        await mixContext.resume()
        const destination = mixContext.createMediaStreamDestination()
        for (const stream of [microphoneStream, systemStream]) {
          const gain = mixContext.createGain()
          gain.gain.value = 0.5
          mixContext.createMediaStreamSource(new MediaStream(stream.getAudioTracks())).connect(gain).connect(destination)
        }
        mixedStream = destination.stream
      }

      const channels: MeetingAudioChannel[] = systemStream
        ? ['microphone', 'system', 'mixed']
        : ['microphone']
      const session = await api.startMeetingRecording({ meetingId: options.meetingId, channels, sampleRate: 16_000 })
      sessionId = session.sessionId

      const createRecorder = async (channel: MeetingAudioChannel, stream: MediaStream) => {
        const recorder = await WhisperStreamingRecorder.create(stream, pcm => (
          api.appendMeetingRecording({ sessionId: session.sessionId, channel, pcm }).then(() => undefined)
        ))
        recorders.push(recorder)
        return recorder
      }
      const microphoneRecorder = await createRecorder('microphone', microphoneStream)
      microphoneRecorder.onlevel = options.onMicrophoneLevel || null
      if (systemStream) {
        await createRecorder('system', new MediaStream(systemStream.getAudioTracks()))
        await createRecorder('mixed', mixedStream)
      }
      recorders.forEach(recorder => recorder.start())

      return new MeetingAudioCapture({
        meetingId: options.meetingId,
        sessionId: session.sessionId,
        microphoneStream,
        systemStream,
        mixedStream,
        mixContext,
        recorders,
      })
    } catch (error) {
      await Promise.all(recorders.map(recorder => recorder.stop().catch(() => undefined)))
      if (sessionId) await api.cancelMeetingRecording?.(sessionId).catch(() => undefined)
      microphoneStream.getTracks().forEach(track => track.stop())
      systemStream?.getTracks().forEach(track => track.stop())
      await mixContext?.close().catch(() => undefined)
      throw error
    }
  }

  async stop(durationMs: number): Promise<MeetingAudioTrack[]> {
    if (this.stopped) return []
    this.stopped = true
    try {
      await Promise.all(this.recorders.map(recorder => recorder.stop()))
      const result = await window.electronAPI.finalizeMeetingRecording({
        sessionId: this.sessionId,
        durationMs,
      })
      return result.tracks
    } finally {
      this.stopStreams()
    }
  }

  async cancel(): Promise<void> {
    if (this.stopped) return
    this.stopped = true
    await Promise.all(this.recorders.map(recorder => recorder.stop().catch(() => undefined)))
    await window.electronAPI.cancelMeetingRecording?.(this.sessionId).catch(() => undefined)
    this.stopStreams()
  }

  private stopStreams(): void {
    this.microphoneStream.getTracks().forEach(track => track.stop())
    this.systemStream?.getTracks().forEach(track => track.stop())
    this.mixedStream.getTracks().forEach(track => track.stop())
    void this.mixContext?.close().catch(() => undefined)
  }
}
