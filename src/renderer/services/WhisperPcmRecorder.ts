import { encodeWhisperPcm } from './whisperAudio'

/** Records PCM directly: Electron 28's WebM decodeAudioData can crash natively. */
export class WhisperPcmRecorder extends EventTarget {
  readonly mimeType = 'audio/wav'
  state: 'inactive' | 'recording' = 'inactive'
  ondataavailable: ((event: BlobEvent) => void) | null = null
  onstop: (() => void) | null = null
  private chunks: Float32Array[] = []
  private stopping = false
  private source!: MediaStreamAudioSourceNode
  private tap!: AudioWorkletNode
  private constructor(readonly stream: MediaStream, private context: AudioContext) { super() }

  static async create(stream: MediaStream): Promise<WhisperPcmRecorder> {
    const context = new AudioContext({ sampleRate: 16000 })
    const recorder = new WhisperPcmRecorder(stream, context)
    const code = `class PcmRecorder extends AudioWorkletProcessor {
      constructor() { super(); this.recording = false; this.buffer = new Float32Array(4096); this.offset = 0; this.port.onmessage = ({ data }) => {
        if (data === 'start') this.recording = true;
        if (data === 'stop') { this.recording = false; if (this.offset) this.port.postMessage(this.buffer.slice(0, this.offset)); this.port.postMessage('stopped') }
      } }
      process(inputs) {
        if (!this.recording || !inputs[0]?.length) return true;
        const channels = inputs[0]; const mono = new Float32Array(channels[0].length);
        for (const channel of channels) for (let i = 0; i < mono.length; i++) mono[i] += channel[i] / channels.length;
        for (const value of mono) { this.buffer[this.offset++] = value; if (this.offset === this.buffer.length) { this.port.postMessage(this.buffer, [this.buffer.buffer]); this.buffer = new Float32Array(4096); this.offset = 0 } }; return true
      }
    }; registerProcessor('pcm-recorder', PcmRecorder)`
    const url = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }))
    try {
      await context.audioWorklet.addModule(url)
      recorder.source = context.createMediaStreamSource(stream)
      recorder.tap = new AudioWorkletNode(context, 'pcm-recorder')
      const mute = context.createGain(); mute.gain.value = 0
      recorder.source.connect(recorder.tap).connect(mute).connect(context.destination)
      recorder.tap.port.onmessage = ({ data }) => {
        if (data === 'stopped') void recorder.finish()
        else recorder.chunks.push(data)
      }
      await context.resume()
      return recorder
    } catch (error) { await context.close(); throw error }
    finally { URL.revokeObjectURL(url) }
  }

  start(_timeslice?: number): void {
    this.state = 'recording'
    this.tap.port.postMessage('start')
  }

  stop(): void {
    if (this.state === 'inactive' || this.stopping) return
    this.stopping = true
    this.tap.port.postMessage('stop')
  }

  private async finish(): Promise<void> {
    try {
      const pcm = new Float32Array(this.chunks.reduce((total, chunk) => total + chunk.length, 0))
      let offset = 0
      for (const chunk of this.chunks) { pcm.set(chunk, offset); offset += chunk.length }
      this.chunks = []
      const event = new BlobEvent('dataavailable', { data: encodeWhisperPcm(pcm, this.context.sampleRate) })
      this.ondataavailable?.(event)
      this.dispatchEvent(event)
    } finally {
      this.source.disconnect(); this.tap.disconnect()
      await this.context.close()
      this.state = 'inactive'
      this.onstop?.()
      this.dispatchEvent(new Event('stop'))
    }
  }
}
