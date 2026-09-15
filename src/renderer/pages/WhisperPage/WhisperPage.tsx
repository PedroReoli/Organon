import { MeetingResearchConsole } from './components/MeetingResearchConsole'
import React, { useState } from 'react'
import { WhisperSidebar } from './components/WhisperSidebar'
import { SpeakerTimeline } from './components/SpeakerTimeline'
import { LiveMeetingPanel } from './components/LiveMeetingPanel'
import { ProjectContextSelector } from './components/ProjectContextSelector'
import { MeetingIntelligencePanel } from './components/MeetingIntelligencePanel'
import { WhisperRecordingHero } from './components/WhisperRecordingHero'
import { LiveSearchContextBanner } from './components/LiveSearchContextBanner'
import { GeneratedNoteModal } from './components/GeneratedNoteModal'
import { WhisperHeader } from './components/WhisperHeader'
import { WhisperDiagnosticsModal } from './components/WhisperDiagnosticsModal'
import { WhisperBulkActionsBar } from './components/WhisperBulkActionsBar'
import { TranscriptPromptSettingsModal } from '../TranscriptsPage/components/TranscriptPromptSettingsModal'

import { useWhisperPersistence } from './hooks/useWhisperPersistence'
import { useWhisperDiagnostics } from './hooks/useWhisperDiagnostics'
import { useWhisperRecording } from './hooks/useWhisperRecording'
import { useWhisperSelection } from './hooks/useWhisperSelection'

interface Props {
  onExportToNote?: (title: string, content: string) => void
}

