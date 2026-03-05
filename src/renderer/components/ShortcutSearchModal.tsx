import { useEffect, useMemo, useRef, useState } from 'react'
import type { Note, ShortcutItem } from '../types'

type ResultItem =
  | { kind: 'shortcut'; item: ShortcutItem; index: number }
  | { kind: 'note'; item: Note; index: number }

interface ShortcutSearchModalProps {
  shortcuts: ShortcutItem[]
  notes?: Note[]
  onClose: () => void
  onOpenShortcut: (url: string) => void
  onOpenNote?: (noteId: string) => void
}

export const ShortcutSearchModal = ({
  shortcuts,
  notes = [],
  onClose,
  onOpenShortcut,
  onOpenNote,
}: ShortcutSearchModalProps) => {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const filteredResults = useMemo((): ResultItem[] => {
    const q = query.toLowerCase().trim()
    const results: ResultItem[] = []
    let idx = 0

    const matchShortcuts = q
      ? shortcuts.filter(s => s.title.toLowerCase().includes(q) || s.value.toLowerCase().includes(q))
      : shortcuts
    for (const item of matchShortcuts) {
      results.push({ kind: 'shortcut', item, index: idx++ })
    }

    if (q) {
      const matchNotes = notes.filter(n => n.title.toLowerCase().includes(q))
      for (const item of matchNotes) {
        results.push({ kind: 'note', item, index: idx++ })
      }
    }

    return results
  }, [query, shortcuts, notes])

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex(prev => Math.min(prev + 1, filteredResults.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex(prev => Math.max(prev - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const active = filteredResults[activeIndex]
        if (!active) return
        if (active.kind === 'shortcut') {
          onOpenShortcut(active.item.value)
        } else {
          onOpenNote?.(active.item.id)
        }
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose, onOpenShortcut, onOpenNote, activeIndex, filteredResults])

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  const handleItemClick = (result: ResultItem) => {
    if (result.kind === 'shortcut') {
      onOpenShortcut(result.item.value)
    } else {
      onOpenNote?.(result.item.id)
    }
    onClose()
  }

  const shortcutResults = filteredResults.filter(r => r.kind === 'shortcut')
  const noteResults = filteredResults.filter(r => r.kind === 'note')

  return (
    <div className="shortcut-search-modal-overlay" onClick={onClose}>
      <div className="shortcut-search-modal" onClick={e => e.stopPropagation()}>
        <div className="shortcut-search-modal-header">
          <div className="shortcut-search-modal-input-wrapper">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar atalhos e notas..."
              className="shortcut-search-modal-input"
            />
            {query && (
              <button
                className="shortcut-search-modal-clear"
                onClick={() => setQuery('')}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
        </div>

        <div className="shortcut-search-modal-results">
          {filteredResults.length === 0 ? (
            <div className="shortcut-search-modal-empty">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="32" height="32" style={{ opacity: 0.3 }}>
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <p>Nenhum resultado encontrado</p>
            </div>
          ) : (
            <>
              {shortcutResults.length > 0 && (
                <>
                  {query && <div className="shortcut-search-modal-section-label">Atalhos</div>}
                  {shortcutResults.map(result => {
                    const s = result.item as ShortcutItem
                    return (
                      <div
                        key={s.id}
                        className={`shortcut-search-modal-item ${result.index === activeIndex ? 'is-active' : ''}`}
                        onClick={() => handleItemClick(result)}
                        onMouseEnter={() => setActiveIndex(result.index)}
                      >
                        <div className="shortcut-search-modal-item-icon">
                          {s.icon?.kind === 'emoji' ? (
                            <span className="shortcut-search-modal-emoji">{s.icon.value}</span>
                          ) : (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                            </svg>
                          )}
                        </div>
                        <div className="shortcut-search-modal-item-content">
                          <div className="shortcut-search-modal-item-title">{s.title}</div>
                          <div className="shortcut-search-modal-item-url">{s.value}</div>
                        </div>
                        <div className="shortcut-search-modal-item-action">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                        </div>
                      </div>
                    )
                  })}
                </>
              )}

              {noteResults.length > 0 && (
                <>
                  <div className="shortcut-search-modal-section-label">Notas</div>
                  {noteResults.map(result => {
                    const n = result.item as Note
                    return (
                      <div
                        key={n.id}
                        className={`shortcut-search-modal-item ${result.index === activeIndex ? 'is-active' : ''}`}
                        onClick={() => handleItemClick(result)}
                        onMouseEnter={() => setActiveIndex(result.index)}
                      >
                        <div className="shortcut-search-modal-item-icon">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                          </svg>
                        </div>
                        <div className="shortcut-search-modal-item-content">
                          <div className="shortcut-search-modal-item-title">{n.title || 'Sem título'}</div>
                          <div className="shortcut-search-modal-item-url">Nota</div>
                        </div>
                        <div className="shortcut-search-modal-item-action">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                        </div>
                      </div>
                    )
                  })}
                </>
              )}
            </>
          )}
        </div>

        <div className="shortcut-search-modal-footer">
          <div className="shortcut-search-modal-hint">
            <kbd>↑</kbd>
            <kbd>↓</kbd>
            <span>Navegar</span>
            <kbd>Enter</kbd>
            <span>Abrir</span>
            <kbd>Esc</kbd>
            <span>Fechar</span>
          </div>
        </div>
      </div>
    </div>
  )
}
