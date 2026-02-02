import { useEffect, useMemo, useRef, useState } from 'react'
import type { ShortcutItem } from '../types'
import { openExternalLink } from '../utils'

interface ShortcutSearchModalProps {
  shortcuts: ShortcutItem[]
  onClose: () => void
  onOpenShortcut: (url: string) => void
}

export const ShortcutSearchModal = ({
  shortcuts,
  onClose,
  onOpenShortcut,
}: ShortcutSearchModalProps) => {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const filteredShortcuts = useMemo(() => {
    if (!query.trim()) return shortcuts
    const q = query.toLowerCase()
    return shortcuts.filter(s => 
      s.title.toLowerCase().includes(q) || 
      s.value.toLowerCase().includes(q)
    )
  }, [query, shortcuts])

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
        setActiveIndex(prev => Math.min(prev + 1, filteredShortcuts.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex(prev => Math.max(prev - 1, 0))
      } else if (e.key === 'Enter' && filteredShortcuts[activeIndex]) {
        e.preventDefault()
        onOpenShortcut(filteredShortcuts[activeIndex].value)
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose, onOpenShortcut, activeIndex, filteredShortcuts])

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  const handleShortcutClick = (shortcut: ShortcutItem) => {
    onOpenShortcut(shortcut.value)
    onClose()
  }

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
              placeholder="Buscar atalhos..."
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
          {filteredShortcuts.length === 0 ? (
            <div className="shortcut-search-modal-empty">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="32" height="32" style={{ opacity: 0.3 }}>
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <p>Nenhum atalho encontrado</p>
            </div>
          ) : (
            filteredShortcuts.map((shortcut, idx) => (
              <div
                key={shortcut.id}
                className={`shortcut-search-modal-item ${idx === activeIndex ? 'is-active' : ''}`}
                onClick={() => handleShortcutClick(shortcut)}
                onMouseEnter={() => setActiveIndex(idx)}
              >
                <div className="shortcut-search-modal-item-icon">
                  {shortcut.icon?.kind === 'emoji' ? (
                    <span className="shortcut-search-modal-emoji">{shortcut.icon.value}</span>
                  ) : shortcut.icon?.kind === 'builtin' ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                    </svg>
                  )}
                </div>
                <div className="shortcut-search-modal-item-content">
                  <div className="shortcut-search-modal-item-title">{shortcut.title}</div>
                  <div className="shortcut-search-modal-item-url">{shortcut.value}</div>
                </div>
                <div className="shortcut-search-modal-item-action">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              </div>
            ))
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
