import React, { useState, useEffect, useRef } from 'react'

export interface SearchResultItem {
  id: string
  title: string
  subtitle?: string
  category: 'planner' | 'projects' | 'notes' | 'okrs' | 'shortcuts' | 'view'
  actionView?: string
  cardId?: string
  url?: string
}

interface GlobalSearchDropdownProps {
  isOpen: boolean
  onClose: () => void
  onNavigateView?: (view: string) => void
  onOpenShortcut?: (url: string) => void
  onSelectCard?: (cardId: string) => void
}

const DEFAULT_QUICK_ACTIONS: SearchResultItem[] = [
  { id: 'view-planner', title: 'Painel de Planejamento & Cards', subtitle: 'Ir para tarefas Kanban', category: 'view', actionView: 'planner' },
  { id: 'view-projects', title: 'Central de Projetos & Git Engine', subtitle: '47 repositórios monitorados', category: 'view', actionView: 'projects' },
  { id: 'view-notes', title: 'Bloco de Notas & Documentação', subtitle: 'Acessar anotações', category: 'view', actionView: 'notes' },
  { id: 'view-okrs', title: 'OKRs & Metas de Longo Prazo', subtitle: 'Progresso de objetivos', category: 'view', actionView: 'okrs' },
  { id: 'view-workflow', title: 'Central de Automações (Workflows)', subtitle: 'Regras locais Se -> Então', category: 'view', actionView: 'workflow' },
]

export const GlobalSearchDropdown: React.FC<GlobalSearchDropdownProps> = ({
  isOpen,
  onClose,
  onNavigateView,
  onOpenShortcut,
  onSelectCard,
}) => {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setQuery('')
      setSelectedIndex(0)
    }
  }, [isOpen])

  // Fechar ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const filteredItems = query.trim()
    ? DEFAULT_QUICK_ACTIONS.filter(item =>
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(query.toLowerCase()))
      )
    : DEFAULT_QUICK_ACTIONS

  const handleSelect = (item: SearchResultItem) => {
    if (item.actionView && onNavigateView) {
      onNavigateView(item.actionView)
    } else if (item.url && onOpenShortcut) {
      onOpenShortcut(item.url)
    } else if (item.cardId && onSelectCard) {
      onSelectCard(item.cardId)
    }
    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => (prev + 1) % Math.max(1, filteredItems.length))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length))
    } else if (e.key === 'Enter' && filteredItems[selectedIndex]) {
      e.preventDefault()
      handleSelect(filteredItems[selectedIndex])
    }
  }

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        top: 46,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 420,
        maxWidth: '92vw',
        background: 'var(--color-surface, #1e1e2d)',
        border: '1px solid var(--color-border, rgba(255,255,255,0.15))',
        borderRadius: 14,
        boxShadow: '0 16px 36px rgba(0, 0, 0, 0.45)',
        zIndex: 1000,
        overflow: 'hidden',
        backdropFilter: 'blur(24px)',
      }}
    >
      {/* Search Input Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 14px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(255,255,255,0.02)',
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="var(--color-primary, #6366f1)" strokeWidth="2" width="16" height="16">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setSelectedIndex(0)
          }}
          onKeyDown={handleKeyDown}
          placeholder="Buscar módulo, tarefa ou documento..."
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--color-text, #ffffff)',
            fontSize: 13,
            fontWeight: 500,
          }}
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            Esc
          </button>
        )}
      </div>

      {/* Dropdown Items List */}
      <div style={{ maxHeight: 280, overflowY: 'auto', padding: 6 }}>
        {filteredItems.length === 0 ? (
          <div style={{ padding: 16, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 12 }}>
            Nenhum resultado encontrado para &quot;{query}&quot;
          </div>
        ) : (
          filteredItems.map((item, idx) => {
            const isSelected = idx === selectedIndex
            return (
              <div
                key={item.id}
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setSelectedIndex(idx)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 12px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  background: isSelected ? 'rgba(99,102,241,0.14)' : 'transparent',
                  border: isSelected ? '1px solid rgba(99,102,241,0.3)' : '1px solid transparent',
                  transition: 'all 0.1s ease',
                  marginBottom: 2,
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: isSelected ? 'var(--color-primary, #6366f1)' : 'var(--color-text)' }}>
                    {item.title}
                  </span>
                  {item.subtitle && (
                    <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                      {item.subtitle}
                    </span>
                  )}
                </div>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    padding: '2px 7px',
                    borderRadius: 4,
                    background: 'rgba(255,255,255,0.06)',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  Abrir
                </span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
