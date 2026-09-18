import React from 'react'
import { Settings, X } from 'lucide-react'
import type { TranscriptFilter, TranscriptViewMode } from '../types'

export interface TranscriptsToolbarProps {
  search: string
  onSearchChange: (val: string) => void
  filter: TranscriptFilter
  onFilterChange: (filter: TranscriptFilter) => void
  viewMode: TranscriptViewMode
  onViewModeChange: (mode: TranscriptViewMode) => void
  totalCount: number
  totalWords: number
  onOpenRecorder: () => void
  onOpenPromptModal: () => void
  onClearAll: () => void
}

export const TranscriptsToolbar: React.FC<TranscriptsToolbarProps> = ({
  search,
  onSearchChange,
  filter,
  onFilterChange,
  viewMode,
  onViewModeChange,
  totalCount,
  totalWords,
  onOpenRecorder,
  onOpenPromptModal,
  onClearAll,
}) => {
  return (
    <div className="transcripts-toolbar">
      <div className="transcripts-toolbar-top">
        <div className="transcripts-toolbar-left">
          <button
            className="transcripts-btn-primary"
            onClick={onOpenRecorder}
            title="Abrir janela flutuante do Super Whisper (Ctrl+Shift+V)"
          >
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
            <span>Abrir Gravador</span>
          </button>

          <button
            className="transcripts-btn-secondary"
            onClick={onOpenPromptModal}
            title="Configurar prompts e modelo de relatório IA"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Settings size={14} />
            <span>Configurar Prompts</span>
          </button>

          {totalCount > 0 && (
            <button
              className="transcripts-btn-secondary"
              onClick={onClearAll}
              title="Limpar todas as transcrições"
            >
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
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              <span>Limpar</span>
            </button>
          )}
        </div>

        <div className="transcripts-toolbar-center">
          {totalCount > 0 && (
            <div className="transcripts-search">
              <svg
                className="transcripts-search-icon"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                className="transcripts-search-input"
                placeholder="Buscar transcrições..."
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
              />
              {search && (
                <button
                  className="transcripts-search-clear"
                  onClick={() => onSearchChange('')}
                  title="Limpar busca"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <X size={12} />
                </button>
              )}
            </div>
          )}
        </div>

        <div className="transcripts-toolbar-right">
          {totalCount > 0 && (
            <>
              <div className="transcripts-stats">
                <span>
                  <strong>{totalCount}</strong> itens
                </span>
                <span>·</span>
                <span>
                  <strong>{totalWords}</strong> palavras
                </span>
              </div>

              <div className="transcripts-filter-tabs">
                {(['all', 'today', 'week', 'month'] as const).map((f) => (
                  <button
                    key={f}
                    className={`transcripts-filter-tab ${filter === f ? 'is-active' : ''}`}
                    onClick={() => onFilterChange(f)}
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
                  onClick={() => onViewModeChange('grid')}
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
                  onClick={() => onViewModeChange('list')}
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
  )
}
