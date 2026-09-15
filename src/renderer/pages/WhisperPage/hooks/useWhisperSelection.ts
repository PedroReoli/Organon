import React, { useState } from 'react'
import { SpeakerSegment, WhisperRecord } from '../types/whisper.types'
import { RecordingModeType } from '../components/WhisperRecordingHero'
import { SelectionAnalysis } from '../components/SelectionActionBar'
import { TranscriptNoteData } from '../components/GeneratedNoteModal'

interface SelectionProps {
  recordingMode: RecordingModeType
  displaySegments: SpeakerSegment[]
  isRecording: boolean
  selectedRecordId: string | null
  selectedRecord: WhisperRecord | undefined
  setLiveSegments: React.Dispatch<React.SetStateAction<SpeakerSegment[]>>
  setRecords: React.Dispatch<React.SetStateAction<WhisperRecord[]>>
  setIntelligenceData: React.Dispatch<React.SetStateAction<any>>
  showToast: (message: string, type?: 'info' | 'success' | 'error') => void
}

export function useWhisperSelection({
  recordingMode,
  displaySegments,
  isRecording,
  selectedRecordId,
  selectedRecord,
  setLiveSegments,
  setRecords,
  setIntelligenceData,
  showToast,
}: SelectionProps) {
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null)
  const [selectedSegmentIds, setSelectedSegmentIds] = useState<string[]>([])
  const [selectedTextSnippet, setSelectedTextSnippet] = useState<string>('')
  const [selectionAnalysis, setSelectionAnalysis] = useState<SelectionAnalysis | null>(null)
  const [isAnalyzingSelection, setIsAnalyzingSelection] = useState(false)

  const [generatedNoteData, setGeneratedNoteData] = useState<TranscriptNoteData | null>(null)
  const [isGeneratedNoteModalOpen, setIsGeneratedNoteModalOpen] = useState(false)
  const [isGeneratingNote, setIsGeneratingNote] = useState(false)

  const handleTextSelection = async (text: string) => {
    if (!text || text.trim().length === 0) {
      setSelectedTextSnippet('')
      setSelectionAnalysis(null)
      return
    }

    const trimmed = text.trim()
    setSelectedTextSnippet(trimmed)
    setIsAnalyzingSelection(true)

    try {
      if (window.electronAPI?.analyzeTranscriptSelection) {
        const res = await window.electronAPI.analyzeTranscriptSelection({ text: trimmed, mode: recordingMode })
        setSelectionAnalysis(res)
      } else {
        setSelectionAnalysis({
          intent: 'note',
          summary: trimmed,
          suggestions: [
            { id: 'convert-note', label: 'Adicionar à nota', description: 'Inclui o trecho na nota.' },
            { id: 'pin-highlight', label: 'Destacar', description: 'Mantém o trecho em evidência.' },
          ],
        })
      }
    } catch (err) {
      console.warn('[useWhisperSelection] Analisar seleção falhou:', err)
    } finally {
      setIsAnalyzingSelection(false)
    }
  }

  const handleSelectSegmentWithModifier = (segment: SpeakerSegment, e?: React.MouseEvent) => {
    const isCtrlOrCmd = e?.ctrlKey || e?.metaKey
    const isShift = e?.shiftKey

    if (isCtrlOrCmd) {
      setSelectedSegmentIds(prev =>
        prev.includes(segment.id) ? prev.filter(id => id !== segment.id) : [...prev, segment.id]
      )
      setSelectedSegmentId(segment.id)
    } else if (isShift && selectedSegmentIds.length > 0) {
      const lastSelectedId = selectedSegmentIds[selectedSegmentIds.length - 1]
      const lastIndex = displaySegments.findIndex(s => s.id === lastSelectedId)
      const currentIndex = displaySegments.findIndex(s => s.id === segment.id)

      if (lastIndex !== -1 && currentIndex !== -1) {
        const start = Math.min(lastIndex, currentIndex)
        const end = Math.max(lastIndex, currentIndex)
        const rangeIds = displaySegments.slice(start, end + 1).map(s => s.id)
        setSelectedSegmentIds(Array.from(new Set([...selectedSegmentIds, ...rangeIds])))
      } else {
        setSelectedSegmentIds([segment.id])
      }
      setSelectedSegmentId(segment.id)
    } else {
      setSelectedSegmentIds([segment.id])
      setSelectedSegmentId(segment.id)
    }
  }

  const handleSelectAllSegments = () => {
    if (selectedSegmentIds.length === displaySegments.length) {
      setSelectedSegmentIds([])
    } else {
      setSelectedSegmentIds(displaySegments.map(s => s.id))
    }
  }

  const handleDeleteSelectedSegments = () => {
    if (selectedSegmentIds.length === 0) return

    const count = selectedSegmentIds.length

    if (isRecording) {
      setLiveSegments(prev => prev.filter(s => !selectedSegmentIds.includes(s.id)))
    } else if (selectedRecordId) {
      setRecords(prev =>
        prev.map(rec => {
          if (rec.id !== selectedRecordId) return rec
          const updatedSegments = (rec.segments || []).filter(s => !selectedSegmentIds.includes(s.id))
          return {
            ...rec,
            segments: updatedSegments,
            fullTranscript: updatedSegments.map(s => `${s.speakerName}: ${s.text}`).join('\n\n'),
          }
        })
      )
    }

    setSelectedSegmentIds([])
    setSelectedSegmentId(null)
    showToast(`${count} trecho(s) excluído(s) com sucesso.`, 'info')
  }

  const handlePinHighlight = (text: string) => {
    const timestamp = new Date().toLocaleTimeString('pt-BR')
    setIntelligenceData((prev: any) => ({
      ...prev,
      findings: [
        ...prev.findings,
        {
          id: `finding-${Date.now()}`,
          timestamp,
          question: text,
          summary: text,
          sources: [
            {
              type: 'project',
              title: 'Trecho destacado pelo usuário',
              pathOrUrl: 'whisper://selection',
              snippet: text,
            },
          ],
          confidence: 0.9,
        },
      ],
    }))
    showToast('Trecho destacado!', 'success')
  }

  const handleAddToNote = (_text: string) => {
    showToast('Trecho adicionado ao fluxo da nota!', 'success')
  }

  const handleMarkAction = (text: string) => {
    setIntelligenceData((prev: any) => ({
      ...prev,
      actionItems: [
        ...prev.actionItems,
        {
          id: `action-${Date.now()}`,
          task: text,
          assignee: 'Pendente',
          status: 'pending',
          timestamp: new Date().toLocaleTimeString('pt-BR'),
        },
      ],
    }))
    showToast('Tarefa criada!', 'success')
  }

  const handleMarkDecision = (text: string) => {
    setIntelligenceData((prev: any) => ({
      ...prev,
      decisions: [
        ...prev.decisions,
        {
          id: `decision-${Date.now()}`,
          text,
          timestamp: new Date().toLocaleTimeString('pt-BR'),
        },
      ],
    }))
    showToast('Decisão salva!', 'success')
  }

  const handleBulkCopySelected = () => {
    if (selectedSegmentIds.length === 0) return
    const selectedItems = displaySegments.filter(s => selectedSegmentIds.includes(s.id))
    const textToCopy = selectedItems.map(s => `${s.speakerName} (${s.timestamp}): ${s.text}`).join('\n\n')
    void navigator.clipboard.writeText(textToCopy)
    showToast(`${selectedItems.length} trecho(s) copiado(s)!`, 'success')
  }

  const handleBulkHighlightSelected = () => {
    if (selectedSegmentIds.length === 0) return
    const selectedItems = displaySegments.filter(s => selectedSegmentIds.includes(s.id))
    for (const item of selectedItems) {
      handlePinHighlight(item.text)
    }
    showToast(`${selectedItems.length} trecho(s) destacado(s)!`, 'success')
  }

  const handleGenerateNotes = async () => {
    setIsGeneratingNote(true)
    try {
      const fullTranscriptText = displaySegments.map(s => `${s.speakerName}: ${s.text}`).join('\n\n')
      const modeTitleLabel = recordingMode === 'interview' ? 'Entrevista' : recordingMode === 'prompt' ? 'Prompt por voz' : 'Reunião'
      const noteTitle = selectedRecord ? selectedRecord.title : `Nota de ${modeTitleLabel}`

      let noteRes: TranscriptNoteData

      if (window.electronAPI?.generateTranscriptNote) {
        noteRes = await window.electronAPI.generateTranscriptNote({
          title: noteTitle,
          transcript: fullTranscriptText || 'Nenhuma transcrição gravada nesta sessão.',
          mode: recordingMode,
          selectedSnippets: selectedTextSnippet ? [selectedTextSnippet] : [],
        })
      } else {
        noteRes = {
          title: noteTitle,
          markdown: `# ${noteTitle}\n\n## Resumo\nSessão transcrita e estruturada com sucesso.\n\n## Transcrição\n${fullTranscriptText}`,
          summary: 'Sessão transcrita e organizada.',
          highlights: selectedTextSnippet ? [selectedTextSnippet] : [],
          questions: [],
          decisions: [],
          actionItems: [],
          words: fullTranscriptText ? fullTranscriptText.split(/\s+/).filter(Boolean).length : 0,
          segments: displaySegments.length,
        }
      }

      setGeneratedNoteData(noteRes)
      setIsGeneratedNoteModalOpen(true)
      showToast('Nota gerada com sucesso!', 'success')
    } catch (err: any) {
      console.error('[useWhisperSelection] Gerar nota falhou:', err)
      showToast('Erro ao gerar nota.', 'error')
    } finally {
      setIsGeneratingNote(false)
    }
  }

  return {
    selectedSegmentId,
    setSelectedSegmentId,
    selectedSegmentIds,
    setSelectedSegmentIds,
    selectedTextSnippet,
    setSelectedTextSnippet,
    selectionAnalysis,
    isAnalyzingSelection,
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
    handleGenerateNotes,
  }
}
