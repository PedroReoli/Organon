import { WhisperPcmRecorder } from '../../../services/WhisperPcmRecorder'
import React, { useState, useRef, useEffect } from 'react'
import { loadWhisperConfig, transcribeAudioBlobWithFallback } from '../../../services/whisperService'
import { MeetingOrchestrator } from '../../../services/meetingIntelligence/MeetingOrchestrator'

interface VoiceDictationModalProps {
  isOpen: boolean
  onClose: () => void
  onCreateCard?: (title: string) => void
  onCreateNote?: (title: string, content: string) => void
}

export const VoiceDictationModal: React.FC<VoiceDictationModalProps> = ({
  isOpen,
  onClose,
  onCreateCard,
  onCreateNote,
}) => {
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [transcription, setTranscription] = useState('')
  const [error, setError] = useState('')
  const [audioLevel, setAudioLevel] = useState(0)
  const mediaRecorderRef = useRef<WhisperPcmRecorder | null>(null)
  const audioStreamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const animationFrameRef = useRef<number | null>(null)

  useEffect(() => {
    if (!isOpen) {
      stopRecording()
      setTranscription('')
      setIsTranscribing(false)
    }
  }, [isOpen])

  useEffect(() => {
    return () => {
      stopRecording()
    }
  }, [])

  const buildAudioBlob = () => {
    const chunks = audioChunksRef.current
    const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm'
    return new Blob(chunks, { type: mimeType })
  }

  const transcribeCurrentRecording = async () => {
    const audioBlob = buildAudioBlob()
    if (audioBlob.size < 1000) {
      return
    }

    setIsTranscribing(true)
    try {
      const whisperCfg = loadWhisperConfig()
      const transcript = await transcribeAudioBlobWithFallback(audioBlob, whisperCfg, { mode: 'prompt' })
      if (transcript && !transcript.startsWith('[Erro')) {
        setTranscription(transcript.trim())
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao transcrever ditado.')
    } finally {
      setIsTranscribing(false)
    }
  }

  const organizeTranscriptForNote = async (rawTranscript: string): Promise<string> => {
    const cleaned = rawTranscript.trim()
    if (!cleaned) return ''

    const orchestrator = new MeetingOrchestrator('Ditado por Voz')
    const snippets = cleaned
      .split(/\n+/)
      .flatMap(line => line.match(/[^.!?]+[.!?]*/g) || [line])
      .map(snippet => snippet.trim())
      .filter(Boolean)

    for (const snippet of snippets) {
      await orchestrator.processTranscriptSnippet(snippet)
    }

    const data = orchestrator.getData()
    const summary = data.currentTopic || snippets.slice(0, 2).join(' ')
    const questions = data.questions.map(item => `- ${item.text}`)
    const decisions = data.decisions.map(item => `- ${item.text}`)
    const actionItems = data.actionItems.map(item => `- ${item.task}`)

    return [
      '# Ditado por Voz',
      '',
      '## Resumo',
      summary || cleaned.slice(0, 240),
      '',
      '## Perguntas Detectadas',
      questions.length > 0 ? questions.join('\n') : '- Nenhuma pergunta detectada.',
      '',
      '## Decisões',
      decisions.length > 0 ? decisions.join('\n') : '- Nenhuma decisão detectada.',
      '',
      '## Ações',
      actionItems.length > 0 ? actionItems.join('\n') : '- Nenhuma ação detectada.',
      '',
      '## Transcrição Bruta',
      cleaned,
    ].join('\n')
  }

  const startRecording = async () => {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioStreamRef.current = stream
      const mediaRecorder = await WhisperPcmRecorder.create(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        void transcribeCurrentRecording()
      }

      mediaRecorder.start(250)
      setIsRecording(true)

      // Animação visual de nivel de áudio
      const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext
      const audioContext = new AudioContextCtor()
      audioContextRef.current = audioContext
      const analyser = audioContext.createAnalyser()
      const source = audioContext.createMediaStreamSource(stream)
      source.connect(analyser)
      analyser.fftSize = 64
      const dataArray = new Uint8Array(analyser.frequencyBinCount)

      const updateLevel = () => {
        analyser.getByteFrequencyData(dataArray)
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length
        setAudioLevel(Math.min(100, Math.round(avg * 1.5)))
        animationFrameRef.current = requestAnimationFrame(updateLevel)
      }
      updateLevel()
    } catch (err: any) {
      alert(`Não foi possível acessar o microfone: ${err?.message || err}`)
      cleanupAudioResources()
    }
  }

  const cleanupAudioResources = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {})
      audioContextRef.current = null
    }

    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop())
      audioStreamRef.current = null
    }

    if (mediaRecorderRef.current) {
      mediaRecorderRef.current = null
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    cleanupAudioResources()
    setIsRecording(false)
    setAudioLevel(0)
  }

  const handleSaveAsCard = () => {
    if (!transcription.trim()) return
    onCreateCard?.(transcription.trim())
    alert('Card criado com sucesso a partir da fala!')
    onClose()
  }

  const handleSaveAsNote = async () => {
    if (!transcription.trim()) return
    const organized = await organizeTranscriptForNote(transcription.trim())
    onCreateNote?.('Ditado por Voz', organized || transcription.trim())
    alert('Nota criada com sucesso a partir da fala!')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        backdropFilter: 'blur(8px)',
      }}
    >
      <div
        style={{
          width: 440,
          padding: 24,
          borderRadius: 16,
          background: 'var(--color-surface, #1e1e2d)',
          border: '1px solid var(--color-border, rgba(255,255,255,0.12))',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-text)', margin: 0 }}>
            Ditado por Voz (OpenWhispr)
          </h2>
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
            Fale livremente para gravar notas ou criar tarefas automaticamente
          </p>
        </div>

        {error && <p role="alert">{error}</p>}
        {/* Indicador de Microfone Visual */}
        <div
          onClick={isRecording ? stopRecording : startRecording}
          style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: isRecording ? '#ef4444' : 'var(--color-primary, #6366f1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: isRecording
              ? `0 0 0 ${audioLevel / 3}px rgba(239, 68, 68, 0.4)`
              : '0 8px 24px rgba(99, 102, 241, 0.3)',
            transition: 'all 0.15s ease',
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" width="32" height="32">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="22" />
          </svg>
        </div>

        <span style={{ fontSize: 12, fontWeight: 700, color: isRecording ? '#ef4444' : 'var(--color-text-muted)' }}>
        {isTranscribing
          ? 'Transcrevendo áudio...'
          : isRecording
            ? 'Gravando... Clique para parar'
            : 'Clique no microfone para gravar'}
        </span>

        {/* Campo de Transcrição */}
        <textarea
          value={transcription}
          onChange={(e) => setTranscription(e.target.value)}
          placeholder="A transcrição da sua fala aparecerá aqui..."
          rows={4}
          style={{
            width: '100%',
            padding: 12,
            borderRadius: 8,
            border: '1px solid var(--color-border)',
            background: 'var(--color-background, #12121a)',
            color: 'var(--color-text)',
            fontSize: 13,
            resize: 'none',
          }}
        />

        {/* Botões de Ação */}
        <div style={{ display: 'flex', gap: 10, width: '100%', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 14px',
              borderRadius: 6,
              border: 'none',
              background: 'transparent',
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSaveAsNote}
            disabled={!transcription.trim() || isTranscribing}
            style={{
              padding: '8px 14px',
              borderRadius: 6,
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'rgba(255,255,255,0.05)',
              color: 'var(--color-text)',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            Salvar como Nota
          </button>

          <button
            type="button"
            onClick={handleSaveAsCard}
            disabled={!transcription.trim() || isTranscribing}
            style={{
              padding: '8px 16px',
              borderRadius: 6,
              border: 'none',
              background: 'var(--color-primary, #6366f1)',
              color: '#ffffff',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            Criar Card na Sprint
          </button>
        </div>
      </div>
    </div>
  )
}
