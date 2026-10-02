import React from 'react'
import { BookOpen, FileText, Info, Mic, PanelLeft, PanelRight, Settings, Sparkles } from 'lucide-react'
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
  handleExportToObsidian: () => void
  setIsSettingsOpen: (open: boolean) => void
  systemStatus: string
  systemStatusStyles: React.CSSProperties
  modeLocked?: boolean
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
  handleExportToObsidian,
  setIsSettingsOpen,
  systemStatus,
  systemStatusStyles,
  modeLocked = false,
}) => {
  return (
    <header className="whisper-header-bar">
      {/* Esquerda: Histórico e Título */}
      <div className="whisper-header-left">
        <button
          type="button"
          onClick={() => setIsHistoryDrawerOpen(!isHistoryDrawerOpen)}
          title={isHistoryDrawerOpen ? 'Recolher histórico' : 'Ver histórico de transcrições'}
          className={`whisper-btn-icon-label ${isHistoryDrawerOpen ? 'active' : ''}`}
        >
          <PanelLeft size={14} />
          <span className="whisper-btn-text">Histórico</span>
        </button>

        <h1
          className="whisper-title"
          title={selectedRecord ? selectedRecord.title : 'Whisper Live Copilot'}
        >
          {selectedRecord ? selectedRecord.title : 'Whisper Live Copilot'}
        </h1>
      </div>

      {/* Centro: Seletor de Modo Limpo */}
      <div className="whisper-header-center">
        <div className="whisper-mode-switcher">
          <button
            type="button"
            onClick={() => setRecordingMode('meeting')}
            disabled={modeLocked}
            className={`whisper-mode-btn ${recordingMode === 'meeting' ? 'active' : ''}`}
            title="Modo Reunião: grava microfone e sistema com ata e tarefas automáticas"
          >
            <Sparkles size={12} />
            <span>Reunião & IA</span>
          </button>

          <button
            type="button"
            onClick={() => setRecordingMode('prompt')}
            disabled={modeLocked}
            className={`whisper-mode-btn ${recordingMode === 'prompt' ? 'active' : ''}`}
            title="Modo Ditado: ditado por voz contínuo para comandos e notas"
          >
            <Mic size={12} />
            <span>Ditado</span>
          </button>
        </div>
      </div>

      {/* Direita: Status, Stealth e Ações */}
      <div className="whisper-header-right">
        {/* Status Pill do Sistema de Áudio */}
        <button
          type="button"
          onClick={() => setShowDiagnosticsModal(true)}
          className="whisper-status-pill"
          style={systemStatusStyles}
          title="Clique para inspecionar microfone e status do sistema"
        >
          <Info size={12} />
          <span>{systemStatus}</span>
        </button>

        <ScreenShareStealthBadge />

        <button
          type="button"
          onClick={handleExportToNotes}
          className="whisper-btn-icon-label"
          title="Exportar transcrição para o app de Notas"
        >
          <FileText size={13} />
          <span className="whisper-btn-text">Exportar</span>
        </button>

        <button
          type="button"
          onClick={handleExportToObsidian}
          disabled={!selectedRecord}
          className="whisper-btn-icon-label"
          title="Exportar ou atualizar esta reunião no Obsidian"
        >
          <BookOpen size={13} />
          <span className="whisper-btn-text">Obsidian</span>
        </button>

        <button
          type="button"
          onClick={() => setIsSettingsOpen(true)}
          className="whisper-btn-icon-label"
          title="Configurações e modelos do Whisper"
        >
          <Settings size={13} />
          <span className="whisper-btn-text">Modelos</span>
        </button>

        <button
          type="button"
          onClick={() => setIsIntelligencePanelOpen(!isIntelligencePanelOpen)}
          title={isIntelligencePanelOpen ? 'Recolher inteligência' : 'Abrir inteligência e atas'}
          className={`whisper-btn-icon-label ${isIntelligencePanelOpen ? 'active' : ''}`}
        >
          <PanelRight size={14} />
          <span className="whisper-btn-text">Inteligência</span>
        </button>
      </div>
    </header>
  )
}
