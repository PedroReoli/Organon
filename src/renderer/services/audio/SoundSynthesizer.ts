import type { ReminderSoundType } from '../../types'

type BrowserWindow = Window & typeof globalThis & {
  webkitAudioContext?: typeof AudioContext
}

class SoundSynthesizer {
  private context: AudioContext | null = null
  private volume = 0.65

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume))
  }

  getVolume() {
    return this.volume
  }

  private getContext() {
    if (typeof window === 'undefined') return null
    const AudioContextClass = window.AudioContext || (window as BrowserWindow).webkitAudioContext
    if (!AudioContextClass) return null
    this.context ??= new AudioContextClass()
    if (this.context.state === 'suspended') void this.context.resume()
    return this.context
  }

  private tone(frequency: number, startsAt: number, duration: number, type: OscillatorType = 'sine', gain = 0.2) {
    const context = this.getContext()
    if (!context) return
    const oscillator = context.createOscillator()
    const envelope = context.createGain()
    oscillator.type = type
    oscillator.frequency.setValueAtTime(frequency, startsAt)
    envelope.gain.setValueAtTime(0.0001, startsAt)
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain * this.volume), startsAt + 0.025)
    envelope.gain.exponentialRampToValueAtTime(0.0001, startsAt + duration)
    oscillator.connect(envelope)
    envelope.connect(context.destination)
    oscillator.start(startsAt)
    oscillator.stop(startsAt + duration + 0.03)
  }

  play(sound: ReminderSoundType) {
    if (sound === 'none') return
    const context = this.getContext()
    if (!context) return
    const now = context.currentTime + 0.02

    if (sound === 'gentle-chime') {
      this.tone(523.25, now, 0.42, 'sine', 0.18)
      this.tone(659.25, now + 0.18, 0.55, 'sine', 0.16)
      return
    }
    if (sound === 'digital-beep') {
      this.tone(880, now, 0.12, 'square', 0.12)
      this.tone(880, now + 0.2, 0.12, 'square', 0.12)
      return
    }
    if (sound === 'bell-focus') {
      this.tone(440, now, 1.15, 'sine', 0.2)
      this.tone(880, now, 0.8, 'sine', 0.06)
      return
    }

    ;[440, 554.37, 659.25].forEach((frequency, index) => {
      this.tone(frequency, now + index * 0.14, 0.2, 'sawtooth', 0.13)
      this.tone(frequency, now + 0.52 + index * 0.14, 0.2, 'sawtooth', 0.13)
    })
  }
}

export const soundSynthesizer = new SoundSynthesizer()
