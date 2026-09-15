import React, { useState, useEffect, useMemo } from 'react'
import { TranscriptPromptSettingsModal } from './components/TranscriptPromptSettingsModal'
import { generateTranscriptReport } from '../../services/transcriptReportService'

// ============================================================
// TYPES
// ============================================================

interface Transcript {
  id: string
  text: string
  timestamp: string
  source?: 'whisper' | 'manual'
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export const TranscriptsPage: React.FC = () => {
  const [transcripts, setTranscripts] = useState<Transcript[]>([])
  const [search, setSearch] = useState('')
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false)
  const [filter, setFilter] = useState<'all' | 'today' | 'week' | 'month'>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
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
    const updated = transcripts.filter(t => t.id !== id)
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

  const [wakeWordEnabled, setWakeWordEnabled] = useState(false)
  const [wakeWordName, setWakeWordName] = useState('Organon')

  useEffect(() => {
    window.electronAPI?.getWakeWordConfig?.().then((cfg) => {
      if (cfg) {
        setWakeWordEnabled(cfg.enabled)
        setWakeWordName(cfg.keyword || 'Organon')
      }
    })
  }, [])

  function toggleWakeWord() {
    const next = !wakeWordEnabled
    setWakeWordEnabled(next)
    window.electronAPI?.setWakeWordConfig?.({ enabled: next, keyword: wakeWordName })
  }

  function convertToNote(text: string) {
    const event = new CustomEvent('notes:create-from-transcript', { detail: { text, title: 'Nota de Voz' } })
    window.dispatchEvent(event)
    alert('Transcrição enviada para o Módulo de Notas!')
  }

  function openSuperWhisper() {
    window.electronAPI?.superWhisperShow?.()
  }

