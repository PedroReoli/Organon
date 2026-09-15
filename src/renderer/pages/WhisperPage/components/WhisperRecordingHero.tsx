import React from 'react'

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
      desc: 'Captura contínua de microfone e sistema com ata e tarefas.',
      buttonText: 'Gravar Reunião',
    },
    interview: {
      label: 'Entrevista',
      desc: 'Suporte ao vivo com respostas rápidas no projeto/web.',
      buttonText: 'Iniciar Entrevista',
    },
    prompt: {
      label: 'Prompt por voz',
      desc: 'Comandos diretos por voz (ex: "resumir reunião", "pesquisar projeto").',
      buttonText: 'Ditado de Comando',
    },
  }

  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '10px',
        padding: '10px 14px',
        boxShadow: isRecording
          ? '0 4px 16px -4px rgba(239, 68, 68, 0.12)'
          : '0 1px 4px rgba(0,0,0,0.03)',
        transition: 'all 0.2s ease',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Barra de Progresso quando Gravando */}
      {isRecording && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '2px',
            background: 'linear-gradient(90deg, #ef4444, #f97316, #ef4444)',
            backgroundSize: '200% 100%',
            animation: 'gradientMove 2s infinite linear',
          }}
        />
      )}

      {/* Linha Superior Compacta */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '6px' }}>
        <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{recordingMode === 'prompt' ? 'Microfone · Ctrl+Shift+Space para ditado global' : (isRecording ? (systemCaptureActive ? 'Microfone + sistema ativos' : 'Microfone ativo') : (displayCaptureReady ? 'Microfone + áudio do sistema' : 'Captura de sistema indisponível'))}</span>

        {/* Lado Direito: Cronômetro, Botão Iniciar/Parar e Gerar Notas */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {isRecording && (
            <div
              style={{
                fontFamily: 'monospace',
                fontSize: '12px',
                fontWeight: 800,
                color: '#ef4444',
                background: 'rgba(239, 68, 68, 0.08)',
                padding: '3px 8px',
                borderRadius: '5px',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#ef4444', animation: 'pulse 1.2s infinite' }} />
              <span>{formatTimer(durationSeconds)}</span>
            </div>
          )}

          {!isRecording ? (
            <button
              type="button"
              disabled={isTranscribing}
              onClick={() => onStartRecording(recordingMode)}
              style={{
                padding: '5px 14px',
                height: '28px',
                borderRadius: '6px',
                border: 'none',
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                color: '#ffffff',
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                boxShadow: '0 2px 6px rgba(239, 68, 68, 0.2)',
              }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="9" />
              </svg>
              <span>{modeDetails[recordingMode].buttonText}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onStopRecording}
              style={{
                padding: '5px 14px',
                height: '28px',
                borderRadius: '6px',
                border: 'none',
                background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                color: '#ffffff',
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                boxShadow: '0 2px 6px rgba(34, 197, 94, 0.2)',
              }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
              <span>Encerrar Sessão</span>
            </button>
          )}

          {/* Botão Principal GERAR NOTAS */}
          <button
            type="button"
            onClick={onGenerateNotes}
            disabled={isGeneratingNote}
            style={{
              padding: '5px 14px',
              height: '28px',
              borderRadius: '6px',
              border: 'none',
              background: 'var(--color-primary)',
              color: '#ffffff',
              fontSize: '11.5px',
              fontWeight: 800,
              cursor: isGeneratingNote ? 'wait' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              boxShadow: '0 2px 8px color-mix(in srgb, var(--color-primary) 30%, transparent)',
              whiteSpace: 'nowrap',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <span>{isGeneratingNote ? 'Gerando...' : 'Gerar Notas'}</span>
          </button>

          {onToggleQuickWindow && (
            <button
              type="button"
              onClick={onToggleQuickWindow}
              style={{
                padding: '5px 12px',
                height: '28px',
                borderRadius: '6px',
                border: '1px solid var(--color-border)',
                background: quickWindowOpen ? 'color-mix(in srgb, var(--color-primary) 12%, var(--color-surface))' : 'var(--color-background)',
                color: quickWindowOpen ? 'var(--color-primary)' : 'var(--color-text)',
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                whiteSpace: 'nowrap',
              }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="4" y="4" width="16" height="16" rx="3" />
                <path d="M4 9h16" />
                <path d="M9 4v16" />
              </svg>
              <span>{quickWindowOpen ? 'Janela rápida aberta' : 'Abrir janela rápida'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Descrição Curta do Modo Atual */}
      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', flexWrap: 'wrap' }}>
        <span>{modeDetails[recordingMode].desc}</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '999px', border: '1px solid var(--color-border)', background: 'var(--color-background)', color: 'var(--color-text-muted)', fontSize: '10.5px', fontWeight: 700 }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2v20" />
            <path d="M2 12h20" />
          </svg>
          Painel principal + janela rápida
        </span>

        {isTranscribing && (
          <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-primary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--color-primary)', animation: 'pulse 1s infinite' }} />
            Transcrevendo...
          </span>
        )}
      </div>

      {/* Texto Provisório / Interim Live Preview */}
      {isRecording && interimText && (
        <div style={{ marginTop: '6px', padding: '6px 10px', borderRadius: '8px', background: 'color-mix(in srgb, var(--color-primary) 6%, var(--color-background))', border: '1px solid color-mix(in srgb, var(--color-primary) 18%, var(--color-border))', fontSize: '11px', fontStyle: 'italic', color: 'var(--color-primary)', lineHeight: 1.45 }}>
          <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '3px' }}>
            Trecho parcial ao vivo
          </span>
          {interimText}
        </div>
      )}
    </div>
  )
}
