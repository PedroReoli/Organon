import React, { useEffect, useRef, useState } from 'react'
import type { Meeting, Settings } from '@types'
import { WhisperSidebar } from './components/WhisperSidebar'
import { SpeakerTimeline } from './components/SpeakerTimeline'
import { LiveMeetingPanel } from './components/LiveMeetingPanel'
import { MeetingIntelligencePanel } from './components/MeetingIntelligencePanel'
import { WhisperRecordingHero } from './components/WhisperRecordingHero'
import { WhisperContextWorkspace } from './components/WhisperContextWorkspace'
import { LiveSearchContextBanner } from './components/LiveSearchContextBanner'
import { GeneratedNoteModal } from './components/GeneratedNoteModal'
import { WhisperHeader } from './components/WhisperHeader'
import { WhisperDiagnosticsModal } from './components/WhisperDiagnosticsModal'
import { WhisperBulkActionsBar } from './components/WhisperBulkActionsBar'
import { TranscriptPromptSettingsModal } from '../TranscriptsPage/components/TranscriptPromptSettingsModal'
import { Sparkles, FileText, X } from 'lucide-react'
import '../../styles/features/whisper/whisper.css'

import { useWhisperPersistence } from './hooks/useWhisperPersistence'
import { useWhisperDiagnostics } from './hooks/useWhisperDiagnostics'
import { useWhisperRecording } from './hooks/useWhisperRecording'
import { useWhisperSelection } from './hooks/useWhisperSelection'
import { getAgentProviderLabel } from './utils/whisperUtils'
import '../../styles/features/whisper/whisper-context.css'
import '../../styles/features/whisper/whisper-intelligence.css'
import '../../styles/features/whisper/whisper-responsive.css'

interface Props {
  onExportToNote?: (title: string, content: string) => void
  meetings: Meeting[]
  settings: Settings
  onUpdateMeeting: (meetingId: string, updates: Partial<Meeting>) => void
  onRemoveMeeting: (meetingId: string) => void
  onReplaceMeetings: (meetings: Meeting[]) => void
  onUpdateSettings: (settings: Partial<Settings>) => void
}