  function toggleExpand(id: string) {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Filtra por texto e data
  const filtered = useMemo(() => {
    return transcripts.filter(t => {
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
      <div className="transcripts-toolbar">
        <div className="transcripts-toolbar-top">
          <div className="transcripts-toolbar-left">
            <button
              className="transcripts-btn-primary"
              onClick={openSuperWhisper}
              title="Abrir janela flutuante do Super Whisper (Ctrl+Shift+V)"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
              <span>Abrir Gravador</span>
            </button>

            <button
              className="transcripts-btn-secondary"
              onClick={() => setIsPromptModalOpen(true)}
              title="Configurar prompts e modelo de relatório IA"
            >
              <span>⚙️ Configurar Prompts</span>
            </button>

            {transcripts.length > 0 && (
              <button
                className="transcripts-btn-secondary"
                onClick={clearAllTranscripts}
                title="Limpar todas as transcrições"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                <span>Limpar</span>
              </button>
            )}
          </div>

          <div className="transcripts-toolbar-center">
            {transcripts.length > 0 && (
              <div className="transcripts-search">
                <svg className="transcripts-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  className="transcripts-search-input"
                  placeholder="Buscar transcrições..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
                {search && (
                  <button className="transcripts-search-clear" onClick={() => setSearch('')} title="Limpar busca">
                    ✕
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="transcripts-toolbar-right">
            {transcripts.length > 0 && (
              <>
                <div className="transcripts-stats">
                  <span><strong>{transcripts.length}</strong> itens</span>
                  <span>·</span>
                  <span><strong>{totalWords}</strong> palavras</span>
                </div>

                <div className="transcripts-filter-tabs">
                  {(['all', 'today', 'week', 'month'] as const).map(f => (
                    <button
                      key={f}
                      className={`transcripts-filter-tab ${filter === f ? 'is-active' : ''}`}
                      onClick={() => setFilter(f)}
                    >
                      {f === 'all' && 'Todas'}
                      {f === 'today' && 'Hoje'}
                      {f === 'week' && 'Semana'}
                      {f === 'month' && 'Mês'}
                    </button>
                  ))}
                </div>

                <div className="transcripts-view-toggle">
                  <button
                    className={`transcripts-view-btn ${viewMode === 'grid' ? 'is-active' : ''}`}
                    onClick={() => setViewMode('grid')}
                    title="Visualização em grade"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="7" height="7" />
                      <rect x="14" y="3" width="7" height="7" />
                      <rect x="14" y="14" width="7" height="7" />
                      <rect x="3" y="14" width="7" height="7" />
                    </svg>
                  </button>
                  <button
                    className={`transcripts-view-btn ${viewMode === 'list' ? 'is-active' : ''}`}
                    onClick={() => setViewMode('list')}
                    title="Visualização em lista"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="8" y1="6" x2="21" y2="6" />
                      <line x1="8" y1="12" x2="21" y2="12" />
                      <line x1="8" y1="18" x2="21" y2="18" />
                      <line x1="3" y1="6" x2="3.01" y2="6" />
                      <line x1="3" y1="12" x2="3.01" y2="12" />
                      <line x1="3" y1="18" x2="3.01" y2="18" />
                    </svg>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Conteúdo com Grid / Lista Responsiva */}
      <div className="transcripts-content">
        {transcripts.length === 0 ? (
          <div className="transcripts-empty">
            <div className="transcripts-empty-glow" />
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="transcripts-empty-icon">
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
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <p>Nenhum resultado encontrado para "{search}"</p>
          </div>
        ) : (
          <div className={`transcripts-grid ${viewMode === 'list' ? 'is-list' : ''}`}>
            {filtered.map(t => {
              const wordCount = t.text.split(/\s+/).filter(Boolean).length
              const isExpanded = expandedIds.has(t.id)
              const isLong = t.text.length > 220

              return (
                <div key={t.id} className={`transcripts-card ${isExpanded ? 'is-expanded' : ''}`}>
                  <div className="transcripts-card-header">
                    <div className="transcripts-card-meta">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transcripts-card-icon">
                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      </svg>
                      <span className="transcripts-card-time">{formatDate(t.timestamp)}</span>
                      <span className="transcripts-badge">{wordCount} palavras</span>
                    </div>

                    <div className="transcripts-card-actions">
                      <button
                        className="transcripts-card-action"
                        onClick={() => copyToClipboard(t.text)}
                        title="Copiar texto"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                      </button>
                      <button
                        className="transcripts-card-action"
                        onClick={() => sendToAI(t.text)}
                        title="Enviar para IA"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 2L2 7l10 5 10-5-10-5z" />
                          <polyline points="2 17 12 22 22 17" />
                          <polyline points="2 12 12 17 22 12" />
                        </svg>
                      </button>
                      <button
                        className="transcripts-card-action transcripts-card-action-danger"
                        onClick={() => deleteTranscript(t.id)}
                        title="Excluir"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className={`transcripts-card-content ${isExpanded ? 'is-open' : ''}`}>
                    {t.text}
                  </div>

                  {isLong && (
                    <button className="transcripts-expand-btn" onClick={() => toggleExpand(t.id)}>
                      {isExpanded ? 'Ver menos ↑' : 'Ver tudo ↓'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <style>{transcriptsStyles}</style>
    </div>
  )
}

// ============================================================
// STYLES GLASSMORPHIC & RESPONSIVO (7 BREAKPOINTS)
// ============================================================

const transcriptsStyles = `
.transcripts-page {
  display: flex;
  flex-direction: column;
  flex: 1;
  width: 100%;
  height: 100%;
  background: var(--color-background, #0f172a);
  color: var(--color-text, #f8fafc);
  overflow: hidden;
}

/* ---- Toolbar Responsiva ---- */
.transcripts-toolbar {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px 20px;
  border-bottom: 1px solid var(--color-border, rgba(255, 255, 255, 0.08));
  background: color-mix(in srgb, var(--color-surface, #1e293b) 50%, transparent);
  backdrop-filter: blur(12px);
  flex-shrink: 0;
}

.transcripts-toolbar-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.transcripts-toolbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.transcripts-toolbar-center {
  flex: 1;
  min-width: 220px;
  display: flex;
  justify-content: center;
}

.transcripts-toolbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.transcripts-btn-primary,
.transcripts-btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border-radius: 8px;
  border: 1px solid transparent;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.transcripts-btn-primary {
  background: linear-gradient(135deg, var(--color-primary, #3b82f6) 0%, #6366f1 100%);
  color: white;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
}

.transcripts-btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 14px rgba(59, 130, 246, 0.5);
}

.transcripts-btn-secondary {
  background: rgba(239, 68, 68, 0.12);
  border-color: rgba(239, 68, 68, 0.3);
  color: #f87171;
}

.transcripts-btn-secondary:hover {
  background: rgba(239, 68, 68, 0.22);
  border-color: #ef4444;
  color: #fca5a5;
}

/* ---- Busca ---- */
.transcripts-search {
  position: relative;
  width: 100%;
  max-width: 420px;
}

.transcripts-search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-muted, #94a3b8);
  pointer-events: none;
}

.transcripts-search-input {
  width: 100%;
  background: var(--color-background, #0f172a);
  border: 1px solid var(--color-border, rgba(255, 255, 255, 0.1));
  border-radius: 8px;
  padding: 7px 32px 7px 34px;
  color: var(--color-text, #f8fafc);
  font-size: 12px;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.transcripts-search-input:focus {
  border-color: var(--color-primary, #3b82f6);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary, #3b82f6) 25%, transparent);
}

.transcripts-search-clear {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  width: 18px;
  height: 18px;
  border: none;
  background: var(--color-surface, #1e293b);
  border-radius: 50%;
  color: var(--color-text-muted, #94a3b8);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
}

.transcripts-search-clear:hover {
  background: #ef4444;
  color: white;
}

/* ---- Stats & Badges ---- */
.transcripts-stats {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--color-text-muted, #94a3b8);
}

.transcripts-stats strong {
  color: var(--color-text, #f8fafc);
  font-weight: 700;
}

.transcripts-badge {
  font-size: 10px;
  font-weight: 700;
  color: var(--color-primary, #3b82f6);
  background: color-mix(in srgb, var(--color-primary, #3b82f6) 15%, transparent);
  padding: 2px 8px;
  border-radius: 10px;
}

/* ---- Filter Tabs ---- */
.transcripts-filter-tabs {
  display: flex;
  background: var(--color-background, #0f172a);
  border: 1px solid var(--color-border, rgba(255, 255, 255, 0.1));
  border-radius: 8px;
  padding: 2px;
}

.transcripts-filter-tab {
  padding: 4px 10px;
  border: none;
  background: transparent;
  color: var(--color-text-muted, #94a3b8);
  font-size: 11px;
  font-weight: 600;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.transcripts-filter-tab:hover {
  color: var(--color-text, #f8fafc);
}

.transcripts-filter-tab.is-active {
  background: var(--color-primary, #3b82f6);
  color: white;
}

/* ---- View Toggle ---- */
.transcripts-view-toggle {
  display: flex;
  gap: 2px;
  background: var(--color-background, #0f172a);
  border: 1px solid var(--color-border, rgba(255, 255, 255, 0.1));
  border-radius: 8px;
  padding: 2px;
}

.transcripts-view-btn {
  width: 28px;
  height: 26px;
  border: none;
  background: transparent;
  color: var(--color-text-muted, #94a3b8);
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.transcripts-view-btn:hover {
  color: var(--color-text, #f8fafc);
}

.transcripts-view-btn.is-active {
  background: var(--color-primary, #3b82f6);
  color: white;
}

/* ---- Content Area ---- */
.transcripts-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

/* ---- Empty & No Results ---- */
.transcripts-empty,
.transcripts-no-results {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  text-align: center;
  min-height: 280px;
  color: var(--color-text-muted, #94a3b8);
}

.transcripts-empty-title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text, #f8fafc);
}

.transcripts-empty-text {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
}

.transcripts-empty-text kbd {
  background: var(--color-surface, #1e293b);
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-family: monospace;
  border: 1px solid var(--color-border, rgba(255, 255, 255, 0.1));
}

/* ---- Grid Layout ---- */
.transcripts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  align-content: start;
}

.transcripts-grid.is-list {
  grid-template-columns: 1fr;
}

/* ---- Card Glassmorphic ---- */
.transcripts-card {
  background: color-mix(in srgb, var(--color-surface, #1e293b) 65%, transparent);
  backdrop-filter: blur(12px);
  border: 1px solid var(--color-border, rgba(255, 255, 255, 0.08));
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: border-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
}

.transcripts-card:hover {
  border-color: var(--color-primary, #3b82f6);
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
}

.transcripts-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.transcripts-card-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--color-text-muted, #94a3b8);
  min-width: 0;
}

.transcripts-card-icon {
  color: var(--color-primary, #3b82f6);
  flex-shrink: 0;
}

.transcripts-card-time {
  font-weight: 600;
  color: var(--color-text, #f8fafc);
  white-space: nowrap;
}

.transcripts-card-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.transcripts-card-action {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: var(--color-text-muted, #94a3b8);
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.transcripts-card-action:hover {
  background: var(--color-background, #0f172a);
  color: var(--color-text, #f8fafc);
}

.transcripts-card-action-danger:hover {
  background: rgba(239, 68, 68, 0.18);
  color: #f87171;
}

.transcripts-card-content {
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--color-text, #f8fafc);
  max-height: 120px;
  overflow: hidden;
  position: relative;
  transition: max-height 0.3s ease;
}

.transcripts-card-content.is-open {
  max-height: 800px;
  overflow-y: auto;
}

.transcripts-expand-btn {
  border: none;
  background: transparent;
  color: var(--color-primary, #3b82f6);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  align-self: flex-start;
  padding: 0;
  margin-top: -4px;
}

/* ============================================================
   RESPONSIVIDADE (7 BREAKPOINTS)
   ============================================================ */

@media (max-width: 1024px) {
  .transcripts-toolbar-top {
    flex-direction: column;
    align-items: stretch;
  }
  .transcripts-toolbar-center {
    max-width: 100%;
  }
  .transcripts-search {
    max-width: 100%;
  }
}

@media (max-width: 768px) {
  .transcripts-content {
    padding: 14px;
  }
  .transcripts-grid {
    grid-template-columns: 1fr;
  }
  .transcripts-toolbar-right {
    justify-content: space-between;
  }
}

@media (max-width: 480px) {
  .transcripts-toolbar {
    padding: 10px 12px;
  }
  .transcripts-stats {
    display: none;
  }
  .transcripts-card {
    padding: 12px;
  }
}

@media (max-width: 375px) {
  .transcripts-btn-primary span,
  .transcripts-btn-secondary span {
    display: none;
  }
}
`