class WhisperTap extends AudioWorkletProcessor {
  constructor() {
    super()
    this.samples = []
    this.count = 0
    this.closed = false
    this.port.onmessage = () => {
      this.closed = true
      this.flush()
      this.port.postMessage('stopped')
    }
  }

  flush() {
    if (!this.count) return
    const joined = new Float32Array(this.count)
    let offset = 0
    for (const part of this.samples) {
      joined.set(part, offset)
      offset += part.length
    }
    this.port.postMessage(joined, [joined.buffer])
    this.samples = []
    this.count = 0
  }

  process(inputs) {
    if (this.closed) return true
    const channels = inputs[0]
    if (!channels?.length) return true
    const mono = new Float32Array(channels[0].length)
    for (const channel of channels) {
      for (let i = 0; i < mono.length; i++) mono[i] += channel[i] / channels.length
    }
    this.samples.push(mono)
    this.count += mono.length
    if (this.count >= sampleRate * 8) this.flush()
    return true
  }
}

registerProcessor('whisper-tap', WhisperTap)
