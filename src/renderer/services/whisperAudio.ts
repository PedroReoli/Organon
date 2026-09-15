/** Decode complete recordings, downmix and resample before every provider. */
export async function normalizeWhisperAudio(blob: Blob): Promise<Blob> {
  if (!blob.size) throw new Error('A gravação está vazia.')
  const bytes = await blob.arrayBuffer()
  const header = new DataView(bytes)
  if (bytes.byteLength >= 44 && header.getUint32(0) === 0x52494646 && header.getUint32(8) === 0x57415645 && header.getUint32(12) === 0x666d7420 && header.getUint32(36) === 0x64617461 && header.getUint16(20, true) === 1 && header.getUint16(22, true) === 1 && header.getUint32(24, true) === 16000 && header.getUint16(34, true) === 16) return new Blob([bytes], { type: 'audio/wav' })
  if (window.electronAPI) throw new Error('Este áudio não está em WAV PCM mono 16 kHz. Grave novamente pelo Whisper ou converta o arquivo antes de importar.')
  const context = new AudioContext()
  try {
    const decoded = await context.decodeAudioData(await blob.arrayBuffer())
    const offline = new OfflineAudioContext(1, Math.max(1, Math.ceil(decoded.duration * 16000)), 16000)
    const source = offline.createBufferSource()
    source.buffer = decoded
    source.connect(offline.destination)
    source.start()
    const pcm = (await offline.startRendering()).getChannelData(0)
    return encodeWhisperPcm(pcm)
  } finally { await context.close() }
}

export function stopRecorder(recorder: (EventTarget & { state: string; stop(): void }) | null): Promise<void> {
  if (!recorder || recorder.state === 'inactive') return Promise.resolve()
  return new Promise((resolve, reject) => {
    recorder.addEventListener('stop', () => resolve(), { once: true })
    recorder.addEventListener('error', () => reject(new Error('Falha ao finalizar áudio.')), { once: true })
    recorder.stop()
  })
}

export function encodeWhisperPcm(pcm: Float32Array, sampleRate = 16000): Blob {
  const bytes = new ArrayBuffer(44 + pcm.length * 2)
  const view = new DataView(bytes)
  const ascii = (offset: number, value: string) => [...value].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)))
  ascii(0, 'RIFF'); view.setUint32(4, bytes.byteLength - 8, true); ascii(8, 'WAVE')
  ascii(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true)
  view.setUint16(22, 1, true); view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true); view.setUint16(34, 16, true); ascii(36, 'data')
  view.setUint32(40, pcm.length * 2, true)
  pcm.forEach((sample, i) => { const v = Math.max(-1, Math.min(1, sample)); view.setInt16(44 + i * 2, v * (v < 0 ? 32768 : 32767), true) })
  return new Blob([bytes], { type: 'audio/wav' })
}

/** Keep requests below upload limits without dropping the tail of a meeting. */
export async function splitWhisperWav(blob: Blob): Promise<Blob[]> {
  const bytes = await blob.arrayBuffer()
  const parts: Blob[] = []
  const chunkBytes = 16000 * 2 * 300
  for (let offset = 44; offset < bytes.byteLength; offset += chunkBytes) {
    const pcm = bytes.slice(offset, Math.min(offset + chunkBytes, bytes.byteLength))
    const header = bytes.slice(0, 44)
    const view = new DataView(header)
    view.setUint32(4, 36 + pcm.byteLength, true)
    view.setUint32(40, pcm.byteLength, true)
    parts.push(new Blob([header, pcm], { type: 'audio/wav' }))
  }
  return parts
}
