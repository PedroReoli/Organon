import { encodeWhisperPcm } from './whisperAudio'

/** Complete PCM windows, backpressure without discarding speech, and a final tail flush. */
export async function startWhisperLiveCapture(stream: MediaStream, onAudio: (audio: Blob) => Promise<void>) {
  const context = new AudioContext({ sampleRate: 16000 })
  try {
    await context.audioWorklet.addModule(new URL('./whisper-live-processor.js', document.baseURI).href)
  } catch (error) {
    await context.close()
    throw error
  }
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
