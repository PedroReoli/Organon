import React, { useState, useEffect, useMemo } from 'react'
import { isElectron } from '@utils'

// ============================================================
// TYPES
// ============================================================

interface Transcript {
  id: string
  text: string
  timestamp: string
  source?: 'whisper' | 'manual'
}

type AudioSection = 'recorder' | 'history' | 'settings'

const HISTORY_KEY = 'super-whisper-history'

// ============================================================
// MAIN COMPONENT
// ============================================================

export const AudioPage: React.FC = () => {
  const [section, setSection] = useState<AudioSection>('recorder')
  const [transcripts, setTranscripts] = useState<Transcript[]>([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'today' | 'week' | 'month'>('all')

  useEffect(() => {
    loadTranscripts()
    // Escuta atualizações do storage (caso o popup salve algo enquanto
    // a página está aberta em outra janela/aba, ou recarregue).
    const onStorage = (e: StorageEvent) => {
      if (e.key === HISTORY_KEY) loadTranscripts()
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  function loadTranscripts() {
    try {
      const saved = localStorage.getItem(HISTORY_KEY)
      setTranscripts(saved ? JSON.parse(saved) : [])
    } catch (e) {
      console.error('[AudioPage] erro ao carregar histórico:', e)
      setTranscripts([])
    }
  }

  function clearAllTranscripts() {
    if (!confirm(`Limpar todas as ${transcripts.length} transcrições?`)) return
    localStorage.removeItem(HISTORY_KEY)
    setTranscripts([])
  }

  function deleteTranscript(id: string) {
    if (!confirm('Deletar esta transcrição?')) return
    const updated = transcripts.filter((t) => t.id !== id)
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated))
    setTranscripts(updated)
  }

  function copyToClipboard(text: string) {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text)
    } else {
      // fallback
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
  }

  function sendToAI(text: string) {
    window.dispatchEvent(new CustomEvent('transcript:send-to-ai', { detail: { text } }))
    window.dispatchEvent(new CustomEvent('chatbot:open', { detail: { text } }))
  }

  function openPopup() {
    if (isElectron() && window.electronAPI?.superWhisperShow) {
      window.electronAPI.superWhisperShow()
    } else {
      alert('O popup do Super Whisper só funciona dentro do app Electron.')
    }
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

  const totalChars = transcripts.reduce((sum, t) => sum + t.text.length, 0)
  const totalWords = transcripts.reduce((sum, t) => sum + t.text.split(/\s+/).filter(Boolean).length, 0)

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
    <div className="projects-shell projects-theme">
      {/* Sidebar interna do Audio */}
      <nav className="projects-sidebar">
        <div className="projects-sidebar-header">
          <div className="projects-sidebar-logo">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          </div>
          <div>
            <div className="projects-sidebar-title">Áudio</div>
            <div className="projects-sidebar-subtitle">Gravações e transcrições</div>
          </div>
        </div>

        <div className="projects-sidebar-nav">
          <button
            type="button"
            className={`projects-sidebar-item ${section === 'recorder' ? 'is-active' : ''}`}
            onClick={() => setSection('recorder')}
          >
            <span className="projects-sidebar-item-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </span>
            <span className="projects-sidebar-item-label">Gravador</span>
          </button>

          <button
            type="button"
            className={`projects-sidebar-item ${section === 'history' ? 'is-active' : ''}`}
            onClick={() => setSection('history')}
          >
            <span className="projects-sidebar-item-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 8v4l3 3" />
                <circle cx="12" cy="12" r="10" />
              </svg>
            </span>
            <span className="projects-sidebar-item-label">Histórico</span>
            {transcripts.length > 0 && (
              <span className="projects-sidebar-item-badge">{transcripts.length}</span>
            )}
          </button>

          <button
            type="button"
            className={`projects-sidebar-item ${section === 'settings' ? 'is-active' : ''}`}
            onClick={() => setSection('settings')}
          >
            <span className="projects-sidebar-item-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </span>
            <span className="projects-sidebar-item-label">Configurações</span>
          </button>
        </div>

        <div className="projects-sidebar-footer">
          <button
            type="button"
            className="projects-btn projects-btn-primary"
            onClick={openPopup}
            style={{ width: '100%' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            </svg>
            Abrir Popup
          </button>
        </div>
      </nav>

      {/* Conteúdo principal */}
      <main className="projects-content-wrapper">
        <div className="projects-content-scroll">
          {section === 'recorder' && (
            <RecorderSection
              transcripts={transcripts}
              totalWords={totalWords}
              totalChars={totalChars}
              onOpenPopup={openPopup}
              onClearAll={clearAllTranscripts}
            />
          )}

          {section === 'history' && (
            <HistorySection
              transcripts={filtered}
              search={search}
              setSearch={setSearch}
              filter={filter}
              setFilter={setFilter}
              totalCount={transcripts.length}
              totalWords={totalWords}
              formatDate={formatDate}
              onCopy={copyToClipboard}
              onSendToAI={sendToAI}
              onDelete={deleteTranscript}
              onClearAll={clearAllTranscripts}
              onOpenPopup={openPopup}
            />
          )}

          {section === 'settings' && <SettingsSection />}
        </div>
      </main>

      <style>{audioPageStyles}</style>
    </div>
  )
}

// ============================================================
// RECORDER SECTION
// ============================================================

interface RecorderSectionProps {
  transcripts: Transcript[]
  totalWords: number
  totalChars: number
  onOpenPopup: () => void
  onClearAll: () => void
}

const RecorderSection: React.FC<RecorderSectionProps> = ({
  transcripts,
  totalWords,
  totalChars,
  onOpenPopup,
  onClearAll,
}) => (
  <>
    <div className="projects-header">
      <div>
        <h1 className="projects-title">Áudio</h1>
        <p className="projects-subtitle">
          Grave sua voz e transcreva em texto. O popup flutuante (Ctrl+Shift+V) usa Web Speech API.
        </p>
      </div>
      <div className="projects-actions">
        <button className="projects-btn projects-btn-primary" onClick={onOpenPopup}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
          Abrir Super Whisper
        </button>
      </div>
    </div>

    {/* Stats */}
    <div className="projects-stats-bar">
      <div className="projects-stat-card stat-blue">
        <div className="projects-stat-value">{transcripts.length}</div>
        <div className="projects-stat-label">Transcrições</div>
      </div>
      <div className="projects-stat-card stat-green">
        <div className="projects-stat-value">{totalWords}</div>
        <div className="projects-stat-label">Palavras</div>
      </div>
      <div className="projects-stat-card stat-yellow">
        <div className="projects-stat-value">{totalChars.toLocaleString('pt-BR')}</div>
        <div className="projects-stat-label">Caracteres</div>
      </div>
    </div>

    {/* Card principal de gravação */}
    <div className="projects-dashboard-card">
      <h2 className="projects-card-title">Gravador</h2>
      <div className="audio-recorder-info">
        <p>
          Para gravar áudio, use o atalho global <kbd>Ctrl+Shift+V</kbd> ou clique em
          <strong> Abrir Super Whisper</strong>.
        </p>
        <p className="audio-recorder-info-secondary">
          O popup usa a Web Speech API do navegador (Chromium). As transcrições são salvas
          em <code>localStorage</code> e ficam disponíveis aqui automaticamente.
        </p>
      </div>
      {transcripts.length > 0 && (
        <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
          <button
            type="button"
            className="projects-btn"
            style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}
            onClick={onClearAll}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            Limpar tudo
          </button>
        </div>
      )}
    </div>
  </>
)

// ============================================================
// HISTORY SECTION
// ============================================================

interface HistorySectionProps {
  transcripts: Transcript[]
  search: string
  setSearch: (v: string) => void
  filter: 'all' | 'today' | 'week' | 'month'
  setFilter: (f: 'all' | 'today' | 'week' | 'month') => void
  totalCount: number
  totalWords: number
  formatDate: (iso: string) => string
  onCopy: (text: string) => void
  onSendToAI: (text: string) => void
  onDelete: (id: string) => void
  onClearAll: () => void
  onOpenPopup: () => void
}

const HistorySection: React.FC<HistorySectionProps> = ({
  transcripts,
  search,
  setSearch,
  filter,
  setFilter,
  totalCount,
  totalWords,
  formatDate,
  onCopy,
  onSendToAI,
  onDelete,
  onClearAll,
  onOpenPopup,
}) => (
  <>
    <div className="projects-header">
      <div>
        <h1 className="projects-title">Histórico de transcrições</h1>
        <p className="projects-subtitle">
          {totalCount} transcrições · {totalWords} palavras no total
        </p>
      </div>
      <div className="projects-actions">
        <button className="projects-btn projects-btn-primary" onClick={onOpenPopup}>
          Nova gravação
        </button>
      </div>
    </div>

    <div className="projects-dashboard-card">
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 16 }}>
        <input
          type="text"
          className="projects-input"
          placeholder="Buscar nas transcrições..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 200 }}
        />

        <div style={{ display: 'flex', gap: 4, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 6, padding: 2 }}>
          {(['all', 'today', 'week', 'month'] as const).map((f) => (
            <button
              key={f}
              type="button"
              className={`projects-btn ${filter === f ? 'projects-btn-primary' : ''}`}
              style={{ padding: '5px 10px', fontSize: 12 }}
              onClick={() => setFilter(f)}
            >
              {f === 'all' && 'Todas'}
              {f === 'today' && 'Hoje'}
              {f === 'week' && 'Semana'}
              {f === 'month' && 'Mês'}
            </button>
          ))}
        </div>

        {transcripts.length > 0 && (
          <button
            type="button"
            className="projects-btn"
            style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}
            onClick={onClearAll}
          >
            Limpar tudo
          </button>
        )}
      </div>

      {totalCount === 0 ? (
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--color-text-muted)' }}>
          Nenhuma transcrição ainda. Use o Super Whisper para começar.
        </div>
      ) : transcripts.length === 0 ? (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-muted)' }}>
          Nenhuma transcrição encontrada com "{search}"
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {transcripts.map((t) => (
            <div
              key={t.id}
              style={{
                padding: 12,
                background: 'var(--color-background)',
                border: '1px solid var(--color-border)',
                borderRadius: 8,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600 }}>
                  {formatDate(t.timestamp)} · {t.text.split(/\s+/).filter(Boolean).length} palavras
                </span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    type="button"
                    title="Copiar"
                    onClick={() => onCopy(t.text)}
                    style={audioIconButtonStyle}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    title="Enviar para IA"
                    onClick={() => onSendToAI(t.text)}
                    style={audioIconButtonStyle}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2L2 7l10 5 10-5-10-5z" />
                      <polyline points="2 17 12 22 22 17" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    title="Deletar"
                    onClick={() => onDelete(t.id)}
                    style={{ ...audioIconButtonStyle, color: 'var(--color-danger)' }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.55, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {t.text}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  </>
)

// ============================================================
// SETTINGS SECTION
// ============================================================

const SettingsSection: React.FC = () => (
  <>
    <div className="projects-header">
      <div>
        <h1 className="projects-title">Configurações de Áudio</h1>
        <p className="projects-subtitle">Preferências do gravador e transcrição</p>
      </div>
    </div>

    <div className="projects-dashboard-card">
      <h2 className="projects-card-title">Idioma da transcrição</h2>
      <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: '8px 0' }}>
        O Super Whisper usa português brasileiro (pt-BR) por padrão. Para mudar,
        edite a constante <code>recognition.lang</code> em <code>super-whisper.js</code>.
      </p>
    </div>

    <div className="projects-dashboard-card">
      <h2 className="projects-card-title">Atalho global</h2>
      <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: '8px 0' }}>
        <kbd>Ctrl+Shift+V</kbd> (Windows/Linux) ou <kbd>Cmd+Shift+V</kbd> (macOS) abre o popup
        do Super Whisper a partir de qualquer lugar do sistema.
      </p>
    </div>

    <div className="projects-dashboard-card">
      <h2 className="projects-card-title">Histórico</h2>
      <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: '8px 0' }}>
        As transcrições são salvas em <code>localStorage</code> sob a chave
        <code> super-whisper-history</code>. Limite atual: 20 transcrições.
      </p>
    </div>

    <div className="projects-dashboard-card">
      <h2 className="projects-card-title">Tema</h2>
      <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: '8px 0' }}>
        O tema desta página e do popup seguem automaticamente o tema escolhido nas
        Configurações do app. Suporta os 20 temas do Organon.
      </p>
    </div>
  </>
)

