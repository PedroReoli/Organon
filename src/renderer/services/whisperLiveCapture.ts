import { encodeWhisperPcm } from './whisperAudio'

/** Complete PCM windows, backpressure without discarding speech, and a final tail flush. */
export async function startWhisperLiveCapture(stream: MediaStream, onAudio: (audio: Blob) => Promise<void>) {
  const context = new AudioContext({ sampleRate: 16000 })
  const script = `class WhisperTap extends AudioWorkletProcessor {
    constructor() { super(); this.samples = []; this.count = 0; this.closed = false; this.port.onmessage = () => { this.closed = true; this.flush(); this.port.postMessage('stopped') } }
    flush() { if (!this.count) return; const joined = new Float32Array(this.count); let offset = 0;
      for (const part of this.samples) { joined.set(part, offset); offset += part.length }
      this.port.postMessage(joined, [joined.buffer]); this.samples = []; this.count = 0
    }
    process(inputs) {
      if (this.closed) return true
      const channels = inputs[0]; if (!channels?.length) return true
      const mono = new Float32Array(channels[0].length)
      for (const channel of channels) for (let i = 0; i < mono.length; i++) mono[i] += channel[i] / channels.length
      this.samples.push(mono); this.count += mono.length
      if (this.count >= sampleRate * 8) this.flush()
      return true
    }
  }; registerProcessor('whisper-tap', WhisperTap)`
  const url = URL.createObjectURL(new Blob([script], { type: 'text/javascript' }))
  try { await context.audioWorklet.addModule(url) } catch (error) { await context.close(); throw error }
  finally { URL.revokeObjectURL(url) }
  const source = context.createMediaStreamSource(stream)
  const tap = new AudioWorkletNode(context, 'whisper-tap')
  const mute = context.createGain(); mute.gain.value = 0
  source.connect(tap).connect(mute).connect(context.destination)
  let pending = Promise.resolve()
  let finish!: () => void
  const stopped = new Promise<void>(resolve => { finish = resolve })
  tap.port.onmessage = ({ data }: MessageEvent<Float32Array | string>) => {
    if (data === 'stopped') { finish(); return }
    if (!(data instanceof Float32Array) || !data.some(value => Math.abs(value) > 0.005)) return
    pending = pending.then(() => onAudio(encodeWhisperPcm(data, context.sampleRate))).catch(() => {})
  }
  await context.resume()
  let closing: Promise<void> | undefined
  return () => closing ||= (async () => {
    tap.port.postMessage('stop')
    await stopped
    source.disconnect(); tap.disconnect(); await context.close()
    await pending
  })()
}
