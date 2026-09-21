import React from 'react'
import { Circle, Square, Sparkles, ExternalLink, Mic, Loader2, Radio } from 'lucide-react'

export type RecordingModeType = 'meeting' | 'interview' | 'prompt'

interface Props {
  isRecording: boolean
  isTranscribing: boolean
  recordingMode: RecordingModeType
  onStartRecording: (mode: RecordingModeType) => void
  onStopRecording: () => void
  onModeChange: (mode: RecordingModeType) => void
  onToggleQuickWindow?: () => void
  quickWindowOpen?: boolean
  systemCaptureActive: boolean
  displayCaptureReady: boolean
  interimText: string
  durationSeconds: number
  onGenerateNotes: () => void
  isGeneratingNote?: boolean
}

export const WhisperRecordingHero: React.FC<Props> = ({
  isRecording,
  isTranscribing,
  recordingMode,
  onStartRecording,
  onStopRecording,
  onToggleQuickWindow,
  quickWindowOpen = false,
  systemCaptureActive,
  displayCaptureReady,
  interimText,
  durationSeconds,
  onGenerateNotes,
  isGeneratingNote = false,
}) => {
  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60)
    const secs = sec % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const modeDetails = {
    meeting: {
      label: 'Reunião',
      desc: 'Captura contínua de microfone e sistema com pesquisa e ata inteligente.',
      buttonText: 'Gravar Reunião',
    },
    interview: {
      label: 'Entrevista',
      desc: 'Suporte com respostas rápidas e pesquisa no projeto e web.',
      buttonText: 'Iniciar Entrevista',
    },
    prompt: {
      label: 'Ditado Global',
      desc: 'Comandos rápidos por voz e transcrição contínua.',
      buttonText: 'Iniciar Ditado',
    },
  }

  const audioStatusText = isRecording
    ? systemCaptureActive
      ? 'Microfone + Sistema Ativos'
      : 'Microfone Ativo'
    : displayCaptureReady
      ? 'Microfone + Captura de Sistema Prontos'
      : 'Apenas Microfone Disponível'

  return (
    <section className={`whisper-hero-card ${isRecording ? 'recording' : ''}`} aria-label="Controle de Gravação">
      {/* Barra de Progresso Animada quando Gravando */}
      {isRecording && <div className="whisper-recording-progress" />}

      <div className="whisper-hero-main-row">
        {/* Esquerda: Status do Áudio + Timer */}
        <div className="whisper-hero-info">
          {isRecording ? (
            <div className="whisper-timer-badge">
              <span className="whisper-pulse-dot" />
              <span>{formatTimer(durationSeconds)}</span>
            </div>
          ) : (
            <div className="whisper-audio-spec-badge">
              <Mic size={14} style={{ color: 'var(--color-primary)' }} />
              <span>{audioStatusText}</span>
            </div>
          )}

          {isRecording && (
            <span style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Radio size={12} style={{ color: '#ef4444' }} />
              <span>Gravando ao vivo ({modeDetails[recordingMode].label})</span>
            </span>
          )}

          {isTranscribing && (
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-primary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Loader2 size={12} className="spin" />
              <span>Processando transcrição...</span>
            </span>
          )}
        </div>

        {/* Direita: Botão Gravar/Parar, Gerar Notas e Janela Rápida */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {!isRecording ? (
            <button
              type="button"
              disabled={isTranscribing}
              onClick={() => onStartRecording(recordingMode)}
              className="whisper-btn-record-start"
            >
              <Circle size={10} fill="currentColor" />
              <span>{modeDetails[recordingMode].buttonText}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onStopRecording}
              className="whisper-btn-record-stop"
            >
              <Square size={11} fill="currentColor" />
              <span>Encerrar Gravação</span>
            </button>
          )}

          {/* Botão Gerar Notas com IA */}
          <button
            type="button"
            onClick={onGenerateNotes}
            disabled={isGeneratingNote}
            className="whisper-btn-action-primary"
            title="Gera notas estruturadas da reunião com decisões e tarefas"
          >
            {isGeneratingNote ? (
              <Loader2 size={13} className="spin" />
            ) : (
              <Sparkles size={13} />
            )}
            <span>{isGeneratingNote ? 'Gerando...' : 'Gerar Notas IA'}</span>
          </button>

          {/* Botão Janela Rápida / Floating Pill */}
          {onToggleQuickWindow && (
            <button
              type="button"
              onClick={onToggleQuickWindow}
              className="whisper-btn-action-secondary"
              title="Abrir ou fechar a janela rápida flutuante"
            >
              <ExternalLink size={12} />
              <span>{quickWindowOpen ? 'Janela Aberta' : 'Janela Rápida'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Sublinha informativa discreta quando não estiver gravando */}
      {!isRecording && (
        <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <span>{modeDetails[recordingMode].desc}</span>
          <span style={{ fontSize: '10.5px', opacity: 0.8 }}>Dica: Pressione Ctrl+Shift+Space para ditado em qualquer lugar</span>
        </div>
      )}

      {/* Pré-visualização do texto parcial em tempo real (Interim) */}
      {isRecording && interimText && (
        <div className="whisper-interim-box">
          <Mic size={13} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', opacity: 0.85 }}>
              Falando agora:
            </strong>
            <span>{interimText}</span>
          </div>
        </div>
      )}
    </section>
  )
}
