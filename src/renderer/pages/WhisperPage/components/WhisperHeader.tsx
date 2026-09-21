import React from 'react'
import { PanelLeft, PanelRight, FileText, Settings, Sparkles } from 'lucide-react'
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
    <header className="whisper-header-bar">
      <div className="whisper-header-left">
        {/* Toggle Histórico Drawer */}
        <button
          type="button"
          onClick={() => setIsHistoryDrawerOpen(!isHistoryDrawerOpen)}
          title={isHistoryDrawerOpen ? 'Recolher histórico' : 'Ver histórico de transcrições'}
          className={`whisper-btn-icon-label ${isHistoryDrawerOpen ? 'active' : ''}`}
        >
          <PanelLeft size={14} />
          <span>Histórico</span>
        </button>

        {/* Título da Sessão / Gravação */}
        <h1 className="whisper-title">
          {selectedRecord ? selectedRecord.title : 'Whisper Live Copilot'}
        </h1>

        {/* Seletor de Modo (Reunião / Ditado) */}
        <div className="whisper-mode-switcher">
          {(['meeting', 'prompt'] as const).map((m) => {
            const active = recordingMode === m
            const labelMap = {
              meeting: 'Reunião & IA',
              prompt: 'Ditado Global',
              interview: 'Entrevista',
            }
            return (
              <button
                key={m}
                type="button"
                onClick={() => setRecordingMode(m)}
                className={`whisper-mode-btn ${active ? 'active' : ''}`}
              >
                {m === 'meeting' ? <Sparkles size={12} /> : null}
                <span>{labelMap[m]}</span>
              </button>
            )
          })}
        </div>

        {/* Status Pill do Sistema de Áudio */}
        <button
          type="button"
          onClick={() => setShowDiagnosticsModal(true)}
          className="whisper-status-pill"
          style={systemStatusStyles}
          title="Clique para inspecionar microfone e status do sistema"
        >
          <span>{systemStatus}</span>
          <span style={{ fontSize: '9px', opacity: 0.7 }}>ℹ</span>
        </button>

        <ScreenShareStealthBadge />
      </div>

      {/* Ações do Topo */}
      <div className="whisper-header-right">
        <button
          type="button"
          onClick={handleExportToNotes}
          className="whisper-btn-icon-label"
          title="Exportar transcrição para o app de Notas"
        >
          <FileText size={13} />
          <span>Exportar Notas</span>
        </button>

        <button
          type="button"
          onClick={() => setIsSettingsOpen(true)}
          className="whisper-btn-icon-label"
          title="Configurações e modelos do Whisper"
        >
          <Settings size={13} />
          <span>Modelos</span>
        </button>

        {/* Toggle Painel Lateral de Inteligência */}
        <button
          type="button"
          onClick={() => setIsIntelligencePanelOpen(!isIntelligencePanelOpen)}
          title={isIntelligencePanelOpen ? 'Recolher inteligência' : 'Abrir inteligência e atas'}
          className={`whisper-btn-icon-label ${isIntelligencePanelOpen ? 'active' : ''}`}
        >
          <PanelRight size={14} />
          <span>Inteligência</span>
        </button>
      </div>
    </header>
  )
}
