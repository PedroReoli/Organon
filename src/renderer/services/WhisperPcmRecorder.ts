import { encodeWhisperPcm } from './whisperAudio'

export interface WhisperAudioLevel {
  rms: number
  peak: number
}

/** Records PCM directly: Electron 28's WebM decodeAudioData can crash natively. */
export class WhisperPcmRecorder extends EventTarget {
  readonly mimeType = 'audio/wav'
  state: 'inactive' | 'recording' = 'inactive'
  ondataavailable: ((event: BlobEvent) => void) | null = null
  onstop: (() => void) | null = null
  onlevel: ((level: WhisperAudioLevel) => void) | null = null
  private chunks: Float32Array[] = []
  private stopping = false
  private source!: MediaStreamAudioSourceNode
  private tap!: AudioWorkletNode
  private constructor(readonly stream: MediaStream, private context: AudioContext) { super() }

  static async create(stream: MediaStream): Promise<WhisperPcmRecorder> {
    const context = new AudioContext({ sampleRate: 16000 })
    const recorder = new WhisperPcmRecorder(stream, context)
    try {
      await context.audioWorklet.addModule(new URL('./whisper-pcm-processor.js', document.baseURI).href)
      recorder.source = context.createMediaStreamSource(stream)
      recorder.tap = new AudioWorkletNode(context, 'pcm-recorder')
      const mute = context.createGain(); mute.gain.value = 0
      recorder.source.connect(recorder.tap).connect(mute).connect(context.destination)
      recorder.tap.port.onmessage = ({ data }) => {
        if (data === 'stopped') void recorder.finish()
        else if (data?.type === 'level') recorder.onlevel?.({ rms: data.rms, peak: data.peak })
        else if (data instanceof Float32Array) recorder.chunks.push(data)
      }
      await context.resume()
      return recorder
    } catch (error) { await context.close(); throw error }
  }

  start(_timeslice?: number): void {
    this.state = 'recording'
    this.tap.port.postMessage('start')
    void window.electronAPI?.reportRuntimeEvent?.('whisper.recorder.started', { sampleRate: this.context.sampleRate })
  }

  stop(): void {
    if (this.state === 'inactive' || this.stopping) return
    this.stopping = true
    this.tap.port.postMessage('stop')
  }

  private async finish(): Promise<void> {
    let failed = false
    try {
      const pcm = new Float32Array(this.chunks.reduce((total, chunk) => total + chunk.length, 0))
      let offset = 0
      for (const chunk of this.chunks) { pcm.set(chunk, offset); offset += chunk.length }
      this.chunks = []
      const event = new BlobEvent('dataavailable', { data: encodeWhisperPcm(pcm, this.context.sampleRate) })
      this.ondataavailable?.(event)
      this.dispatchEvent(event)
    } catch (error) {
      failed = true
      void window.electronAPI?.reportRuntimeEvent?.('whisper.recorder.error', {
        message: error instanceof Error ? error.message : String(error),
      })
      throw error
    } finally {
      this.source.disconnect(); this.tap.disconnect()
      await this.context.close()
      this.state = 'inactive'
      this.onstop?.()
      this.dispatchEvent(new Event('stop'))
      if (!failed) void window.electronAPI?.reportRuntimeEvent?.('whisper.recorder.stopped')
    }
  }
}
