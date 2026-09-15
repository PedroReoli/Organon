import { useEffect, useRef, useState } from 'react'
import type { AppView } from '../InternalNav'
import { DEFAULT_NAVBAR_GROUPS, DEFAULT_NAVBAR_ITEMS, renderNavIcon } from '../navConfig'

interface ViewsNavigatorModalProps {
  onNavigate: (view: AppView) => void
  onClose:    () => void
}

const ALL_VIEWS = [
  { view: 'today' as AppView, label: 'Painel central', groupId: null, description: 'Dashboard e visão geral' },
  ...DEFAULT_NAVBAR_ITEMS.map(item => ({
    view: item.view as AppView,
    label: item.label,
    groupId: item.groupId,
    description: '',
  })),
  { view: 'settings' as AppView, label: 'Configurações', groupId: null, description: 'Preferências do sistema' },
]

export const ViewsNavigatorModal = ({ onNavigate, onClose }: ViewsNavigatorModalProps) => {
  const [query, setQuery]       = useState('')
  const [cursor, setCursor]     = useState(0)
  const inputRef                = useRef<HTMLInputElement>(null)
  const listRef                 = useRef<HTMLDivElement>(null)

  const filtered = query.trim()
    ? ALL_VIEWS.filter(v =>
        v.label.toLowerCase().includes(query.toLowerCase()) ||
        v.description.toLowerCase().includes(query.toLowerCase())
      )
    : ALL_VIEWS

  useEffect(() => { inputRef.current?.focus() }, [])
  useEffect(() => { setCursor(0) }, [query])

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${cursor}"]`) as HTMLElement | null
    el?.scrollIntoView({ block: 'nearest' })
  }, [cursor])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, filtered.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)) }
    if (e.key === 'Enter') {
      e.preventDefault()
      const item = filtered[cursor]
      if (item) { onNavigate(item.view); onClose() }
    }
    if (e.key === 'Escape') onClose()
  }

  // Group items when no search
  const grouped = query.trim() ? null : (() => {
    const groups: Array<{ groupId: string | null; label: string; items: typeof filtered }> = [
      { groupId: null, label: 'Início', items: filtered.filter(v => v.view === 'today' || v.view === 'settings') },
      ...DEFAULT_NAVBAR_GROUPS.sort((a, b) => a.order - b.order).map(g => ({
        groupId: g.id,
        label: g.label,
        items: filtered.filter(v => v.groupId === g.id),
      })).filter(g => g.items.length > 0),
    ].filter(g => g.items.length > 0)
    return groups
  })()

  let globalIdx = 0

  return (
    <div className="vn-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Navegador de telas">
      <div className="vn-modal" onClick={e => e.stopPropagation()}>
        <div className="vn-search-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" className="vn-search-icon">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            className="vn-search-input"
            placeholder="Buscar tela..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <kbd className="vn-kbd">Esc</kbd>
        </div>

        <div className="vn-list" ref={listRef}>
          {grouped ? (
            grouped.map(group => (
              <div key={group.groupId ?? 'root'} className="vn-group">
                <div className="vn-group-label">{group.label}</div>
                {group.items.map(item => {
                  const idx = globalIdx++
                  const isActive = cursor === idx
                  const iconId = DEFAULT_NAVBAR_ITEMS.find(i => i.view === item.view)?.iconId
                  return (
                    <button
                      key={item.view}
                      type="button"
                      data-idx={idx}
                      className={`vn-item ${isActive ? 'is-active' : ''}`}
                      onMouseEnter={() => setCursor(idx)}
                      onClick={() => { onNavigate(item.view); onClose() }}
                    >
                      <span className="vn-item-icon">
                        {iconId ? renderNavIcon(iconId) : null}
                      </span>
                      <span className="vn-item-label">{item.label}</span>
                    </button>
                  )
                })}
              </div>
            ))
          ) : (
            filtered.map((item, idx) => {
              const isActive = cursor === idx
              const iconId = DEFAULT_NAVBAR_ITEMS.find(i => i.view === item.view)?.iconId
              return (
                <button
                  key={item.view}
                  type="button"
                  data-idx={idx}
                  className={`vn-item ${isActive ? 'is-active' : ''}`}
                  onMouseEnter={() => setCursor(idx)}
                  onClick={() => { onNavigate(item.view); onClose() }}
                >
                  <span className="vn-item-icon">
                    {iconId ? renderNavIcon(iconId) : null}
                  </span>
                  <span className="vn-item-label">{item.label}</span>
                </button>
              )
            })
          )}
          {filtered.length === 0 && (
            <div className="vn-empty">Nenhuma tela encontrada para "{query}"</div>
          )}
        </div>

        <div className="vn-footer">
          <span><kbd className="vn-kbd">↑↓</kbd> navegar</span>
          <span><kbd className="vn-kbd">Enter</kbd> abrir</span>
          <span><kbd className="vn-kbd">Esc</kbd> fechar</span>
        </div>
      </div>
    </div>
  )
}
