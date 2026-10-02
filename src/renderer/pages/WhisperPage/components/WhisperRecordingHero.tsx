import React from 'react'
import { Circle, Command, ExternalLink, Loader2, Mic, Power, Radio, Sparkles, Square } from 'lucide-react'
import type { WhisperAudioMetrics } from '../types/whisper.types'

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
  shortcutEnabled?: boolean
  shortcutRegistered?: boolean
  shortcutBusy?: boolean
  onToggleShortcut?: () => void
  systemCaptureActive: boolean
  displayCaptureReady: boolean
  interimText: string
  durationSeconds: number
  audioMetrics: WhisperAudioMetrics
  onGenerateNotes: () => void
  isGeneratingNote?: boolean
  canGenerateNotes?: boolean
}

export const WhisperRecordingHero: React.FC<Props> = ({
  isRecording,
  isTranscribing,
  recordingMode,
  onStartRecording,
  onStopRecording,
  onToggleQuickWindow,
  quickWindowOpen = false,
  shortcutEnabled = true,
  shortcutRegistered = false,
  shortcutBusy = false,
  onToggleShortcut,
  systemCaptureActive,
  displayCaptureReady,
  interimText,
  durationSeconds,
  audioMetrics,
  onGenerateNotes,
  isGeneratingNote = false,
  canGenerateNotes = false,
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

  const qualityLabel = {
    silent: 'Sem sinal',
    low: 'Sinal baixo',
    good: 'Sinal bom',
    clipping: 'Áudio saturando',
  }[audioMetrics.quality]

  return (
    <section className={`whisper-hero-card ${isRecording ? 'recording' : ''}`} aria-label="Controle de Gravação">
      {/* Barra de Progresso Animada quando Gravando */}
      {isRecording && <div className="whisper-recording-progress" />}

      <div className="whisper-hero-main-row">
        <div className="whisper-hero-info">
          {isRecording ? (
            <div className="whisper-timer-badge">
              <span className="whisper-pulse-dot" />
              <span>{formatTimer(durationSeconds)}</span>
            </div>
          ) : (
            <div className="whisper-ready-state">
              <span className="whisper-ready-state-icon" aria-hidden="true"><Mic size={17} /></span>
              <span className="whisper-ready-state-copy">
                <strong>Pronto para {modeDetails[recordingMode].label.toLowerCase()}</strong>
                <span>{audioStatusText}</span>
              </span>
            </div>
          )}

          {isRecording && (
            <div className="whisper-live-meter" aria-label={`Qualidade do áudio: ${qualityLabel}`}>
              <span className="whisper-live-label">
                <Radio size={13} />
                <span>{modeDetails[recordingMode].label} ao vivo</span>
              </span>
              <div className="whisper-live-waveform" aria-hidden="true">
                {(audioMetrics.waveform.length ? audioMetrics.waveform : Array(18).fill(0.08)).map((value, index) => (
                  <span key={index} style={{ height: `${Math.max(3, value * 22)}px` }} />
                ))}
              </div>
              <span className={`whisper-quality-badge ${audioMetrics.quality}`}>{qualityLabel}</span>
            </div>
          )}

          {isTranscribing && (
            <span className="whisper-processing-state" role="status">
              <Loader2 size={12} className="spin" />
              <span>Finalizando transcrição…</span>
            </span>
          )}
        </div>

        <div className="whisper-hero-actions">
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
            disabled={!canGenerateNotes || isGeneratingNote}
            className="whisper-btn-action-primary"
            title={canGenerateNotes ? 'Gerar ata com decisões e próximos passos' : 'Grave ou selecione uma transcrição antes de gerar a ata'}
          >
            {isGeneratingNote ? (
              <Loader2 size={13} className="spin" />
            ) : (
              <Sparkles size={13} />
            )}
            <span>{isGeneratingNote ? 'Gerando…' : 'Gerar ata com IA'}</span>
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

      {!isRecording && (
        <div className="whisper-hero-meta">
          <span>{modeDetails[recordingMode].desc}</span>
          <div className="whisper-shortcut-controls">
            <span className="whisper-shortcut-hint" aria-hidden="true">
              <Command size={12} />
              <kbd>Ctrl</kbd><kbd>Shift</kbd><kbd>Space</kbd>
            </span>
            {onToggleShortcut && (
              <button
                type="button"
                role="switch"
                aria-checked={shortcutEnabled}
                disabled={shortcutBusy}
                onClick={onToggleShortcut}
                className={`whisper-shortcut-toggle ${shortcutEnabled ? 'is-enabled' : ''} ${shortcutEnabled && !shortcutRegistered ? 'is-unavailable' : ''}`}
                title={shortcutEnabled
                  ? 'Desativar o atalho global de ditado'
                  : 'Ativar o atalho global de ditado'}
              >
                <Power size={12} />
                <span>
                  <strong>Atalho global</strong>
                  <small>{shortcutBusy
                    ? 'Alterando…'
                    : shortcutEnabled
                      ? shortcutRegistered ? 'Ligado' : 'Indisponível'
                      : 'Desligado'}</small>
                </span>
                <span className="whisper-shortcut-toggle-track" aria-hidden="true"><span /></span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Pré-visualização do texto parcial em tempo real (Interim) */}
      {isRecording && interimText && (
        <div className="whisper-interim-box">
          <Mic size={14} className="whisper-interim-icon" />
          <div>
            <strong>Ouvindo agora</strong>
            <span>{interimText}</span>
          </div>
        </div>
      )}
    </section>
  )
}
