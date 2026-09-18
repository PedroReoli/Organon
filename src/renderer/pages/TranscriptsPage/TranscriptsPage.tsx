import React, { useState, useEffect, useMemo } from 'react'
import type { Transcript, TranscriptFilter, TranscriptViewMode } from './types'
import {
  TranscriptPromptSettingsModal,
  TranscriptsToolbar,
  TranscriptCard,
} from './components'
import { transcriptsStyles } from './transcripts.styles'

export const TranscriptsPage: React.FC = () => {
  const [transcripts, setTranscripts] = useState<Transcript[]>([])
  const [search, setSearch] = useState('')
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false)
  const [filter, setFilter] = useState<TranscriptFilter>('all')
  const [viewMode, setViewMode] = useState<TranscriptViewMode>('grid')
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadTranscripts()
  }, [])

  function loadTranscripts() {
    try {
      const saved = localStorage.getItem('super-whisper-history')
      if (saved) {
        setTranscripts(JSON.parse(saved))
      } else {
        setTranscripts([])
      }
    } catch (e) {
      console.error('Erro ao carregar transcrições:', e)
      setTranscripts([])
    }
  }

  function clearAllTranscripts() {
    if (!confirm(`Limpar todas as ${transcripts.length} transcrições?`)) return
    localStorage.removeItem('super-whisper-history')
    setTranscripts([])
  }

  function deleteTranscript(id: string) {
    if (!confirm('Deletar esta transcrição?')) return
    const updated = transcripts.filter((t) => t.id !== id)
    localStorage.setItem('super-whisper-history', JSON.stringify(updated))
    setTranscripts(updated)
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
  }

  function sendToAI(text: string) {
    const event = new CustomEvent('transcript:send-to-ai', { detail: { text } })
    window.dispatchEvent(event)
  }

  function openSuperWhisper() {
    window.electronAPI?.superWhisperShow?.()
  }

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Filtra por texto e data
  const filtered = useMemo(() => {
    return transcripts.filter((t) => {
      if (search && !t.text.toLowerCase().includes(search.toLowerCase())) return false

      if (filter !== 'all') {
        const tDate = new Date(t.timestamp)
        const now = new Date()
        const diffMs = now.getTime() - tDate.getTime()
        const diffDays = diffMs / (1000 * 60 * 60 * 24)

        if (filter === 'today' && diffDays > 1) return false
        if (filter === 'week' && diffDays > 7) return false
        if (filter === 'month' && diffDays > 30) return false
      }

      return true
    })
  }, [transcripts, search, filter])

  const totalWords = useMemo(() => {
    return transcripts.reduce((sum, t) => sum + t.text.split(/\s+/).filter(Boolean).length, 0)
  }, [transcripts])

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="transcripts-page">
      {isPromptModalOpen && (
        <TranscriptPromptSettingsModal onClose={() => setIsPromptModalOpen(false)} />
      )}

      {/* Toolbar responsiva */}
      <TranscriptsToolbar
        search={search}
        onSearchChange={setSearch}
        filter={filter}
        onFilterChange={setFilter}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        totalCount={transcripts.length}
        totalWords={totalWords}
        onOpenRecorder={openSuperWhisper}
        onOpenPromptModal={() => setIsPromptModalOpen(true)}
        onClearAll={clearAllTranscripts}
      />

      {/* Conteúdo com Grid / Lista Responsiva */}
      <div className="transcripts-content">
        {transcripts.length === 0 ? (
          <div className="transcripts-empty">
            <div className="transcripts-empty-glow" />
            <svg
              width="56"
              height="56"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transcripts-empty-icon"
            >
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
            <h2 className="transcripts-empty-title">Nenhuma transcrição cadastrada</h2>
            <p className="transcripts-empty-text">
              Grave notas de voz com o <strong>Super Whisper</strong> e acompanhe o histórico aqui.
              <br />
              Atalho global: <kbd>Ctrl+Shift+V</kbd>
            </p>
            <button className="transcripts-btn-primary" onClick={openSuperWhisper}>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
              <span>Gravar Novo Áudio</span>
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="transcripts-no-results">
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <p>Nenhum resultado encontrado para "{search}"</p>
          </div>
        ) : (
          <div className={`transcripts-grid ${viewMode === 'list' ? 'is-list' : ''}`}>
            {filtered.map((t) => (
              <TranscriptCard
                key={t.id}
                transcript={t}
                isExpanded={expandedIds.has(t.id)}
                onToggleExpand={toggleExpand}
                onCopy={copyToClipboard}
                onSendToAI={sendToAI}
                onDelete={deleteTranscript}
                formatDate={formatDate}
              />
            ))}
          </div>
        )}
      </div>

      <style>{transcriptsStyles}</style>
    </div>
  )
}