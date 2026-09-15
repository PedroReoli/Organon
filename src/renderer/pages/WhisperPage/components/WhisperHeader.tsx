import React from 'react'
import { RecordingModeType } from './WhisperRecordingHero'
import { ScreenShareStealthBadge } from './ScreenShareStealthBadge'
import { WhisperRecord } from '../types/whisper.types'

interface WhisperHeaderProps {
  selectedRecord: WhisperRecord | undefined
  recordingMode: RecordingModeType
  setRecordingMode: (mode: RecordingModeType) => void
  isHistoryDrawerOpen: boolean
  setIsHistoryDrawerOpen: (open: boolean) => void
  isIntelligencePanelOpen: boolean
  setIsIntelligencePanelOpen: (open: boolean) => void
  setShowDiagnosticsModal: (open: boolean) => void
  handleExportToNotes: () => void
  setIsSettingsOpen: (open: boolean) => void
  systemStatus: string
  systemStatusStyles: React.CSSProperties
}

export const WhisperHeader: React.FC<WhisperHeaderProps> = ({
  selectedRecord,
  recordingMode,
  setRecordingMode,
  isHistoryDrawerOpen,
  setIsHistoryDrawerOpen,
  isIntelligencePanelOpen,
  setIsIntelligencePanelOpen,
  setShowDiagnosticsModal,
  handleExportToNotes,
  setIsSettingsOpen,
  systemStatus,
  systemStatusStyles,
}) => {
  return (
    <div
      style={{
        padding: '12px 20px',
        borderBottom: '1px solid var(--color-border)',
        background: 'var(--color-surface)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
        {/* Botão para alternar a sidebar de histórico */}
        <button
          onClick={() => setIsHistoryDrawerOpen(!isHistoryDrawerOpen)}
          title="Histórico de transcrições"
          style={{
            padding: '4px 10px',
            height: '28px',
            borderRadius: '6px',
            border: '1px solid var(--color-border)',
            background: isHistoryDrawerOpen ? 'color-mix(in srgb, var(--color-primary) 12%, transparent)' : 'var(--color-background)',
            color: isHistoryDrawerOpen ? 'var(--color-primary)' : 'var(--color-text)',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '5px',
            whiteSpace: 'nowrap',
            lineHeight: '1',
            flexShrink: 0,
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <line x1="9" y1="3" x2="9" y2="21" />
          </svg>
          <span>Histórico</span>
        </button>

        <h1
          style={{
            margin: 0,
            fontSize: '15px',
            fontWeight: 800,
            color: 'var(--color-text)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {selectedRecord ? selectedRecord.title : 'Whisper Live Copilot'}
        </h1>

        {/* Seletor de Modo Limpo 1-Clique (Reunião / Entrevista / Prompt) */}
        <div style={{ display: 'inline-flex', background: 'var(--color-background)', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '2px', gap: '2px', marginLeft: '4px' }}>
          {(['prompt', 'meeting'] as const).map(m => {
            const active = recordingMode === m
            const labelMap = { meeting: 'Reunião e inteligência', interview: 'Entrevista', prompt: 'Ditado e notas' }
            return (
              <button
                key={m}
                type="button"
                onClick={() => setRecordingMode(m)}
                style={{
                  padding: '3px 8px',
                  borderRadius: '4px',
                  border: 'none',
                  background: active ? 'var(--color-surface)' : 'transparent',
                  color: active ? 'var(--color-primary)' : 'var(--color-text-muted)',
                  fontSize: '11px',
                  fontWeight: active ? 800 : 600,
                  cursor: 'pointer',
                  boxShadow: active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  whiteSpace: 'nowrap',
                  lineHeight: 1,
                }}
              >
                {labelMap[m]}
              </button>
            )
          })}
        </div>

        {/* Status pill interativo */}
        <button
          onClick={() => setShowDiagnosticsModal(true)}
          style={{
            fontSize: '11px',
            fontWeight: 700,
            padding: '3px 10px',
            borderRadius: '12px',
            border: 'none',
            cursor: 'pointer',
            ...systemStatusStyles,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
          title="Clique para ver detalhes do sistema de áudio"
        >
          {systemStatus}
          <span style={{ fontSize: '9px', opacity: 0.7 }}>ℹ</span>
        </button>

        <ScreenShareStealthBadge />
      </div>

      {/* Controles do Cabeçalho */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
        <button
          onClick={handleExportToNotes}
          style={{
            padding: '4px 10px',
            height: '28px',
            borderRadius: '6px',
            border: '1px solid var(--color-border)',
            background: 'var(--color-background)',
            color: 'var(--color-text)',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '5px',
            whiteSpace: 'nowrap',
            lineHeight: '1',
            flexShrink: 0,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          <span>Exportar</span>
        </button>

        <button
          onClick={() => setIsSettingsOpen(true)}
          style={{
            padding: '4px 10px',
            height: '28px',
            borderRadius: '6px',
            border: '1px solid var(--color-border)',
            background: 'var(--color-background)',
            color: 'var(--color-text)',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '5px',
            whiteSpace: 'nowrap',
            lineHeight: '1',
            flexShrink: 0,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          <span>Configurações e modelos</span>
        </button>

        {/* Alternar Painel Secundário de Inteligência */}
        <button
          onClick={() => setIsIntelligencePanelOpen(!isIntelligencePanelOpen)}
          title="Alternar Painel de Inteligência"
          style={{
            padding: '4px 10px',
            height: '28px',
            borderRadius: '6px',
            border: '1px solid var(--color-border)',
            background: isIntelligencePanelOpen ? 'color-mix(in srgb, var(--color-primary) 12%, transparent)' : 'var(--color-background)',
            color: isIntelligencePanelOpen ? 'var(--color-primary)' : 'var(--color-text)',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '5px',
            whiteSpace: 'nowrap',
            lineHeight: '1',
            flexShrink: 0,
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <line x1="15" y1="3" x2="15" y2="21" />
          </svg>
          <span>Inteligência</span>
        </button>
      </div>
    </div>
  )
}
