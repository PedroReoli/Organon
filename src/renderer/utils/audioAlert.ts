/**
 * audioAlert.ts — Gerador de sons de alarme e notificações com Web Audio API
 * Sem dependência de arquivos de áudio externos, sintetizado nativamente.
 */

export type SoundEffect = 'alarm' | 'bell' | 'chime' | 'digital' | 'gentle' | 'none'

let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (AudioContextClass) {
      audioCtx = new AudioContextClass()
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    void audioCtx.resume()
  }
  return audioCtx
}

export function playSound(sound: SoundEffect = 'bell', volume = 0.5): void {
  if (sound === 'none') return
  try {
    const ctx = getAudioContext()
    if (!ctx) return

    const now = ctx.currentTime

    switch (sound) {
      case 'bell': {
        // Sino harmônico elegante
        const osc1 = ctx.createOscillator()
        const osc2 = ctx.createOscillator()
        const gain = ctx.createGain()

        osc1.type = 'sine'
        osc1.frequency.setValueAtTime(587.33, now) // D5
        osc1.frequency.exponentialRampToValueAtTime(880, now + 0.1)

        osc2.type = 'triangle'
        osc2.frequency.setValueAtTime(1174.66, now) // D6

        gain.gain.setValueAtTime(volume * 0.7, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2)

        osc1.connect(gain)
        osc2.connect(gain)
        gain.connect(ctx.destination)

        osc1.start(now)
        osc2.start(now)
        osc1.stop(now + 1.2)
        osc2.stop(now + 1.2)
        break
      }

      case 'chime': {
        // Acorde suave triplo
        const notes = [523.25, 659.25, 783.99] // C5, E5, G5
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.type = 'sine'
          osc.frequency.setValueAtTime(freq, now + i * 0.08)

          gain.gain.setValueAtTime(0, now + i * 0.08)
          gain.gain.linearRampToValueAtTime(volume * 0.5, now + i * 0.08 + 0.03)
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 1.0)

          osc.connect(gain)
          gain.connect(ctx.destination)

          osc.start(now + i * 0.08)
          osc.stop(now + i * 0.08 + 1.0)
        })
        break
      }

      case 'alarm': {
        // Alarme insistente em 2 pulsos com som vibrante
        for (let pulse = 0; pulse < 3; pulse++) {
          const pStart = now + pulse * 0.22
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()

          osc.type = 'sawtooth'
          osc.frequency.setValueAtTime(880, pStart)
          osc.frequency.setValueAtTime(1046.5, pStart + 0.09)

          gain.gain.setValueAtTime(0, pStart)
          gain.gain.linearRampToValueAtTime(volume * 0.6, pStart + 0.02)
          gain.gain.setValueAtTime(volume * 0.6, pStart + 0.16)
          gain.gain.exponentialRampToValueAtTime(0.001, pStart + 0.2)

          osc.connect(gain)
          gain.connect(ctx.destination)

          osc.start(pStart)
          osc.stop(pStart + 0.2)
        }
        break
      }

      case 'digital': {
        // Beep digital moderno
        const freqs = [784, 987.77, 1318.5]
        freqs.forEach((freq, idx) => {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          const t = now + idx * 0.07
          osc.type = 'square'
          osc.frequency.setValueAtTime(freq, t)

          gain.gain.setValueAtTime(0, t)
          gain.gain.linearRampToValueAtTime(volume * 0.25, t + 0.01)
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15)

          osc.connect(gain)
          gain.connect(ctx.destination)

          osc.start(t)
          osc.stop(t + 0.15)
        })
        break
      }

      case 'gentle': {
        // Tom sereno e suave
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(440, now)
        osc.frequency.exponentialRampToValueAtTime(554.37, now + 0.2)

        gain.gain.setValueAtTime(0, now)
        gain.gain.linearRampToValueAtTime(volume * 0.4, now + 0.08)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5)

        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.start(now)
        osc.stop(now + 1.5)
        break
      }
    }
  } catch (err) {
    console.warn('[audioAlert] Falha ao sintetizar áudio:', err)
  }
}
