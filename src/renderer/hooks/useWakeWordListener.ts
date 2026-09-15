import { useEffect, useState, useRef } from 'react'

export interface UseWakeWordOptions {
  enabled?: boolean
  onWakeWordDetected?: () => void
}

export function useWakeWordListener({ enabled = true, onWakeWordDetected }: UseWakeWordOptions = {}) {
  const [isListening, setIsListening] = useState(false)
  const [lastDetectedAt, setLastDetectedAt] = useState<string | null>(null)

  const callbackRef = useRef(onWakeWordDetected)
  useEffect(() => {
    callbackRef.current = onWakeWordDetected
  }, [onWakeWordDetected])

  const lastTriggeredRef = useRef<number>(0)

  useEffect(() => {
    if (!enabled) return

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) {
      return
    }

    let recognition: any = null
    let isStoppedManually = false

    try {
      recognition = new SpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'pt-BR'

      recognition.onstart = () => {
        setIsListening(true)
      }

      recognition.onresult = (event: any) => {
        const now = Date.now()
        // Lock de 3s para evitar disparos duplicados
        if (now - lastTriggeredRef.current < 3000) return

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript.toLowerCase().trim()

          if (
            transcript.includes('oi organon') ||
            transcript.includes('ei organon') ||
            transcript.includes('ok organon') ||
            transcript.includes('hey organon') ||
            transcript.includes('organon')
          ) {
            console.log('[WakeWord] "Oi Organon" detectado!', transcript)
            lastTriggeredRef.current = now
            const timeStr = new Date().toLocaleTimeString('pt-BR')
            setLastDetectedAt(timeStr)

            // Dispara acionamento nativo no Electron Main
            if ((window as any).electronAPI?.triggerWakeWord) {
              (window as any).electronAPI.triggerWakeWord()
            }

            if (callbackRef.current) {
              callbackRef.current()
            }
            break
          }
        }
      }

      recognition.onerror = (err: any) => {
        if (err.error !== 'no-speech' && err.error !== 'aborted' && err.error !== 'network') {
          console.warn('[WakeWord] Status escuta:', err.error)
        }
      }

      recognition.onend = () => {
        setIsListening(false)
        if (enabled && !isStoppedManually) {
          setTimeout(() => {
            try {
              recognition.start()
            } catch {}
          }, 1500)
        }
      }

      recognition.start()
    } catch (err) {
      console.warn('[WakeWord] Não foi possível iniciar escuta:', err)
    }

    return () => {
      isStoppedManually = true
      if (recognition) {
        try {
          recognition.stop()
        } catch {}
      }
    }
  }, [enabled])

  return { isListening, lastDetectedAt }
}
