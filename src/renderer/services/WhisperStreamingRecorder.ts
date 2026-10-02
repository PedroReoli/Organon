import type { WhisperAudioLevel } from './WhisperPcmRecorder'

const FLUSH_SAMPLE_COUNT = 16_000

function encodePcm16(chunks: Float32Array[], sampleCount: number): ArrayBuffer {
  const output = new Int16Array(sampleCount)
  let offset = 0
  for (const chunk of chunks) {
    for (let index = 0; index < chunk.length; index += 1) {
      const sample = Math.max(-1, Math.min(1, chunk[index]))
      output[offset + index] = sample < 0 ? sample * 0x8000 : sample * 0x7fff
    }
    offset += chunk.length
  }
  return output.buffer
}

/** Envia PCM em lotes pequenos para persistência incremental, sem reter a reunião na memória. */
export class WhisperStreamingRecorder {
  onlevel: ((level: WhisperAudioLevel) => void) | null = null
  private chunks: Float32Array[] = []
  private sampleCount = 0
  private pending = Promise.resolve()
  private started = false
  private stopping?: Promise<void>

  private constructor(
    private readonly context: AudioContext,
    private readonly source: MediaStreamAudioSourceNode,
    private readonly tap: AudioWorkletNode,
    private readonly onChunk: (pcm: ArrayBuffer) => Promise<void>,
  ) {}

  static async create(
    stream: MediaStream,
    onChunk: (pcm: ArrayBuffer) => Promise<void>,
  ): Promise<WhisperStreamingRecorder> {
    const context = new AudioContext({ sampleRate: 16_000 })
    try {
      await context.audioWorklet.addModule(new URL('./whisper-pcm-processor.js', document.baseURI).href)
      const source = context.createMediaStreamSource(stream)
      const tap = new AudioWorkletNode(context, 'pcm-recorder')
      const mute = context.createGain()
      mute.gain.value = 0
      source.connect(tap).connect(mute).connect(context.destination)
      const recorder = new WhisperStreamingRecorder(context, source, tap, onChunk)
      tap.port.onmessage = ({ data }) => recorder.handleMessage(data)
      await context.resume()
      return recorder
    } catch (error) {
      await context.close()
      throw error
    }
  }

  start(): void {
    if (this.started) return
    this.started = true
    this.tap.port.postMessage('start')
  }

  stop(): Promise<void> {
    if (!this.started) return Promise.resolve()
    if (this.stopping) return this.stopping
    this.stopping = new Promise<void>((resolve, reject) => {
      const previousHandler = this.tap.port.onmessage
      this.tap.port.onmessage = event => {
        previousHandler?.call(this.tap.port, event)
        if (event.data !== 'stopped') return
        this.flush()
        this.pending
          .then(async () => {
            this.source.disconnect()
            this.tap.disconnect()
            await this.context.close()
            this.started = false
            resolve()
          })
          .catch(reject)
      }
      this.tap.port.postMessage('stop')
    })
    return this.stopping
  }

  private handleMessage(data: unknown): void {
    if (data && typeof data === 'object' && 'type' in data && data.type === 'level') {
      const level = data as Record<string, unknown>
      if (typeof level.rms === 'number' && typeof level.peak === 'number') {
        this.onlevel?.({ rms: level.rms, peak: level.peak })
      }
      return
    }
    if (!(data instanceof Float32Array)) return
    this.chunks.push(data)
    this.sampleCount += data.length
    if (this.sampleCount >= FLUSH_SAMPLE_COUNT) this.flush()
  }

  private flush(): void {
    if (!this.sampleCount) return
    const chunks = this.chunks
    const sampleCount = this.sampleCount
    this.chunks = []
    this.sampleCount = 0
    const pcm = encodePcm16(chunks, sampleCount)
    this.pending = this.pending.then(() => this.onChunk(pcm))
  }
}
