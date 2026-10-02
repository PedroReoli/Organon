class PcmRecorder extends AudioWorkletProcessor {
  constructor() {
    super()
    this.recording = false
    this.buffer = new Float32Array(4096)
    this.offset = 0
    this.levelFrame = 0
    this.port.onmessage = ({ data }) => {
      if (data === 'start') this.recording = true
      if (data === 'stop') {
        this.recording = false
        if (this.offset) this.port.postMessage(this.buffer.slice(0, this.offset))
        this.port.postMessage('stopped')
      }
    }
  }

  process(inputs) {
    if (!this.recording || !inputs[0]?.length) return true
    const channels = inputs[0]
    const mono = new Float32Array(channels[0].length)
    for (const channel of channels) {
      for (let i = 0; i < mono.length; i++) mono[i] += channel[i] / channels.length
    }
    if (++this.levelFrame % 8 === 0) {
      let sum = 0
      let peak = 0
      for (const value of mono) {
        sum += value * value
        peak = Math.max(peak, Math.abs(value))
      }
      this.port.postMessage({ type: 'level', rms: Math.sqrt(sum / mono.length), peak })
    }
    for (const value of mono) {
      this.buffer[this.offset++] = value
      if (this.offset === this.buffer.length) {
        this.port.postMessage(this.buffer, [this.buffer.buffer])
        this.buffer = new Float32Array(4096)
        this.offset = 0
      }
    }
    return true
  }
}

registerProcessor('pcm-recorder', PcmRecorder)
