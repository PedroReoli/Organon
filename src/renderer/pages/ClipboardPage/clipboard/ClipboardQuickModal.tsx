import { useEffect, useRef, useState } from 'react'
import type { ClipboardCategory, ClipboardItem } from '@types'
import { copyTextToClipboard } from '@utils'
import { CONTENT_TYPE_COLORS, CONTENT_TYPE_LABELS } from './clipboardClassifier'

interface ClipboardQuickModalProps {
  categories:          ClipboardCategory[]
  items:               ClipboardItem[]
  onClose:             () => void
  onNavigateClipboard: () => void
  onIncrementCopyCount:(itemId: string) => void
}

export const ClipboardQuickModal = ({
  categories,
  items,
  onClose,
  onNavigateClipboard,
  onIncrementCopyCount,
}: ClipboardQuickModalProps) => {
  const [query,         setQuery]         = useState('')
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null)
  const [cursor,        setCursor]        = useState(0)
  const [copiedId,      setCopiedId]      = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const filtered = items
    .filter(item => {
      if (selectedCatId !== null && item.categoryId !== selectedCatId) return false
      if (query.trim()) {
        const q = query.toLowerCase()
        return item.content.toLowerCase().includes(q) || item.title.toLowerCase().includes(q)
      }
      return true
    })
    .sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
      return b.copyCount - a.copyCount || b.order - a.order
    })
    .slice(0, 50)

  useEffect(() => { setCursor(0) }, [query, selectedCatId])

  const handleCopy = async (item: ClipboardItem) => {
    const ok = await copyTextToClipboard(item.content)
    if (ok) {
      onIncrementCopyCount(item.id)
      setCopiedId(item.id)
      setTimeout(() => { setCopiedId(null); onClose() }, 800)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, filtered.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)) }
    if (e.key === 'Enter') {
      e.preventDefault()
      const item = filtered[cursor]
      if (item) void handleCopy(item)
    }
    if (e.key === 'Escape') onClose()
  }

  const sortedCategories = [...categories].sort((a, b) => a.order - b.order)

  return (
    <div className="cbq-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Clipboard rápido">
      <div className="cbq-panel" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="cbq-header">
          <div className="cbq-header-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <rect x="7" y="4" width="10" height="4" rx="1" />
              <rect x="5" y="8" width="14" height="13" rx="2" />
            </svg>
          </div>
          <span className="cbq-header-title">Organon Clipboard</span>
          <button type="button" className="cbq-close-btn" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="cbq-search-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" className="cbq-search-icon">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            className="cbq-search-input"
            placeholder="Buscar clipboard..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        {/* Category tabs */}
        {sortedCategories.length > 0 && (
          <div className="cbq-cats">
            <button
              type="button"
              className={`cbq-cat-tab ${selectedCatId === null ? 'is-active' : ''}`}
              onClick={() => setSelectedCatId(null)}
            >
              Todos
            </button>
            {sortedCategories.map(cat => (
              <button
                key={cat.id}
                type="button"
                className={`cbq-cat-tab ${selectedCatId === cat.id ? 'is-active' : ''}`}
                onClick={() => setSelectedCatId(cat.id)}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}

        {/* Items list */}
        <div className="cbq-list">
          {filtered.length === 0 ? (
            <div className="cbq-empty">Nenhum item encontrado.</div>
          ) : (
            filtered.map((item, idx) => {
              const typeColor = CONTENT_TYPE_COLORS[item.contentType]
              const typeLabel = CONTENT_TYPE_LABELS[item.contentType]
              const isActive  = cursor === idx
              const isCopied  = copiedId === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`cbq-item ${isActive ? 'is-active' : ''} ${isCopied ? 'is-copied' : ''}`}
                  onMouseEnter={() => setCursor(idx)}
                  onClick={() => void handleCopy(item)}
                >
                  <div className="cbq-item-body">
                    <div className="cbq-item-top">
                      <span
                        className="cbq-item-type"
                        style={{ color: typeColor }}
                      >
                        {item.contentType === 'color' && (
                          <span className="cbq-color-dot" style={{ background: item.content }} />
                        )}
                        {typeLabel}
                      </span>
                      {item.isPinned && (
                        <span className="cbq-item-pin">
                          <svg viewBox="0 0 24 24" fill="currentColor" width="10" height="10">
                            <path d="m15 4.586-8.707 8.707a1 1 0 0 0 0 1.414l2.586 2.586a1 1 0 0 0 1.414 0l.293-.293V19a1 1 0 0 0 1.707.707l4-4a1 1 0 0 0 .293-.707v-2l1.293-1.293a1 1 0 0 0 0-1.414l-1.586-1.586A1 1 0 1 0 15 4.586Z" />
                          </svg>
                        </span>
                      )}
                    </div>
                    <p className="cbq-item-preview">
                      {item.content.length > 100 ? `${item.content.slice(0, 100)}...` : item.content}
                    </p>
                  </div>
                  <div className="cbq-item-side">
                    {isCopied ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14" style={{ color: '#22c55e' }}>
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      item.copyCount > 0 && <span className="cbq-item-count">{item.copyCount}×</span>
                    )}
                  </div>
                </button>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="cbq-footer">
          <div className="cbq-footer-hints">
            <span><kbd className="cbq-kbd">↑↓</kbd> navegar</span>
            <span><kbd className="cbq-kbd">Enter</kbd> copiar</span>
            <span><kbd className="cbq-kbd">Esc</kbd> fechar</span>
          </div>
          <button type="button" className="cbq-open-full" onClick={() => { onNavigateClipboard(); onClose() }}>
            Abrir clipboard completo →
          </button>
        </div>
      </div>
    </div>
  )
}