export const WhisperPage: React.FC<Props> = ({ onExportToNote }) => {
  // Toast Feedback Notification State
  const [toastNotification, setToastNotification] = useState<{ message: string; type: 'info' | 'success' | 'error' } | null>(null)

  const showToast = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setToastNotification({ message, type })
    setTimeout(() => setToastNotification(null), 3500)
  }

  // 1. Hook de Persistência (Folders, Records, ProjectContext)
  const {
    folders,
    records,
    setRecords,
    projectContext,
    setProjectContext,
    selectedRecordId,
    setSelectedRecordId,
    selectedFolderId,
    setSelectedFolderId,
    selectedRecord,
    handleAddFolder,
    handleRenameRecord,
    handleMoveRecord,
    handleDeleteRecord,
    handleNewTranscript,
  } = useWhisperPersistence()

  // 2. Hook de Diagnósticos do Whisper
  const {
    captureReadiness,
    whisperPathDiagnostics,
    readyDiagnosticsCount,
  } = useWhisperDiagnostics()

  // 3. Hook de Gravação e Transcrição Ao Vivo
  const {
    recordingMode,
    setRecordingMode,
    isRecording,
    isTranscribing,
    interimText,
    systemCaptureActive,
    durationSeconds,
    liveSegments,
    setLiveSegments,
    liveReport,
    intelligenceData,
    setIntelligenceData,
    handleAskAgents,
    handleCancelResearch,
    handleExportResearch,
    handleStartRecording,
    handleStopRecording,
    handleSearchProjectFromSelection,
    handleSearchWebFromSelection,
  } = useWhisperRecording({
    projectContext,
    captureReadiness,
    selectedRecord,
    setRecords,
    showToast,
  })

  const displaySegments = isRecording || isTranscribing ? liveSegments : selectedRecord?.segments || records[0]?.segments || []

  // 4. Hook de Seleção Múltipla, Ações e Geração de Nota
  const {
    selectedSegmentId,
    selectedSegmentIds,
    setSelectedSegmentIds,
    generatedNoteData,
    isGeneratedNoteModalOpen,
    setIsGeneratedNoteModalOpen,
    isGeneratingNote,
    handleTextSelection,
    handleSelectSegmentWithModifier,
    handleSelectAllSegments,
    handleDeleteSelectedSegments,
    handlePinHighlight,
    handleAddToNote,
    handleMarkAction,
    handleMarkDecision,
    handleBulkCopySelected,
    handleBulkHighlightSelected,
  } = useWhisperSelection({
    recordingMode,
    displaySegments,
    isRecording,
    selectedRecordId,
    selectedRecord,
    setLiveSegments,
    setRecords,
    setIntelligenceData,
    showToast,
  })

  // Controles de Visibilidade da Interface
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false)
  const [isIntelligencePanelOpen, setIsIntelligencePanelOpen] = useState(true)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [showDiagnosticsModal, setShowDiagnosticsModal] = useState(false)
  const [activeSideTab, setActiveSideTab] = useState<'intelligence' | 'summary'>('intelligence')

  // Handler para Exportar Relatório para Notas
  const handleExportToNotes = async () => {
    if (!selectedRecord) {
      showToast('Nenhuma gravação selecionada para exportar.', 'info')
      return
    }
    const reportText = intelligenceData.findings.length ? handleExportResearch() : `# ${selectedRecord.title}\n\n## Transcrição\n\n${selectedRecord.fullTranscript}`
    if (onExportToNote) {
      onExportToNote(selectedRecord.title, reportText)
      showToast('Relatório exportado para o aplicativo de Notas!', 'success')
    } else {
      void navigator.clipboard.writeText(reportText)
      showToast('Relatório copiado para a área de transferência!', 'success')
    }
  }

  // Estilos Dinâmicos do Status do Sistema
  const systemStatus = isRecording
    ? recordingMode === 'meeting'
      ? (systemCaptureActive ? 'Sistema capturado' : 'Sistema aguardando')
      : 'Sistema desativado no ditado'
    : (captureReadiness.displayCaptureReady ? 'Sistema pronto' : 'Sistema indisponível')

  const systemStatusStyles: React.CSSProperties = isRecording
    ? recordingMode === 'meeting'
      ? (systemCaptureActive
        ? { background: 'rgba(34,197,94,0.15)', color: '#16a34a' }
        : { background: 'rgba(245,158,11,0.16)', color: '#d97706' })
      : { background: 'rgba(99,102,241,0.14)', color: '#4f46e5' }
    : (captureReadiness.displayCaptureReady
      ? { background: 'rgba(34,197,94,0.15)', color: '#16a34a' }
      : { background: 'rgba(248,113,113,0.15)', color: '#dc2626' })

  return (
    <div
      style={{
        display: 'flex',
        height: '100%',
        width: '100%',
        background: 'var(--color-background)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Modal de Configurações do Whisper */}
      <TranscriptPromptSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* Popover / Modal de Diagnósticos dos Motores Whisper */}
      <WhisperDiagnosticsModal
        isOpen={showDiagnosticsModal}
        onClose={() => setShowDiagnosticsModal(false)}
        whisperPathDiagnostics={whisperPathDiagnostics}
        readyDiagnosticsCount={readyDiagnosticsCount}
      />

      {/* Toast Notification Container */}
      {toastNotification && (
        <div
          style={{
            position: 'absolute',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: toastNotification.type === 'error'
              ? '#dc2626'
              : toastNotification.type === 'success'
                ? '#16a34a'
                : 'var(--color-surface)',
            color: toastNotification.type === 'info' ? 'var(--color-text)' : '#ffffff',
            border: toastNotification.type === 'info' ? '1px solid var(--color-border)' : 'none',
            padding: '8px 16px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 700,
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            zIndex: 9999,
            pointerEvents: 'none',
          }}
        >
          {toastNotification.message}
        </div>
      )}

      {/* Histórico Sidebar na Grade de Layout (Transição Suave de 280px para 0px) */}
      <div
        style={{
          width: isHistoryDrawerOpen ? '280px' : '0px',
          height: '100%',
          flexShrink: 0,
          borderRight: isHistoryDrawerOpen ? '1px solid var(--color-border)' : 'none',
          background: 'var(--color-surface)',
          overflow: 'hidden',
          transition: 'width 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <WhisperSidebar
          folders={folders}
          records={records}
          selectedRecordId={selectedRecordId}
          selectedFolderId={selectedFolderId}
          onSelectRecord={setSelectedRecordId}
          onSelectFolder={setSelectedFolderId}
          onAddFolder={handleAddFolder}
          onRenameRecord={handleRenameRecord}
          onMoveRecord={handleMoveRecord}
          onDeleteRecord={handleDeleteRecord}
          onNewTranscript={handleNewTranscript}
        />
      </div>

      {/* Área Central Principal Dominante */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {/* Cabeçalho da Sessão */}
        <WhisperHeader
          selectedRecord={selectedRecord}
          recordingMode={recordingMode}
          setRecordingMode={(mode) => { if (!isRecording && !isTranscribing) setRecordingMode(mode) }}
          isHistoryDrawerOpen={isHistoryDrawerOpen}
          setIsHistoryDrawerOpen={setIsHistoryDrawerOpen}
          isIntelligencePanelOpen={isIntelligencePanelOpen}
          setIsIntelligencePanelOpen={setIsIntelligencePanelOpen}
          setShowDiagnosticsModal={setShowDiagnosticsModal}
          handleExportToNotes={handleExportToNotes}
          setIsSettingsOpen={setIsSettingsOpen}
          systemStatus={systemStatus}
          systemStatusStyles={systemStatusStyles}
        />

        {/* Scrollable Main Stream Container */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Seletor de Contexto de Projeto (Discreto no topo do stream) */}
          {recordingMode !== 'prompt' && <ProjectContextSelector
            config={projectContext}
            onChange={setProjectContext}
          />}

          <MeetingResearchConsole data={intelligenceData} hasProject={!!projectContext?.enabled && !!projectContext.path} allowWeb={projectContext?.allowWebResearch !== false}
            onAsk={async (question, scope) => { setIsIntelligencePanelOpen(true); await handleAskAgents(question, scope) }} onCancel={handleCancelResearch} onExport={handleExportResearch} />
          {/* Hero de Gravação Único e Coerente */}
          <WhisperRecordingHero
            isRecording={isRecording}
            isTranscribing={isTranscribing}
            recordingMode={recordingMode}
            onStartRecording={handleStartRecording}
            onStopRecording={async () => { const id = await handleStopRecording(); if (id) setSelectedRecordId(id) }}
            onModeChange={setRecordingMode}
            systemCaptureActive={systemCaptureActive}
            displayCaptureReady={captureReadiness.displayCaptureReady}
            interimText={interimText}
            durationSeconds={durationSeconds}
            onGenerateNotes={() => { setIsIntelligencePanelOpen(true); void handleAskAgents('Gere notas desta reunião com respostas pesquisadas, decisões e próximos passos.', 'report') }}
            isGeneratingNote={isGeneratingNote}
          />

          {/* Banner de Feedback de Pesquisa e Perguntas ao Vivo */}
          <LiveSearchContextBanner
            data={intelligenceData}
            isRecording={isRecording}
          />

          {/* Barra de Ações em Massa (Exclusão / Cópia / Destaques) */}
          {selectedSegmentIds.length > 0 && <WhisperBulkActionsBar
            selectedCount={selectedSegmentIds.length}
            totalCount={displaySegments.length}
            onSelectAll={handleSelectAllSegments}
            onBulkCopy={handleBulkCopySelected}
            onBulkHighlight={handleBulkHighlightSelected}
            onDeleteSelected={handleDeleteSelectedSegments}
            onClearSelection={() => setSelectedSegmentIds([])}
          />}

          {/* Timeline Principal da Transcrição com Listener de Seleção de Texto */}
          <div style={{ flex: 1, minHeight: '300px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
              <span>Transcrição</span>
            </div>

            <div style={{ flex: 1, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <SpeakerTimeline
                segments={displaySegments}
                selectedSegmentId={selectedSegmentId}
                selectedSegmentIds={selectedSegmentIds}
                onSelectSegment={handleSelectSegmentWithModifier}
                onTextMouseUp={handleTextSelection}
                onCopySegment={(segment) => {
                  void navigator.clipboard.writeText(segment.text)
                  showToast('Trecho copiado!', 'success')
                }}
                onPinHighlight={handlePinHighlight}
                onAddToNote={handleAddToNote}
                onMarkAction={handleMarkAction}
                onMarkDecision={handleMarkDecision}
                onSearchProject={handleSearchProjectFromSelection}
                onSearchWeb={handleSearchWebFromSelection}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Painel Secundário Compacto de Inteligência (Retrátil no Desktop) */}
      <div
        style={{
          width: isIntelligencePanelOpen ? '340px' : '0px',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          borderLeft: isIntelligencePanelOpen ? '1px solid var(--color-border)' : 'none',
          background: 'var(--color-surface)',
          flexShrink: 0,
          overflow: 'hidden',
          transition: 'width 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Selector de Abas do Painel Secundário */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
          <button
            onClick={() => setActiveSideTab('intelligence')}
            style={{
              flex: 1,
              padding: '12px 10px',
              fontSize: '12px',
              fontWeight: 700,
              border: 'none',
              background: activeSideTab === 'intelligence' ? 'var(--color-background)' : 'transparent',
              color: activeSideTab === 'intelligence' ? 'var(--color-primary)' : 'var(--color-text-muted)',
              borderBottom: activeSideTab === 'intelligence' ? '2px solid var(--color-primary)' : 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <span>Inteligência</span>
          </button>

          <button
            onClick={() => setActiveSideTab('summary')}
            style={{
              flex: 1,
              padding: '12px 10px',
              fontSize: '12px',
              fontWeight: 700,
              border: 'none',
              background: activeSideTab === 'summary' ? 'var(--color-background)' : 'transparent',
              color: activeSideTab === 'summary' ? 'var(--color-primary)' : 'var(--color-text-muted)',
              borderBottom: activeSideTab === 'summary' ? '2px solid var(--color-primary)' : 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <span>Ata & Resumo</span>
          </button>
        </div>

        <div style={{ flex: 1, overflow: 'hidden' }}>
          {activeSideTab === 'intelligence' ? (
            <MeetingIntelligencePanel
              data={intelligenceData}
              agentProviderName="Codex CLI · Web, código e relator"
            />
          ) : (
            <LiveMeetingPanel
              liveReport={isRecording ? liveReport : selectedRecord?.liveReport || { discussedConcepts: [], forgottenPoints: [], actionItems: [] }}
              isLiveRecording={isRecording}
            />
          )}
        </div>
      </div>

      {/* Modal de Exibição da Nota Gerada via IPC */}
      <GeneratedNoteModal
        isOpen={isGeneratedNoteModalOpen}
        noteData={generatedNoteData}
        onClose={() => setIsGeneratedNoteModalOpen(false)}
        onExportToNotes={handleExportToNotes}
      />
    </div>
  )
}