export const WhisperPage: React.FC<Props> = ({
  onExportToNote,
  meetings,
  settings,
  onUpdateMeeting,
  onRemoveMeeting,
  onReplaceMeetings,
  onUpdateSettings,
}) => {
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
  } = useWhisperPersistence({
    meetings,
    settings,
    onUpdateMeeting,
    onRemoveMeeting,
    onReplaceMeetings,
    onUpdateSettings,
  })

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
    audioMetrics,
    liveSegments,
    setLiveSegments,
    liveReport,
    intelligenceData,
    setIntelligenceData,
    handleAskAgents,
    handleCancelResearch,
    handleCopilotSuggestion,
    handleExportResearch,
    handleStartRecording,
    handleStopRecording,
    handleSearchProjectFromSelection,
    handleSearchWebFromSelection,
  } = useWhisperRecording({
    projectContext,
    captureReadiness,
    selectedRecord,
    records,
    setRecords,
    showToast,
  })

  const displaySegments = isRecording || isTranscribing ? liveSegments : selectedRecord?.segments || records[0]?.segments || []
  const playbackRecord = selectedRecord || records[0]
  const audioElementRef = useRef<HTMLAudioElement | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [playbackMs, setPlaybackMs] = useState(0)

  useEffect(() => {
    let active = true
    setAudioUrl(null)
    setPlaybackMs(0)
    const audioPath = playbackRecord?.audio?.path || playbackRecord?.audioUrl
    if (!audioPath || !window.electronAPI?.getMeetingAudioUrl) return () => { active = false }
    void window.electronAPI.getMeetingAudioUrl(audioPath).then(url => {
      if (active) setAudioUrl(url)
    })
    return () => { active = false }
  }, [playbackRecord?.id, playbackRecord?.audio?.path, playbackRecord?.audioUrl])

  const activePlaybackSegmentId = audioUrl
    ? displaySegments.find(segment => {
      const start = segment.startMs ?? 0
      const end = segment.endMs ?? start
      return playbackMs >= start && playbackMs <= end
    })?.id ?? null
    : null

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
    handleRenameSpeaker,
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
  const [isIntelligencePanelOpen, setIsIntelligencePanelOpen] = useState(
    () => window.innerWidth > 1120,
  )
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [showDiagnosticsModal, setShowDiagnosticsModal] = useState(false)
  const [activeSideTab, setActiveSideTab] = useState<'intelligence' | 'summary'>('intelligence')
  const [quickWindowOpen, setQuickWindowOpen] = useState(false)

  useEffect(() => {
    const narrowLayout = window.matchMedia('(max-width: 1120px)')
    const handleLayoutChange = (event: MediaQueryListEvent) => {
      if (event.matches) setIsIntelligencePanelOpen(false)
    }

    narrowLayout.addEventListener('change', handleLayoutChange)
    return () => narrowLayout.removeEventListener('change', handleLayoutChange)
  }, [])

  useEffect(() => {
    void window.electronAPI?.superWhisperIsOpen?.().then(setQuickWindowOpen)
  }, [])

  const handleToggleQuickWindow = async () => {
    await window.electronAPI?.superWhisperToggle?.()
    const isOpen = await window.electronAPI?.superWhisperIsOpen?.()
    setQuickWindowOpen(Boolean(isOpen))
  }

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

  const handleExportToObsidian = async () => {
    if (!selectedRecord) {
      showToast('Nenhuma gravação selecionada para exportar.', 'info')
      return
    }
    try {
      let vaultPath = settings.obsidianVaultPath || null
      if (!vaultPath) {
        vaultPath = await window.electronAPI?.selectObsidianVault?.() || null
        if (!vaultPath) return
        onUpdateSettings({ obsidianVaultPath: vaultPath })
      }
      const result = await window.electronAPI.exportMeetingToObsidian({
        vaultPath,
        meeting: {
          id: selectedRecord.id,
          title: selectedRecord.title,
          createdAt: selectedRecord.createdAt,
          durationSeconds: selectedRecord.durationSeconds,
          mode: selectedRecord.mode,
          fullTranscript: selectedRecord.fullTranscript,
          segments: selectedRecord.segments,
          intelligenceData: selectedRecord.intelligenceData,
          audioPath: selectedRecord.audio?.path || selectedRecord.audioUrl,
        },
      })
      showToast(result.success ? 'Reunião atualizada no Obsidian.' : 'Não foi possível exportar ao Obsidian.', result.success ? 'success' : 'error')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Falha ao exportar ao Obsidian.', 'error')
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
        ? { background: 'rgba(69,213,161,0.12)', color: '#8ce8c5' }
        : { background: 'rgba(246,201,120,0.12)', color: '#f1ca81' })
      : { background: 'rgba(124,131,255,0.13)', color: '#b7bbff' }
    : (captureReadiness.displayCaptureReady
      ? { background: 'rgba(69,213,161,0.12)', color: '#8ce8c5' }
      : { background: 'rgba(240,82,95,0.12)', color: '#ff9ca5' })

  return (
    <div className="whisper-page-container">
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

      {/* Histórico Sidebar (Transição Suave de 280px para 0px) */}
      <div
        className="whisper-drawer-sidebar whisper-history-drawer"
        style={{
          width: isHistoryDrawerOpen ? '280px' : '0px',
          borderRight: isHistoryDrawerOpen ? '1px solid var(--color-border)' : 'none',
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
      <div className="whisper-center-workspace">
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
          handleExportToObsidian={() => { void handleExportToObsidian() }}
          setIsSettingsOpen={setIsSettingsOpen}
          systemStatus={systemStatus}
          systemStatusStyles={systemStatusStyles}
          modeLocked={isRecording || isTranscribing}
        />

        {/* Scrollable Main Stream Container */}
        <div className="whisper-scroll-body">
          {/* 1. Hero de Gravação no Topo (Elegante e Compacto) */}
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
            audioMetrics={audioMetrics}
            onToggleQuickWindow={() => { void handleToggleQuickWindow() }}
            quickWindowOpen={quickWindowOpen}
            onGenerateNotes={() => { setIsIntelligencePanelOpen(true); void handleAskAgents('Gere notas desta reunião com respostas pesquisadas, decisões e próximos passos.', 'report') }}
            isGeneratingNote={isGeneratingNote}
            canGenerateNotes={displaySegments.length > 0}
          />

          {/* 2. Configuração resumida de contexto e agentes (no modo reunião) */}
          {recordingMode !== 'prompt' && (
            <WhisperContextWorkspace
              config={projectContext}
              data={intelligenceData}
              onChange={setProjectContext}
              onAsk={async (question, scope) => {
                setIsIntelligencePanelOpen(true)
                await handleAskAgents(question, scope)
              }}
              onCancel={handleCancelResearch}
              onExport={handleExportResearch}
            />
          )}

          {/* 3. Banner de Feedback de Pesquisa e Perguntas ao Vivo */}
          <LiveSearchContextBanner
            data={intelligenceData}
            isRecording={isRecording}
          />

          {/* 4. Barra de Ações em Massa (Exclusão / Cópia / Destaques) */}
          {selectedSegmentIds.length > 0 && (
            <WhisperBulkActionsBar
              selectedCount={selectedSegmentIds.length}
              totalCount={displaySegments.length}
              onSelectAll={handleSelectAllSegments}
              onBulkCopy={handleBulkCopySelected}
              onBulkHighlight={handleBulkHighlightSelected}
              onDeleteSelected={handleDeleteSelectedSegments}
              onClearSelection={() => setSelectedSegmentIds([])}
            />
          )}

          {/* 5. Timeline Principal Dominante da Transcrição */}
          <div className="whisper-timeline-section">
            <div className="whisper-timeline-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileText size={13} />
                <span>Transcrição ({displaySegments.length} falas)</span>
              </div>
            </div>

            <div className="whisper-timeline-card">
              {audioUrl && (
                <div className="whisper-audio-playback">
                  <span>Áudio original</span>
                  <audio
                    ref={audioElementRef}
                    controls
                    preload="metadata"
                    src={audioUrl}
                    onTimeUpdate={event => setPlaybackMs(event.currentTarget.currentTime * 1000)}
                  />
                  <small>
                    {playbackRecord?.timingPrecision === 'none'
                      ? 'Transcrição sem timestamps precisos; o replay usa a faixa disponível.'
                      : 'Clique no horário de uma fala para buscar no áudio.'}
                  </small>
                </div>
              )}
              <SpeakerTimeline
                segments={displaySegments}
                activePlaybackSegmentId={activePlaybackSegmentId}
                onSeekSegment={segment => {
                  if (!audioElementRef.current) return
                  audioElementRef.current.currentTime = Math.max(0, (segment.startMs ?? 0) / 1000)
                  void audioElementRef.current.play()
                }}
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
                onRenameSpeaker={handleRenameSpeaker}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Painel Lateral Direito de Inteligência (Retrátil no Desktop) */}
      {isIntelligencePanelOpen && (
        <button
          type="button"
          className="whisper-drawer-backdrop"
          aria-label="Fechar painel de inteligência"
          onClick={() => setIsIntelligencePanelOpen(false)}
        />
      )}

      <div
        className="whisper-drawer-sidebar whisper-intelligence-drawer"
        style={{
          width: isIntelligencePanelOpen ? '350px' : '0px',
          display: 'flex',
          flexDirection: 'column',
          borderLeft: isIntelligencePanelOpen ? '1px solid var(--color-border)' : 'none',
        }}
      >
        <div className="whisper-side-tabs" role="tablist" aria-label="Painel da reunião">
          <button
            type="button"
            role="tab"
            aria-selected={activeSideTab === 'intelligence'}
            onClick={() => setActiveSideTab('intelligence')}
            className={activeSideTab === 'intelligence' ? 'is-active' : ''}
          >
            <Sparkles size={13} />
            <span>Inteligência</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeSideTab === 'summary'}
            onClick={() => setActiveSideTab('summary')}
            className={activeSideTab === 'summary' ? 'is-active' : ''}
          >
            <FileText size={13} />
            <span>Ata & Resumo</span>
          </button>

          <button
            type="button"
            className="whisper-side-close"
            aria-label="Fechar painel de inteligência"
            onClick={() => setIsIntelligencePanelOpen(false)}
          >
            <X size={15} />
          </button>
        </div>

        <div className="whisper-side-tab-content">
          {activeSideTab === 'intelligence' ? (
            <MeetingIntelligencePanel
              data={intelligenceData}
              agentProviderName={getAgentProviderLabel(projectContext?.agentProviderId)}
            />
          ) : (
            <LiveMeetingPanel
              liveReport={isRecording ? liveReport : selectedRecord?.liveReport || { discussedConcepts: [], forgottenPoints: [], actionItems: [] }}
              isLiveRecording={isRecording}
              intelligenceData={intelligenceData}
              onSuggestion={handleCopilotSuggestion}
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