const audioIconButtonStyle: React.CSSProperties = {
  width: 26,
  height: 26,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: '1px solid var(--color-border)',
  background: 'transparent',
  color: 'var(--color-text-muted)',
  borderRadius: 5,
  cursor: 'pointer',
  transition: 'all 0.15s',
}

// ============================================================
// STYLES (específicos da AudioPage - o resto vem de projects-shell.css)
// ============================================================

const audioPageStyles = `
.audio-recorder-info {
  font-size: 13px;
  line-height: 1.6;
  color: var(--color-text-secondary);
}

.audio-recorder-info p {
  margin: 0 0 8px 0;
}

.audio-recorder-info-secondary {
  color: var(--color-text-muted) !important;
  font-size: 12px !important;
}

.audio-recorder-info kbd {
  display: inline-block;
  padding: 2px 6px;
  font-family: var(--font-mono);
  font-size: 11px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  margin: 0 2px;
}

.audio-recorder-info code {
  font-family: var(--font-mono);
  font-size: 11px;
  background: var(--color-surface);
  padding: 1px 5px;
  border-radius: 3px;
}

.projects-sidebar-item-badge {
  margin-left: auto;
  background: var(--color-primary);
  color: var(--color-text-inverse, #fff);
  font-size: 10px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 999px;
  min-width: 18px;
  text-align: center;
}
`
