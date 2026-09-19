import { useEffect, useMemo, useRef, useState } from 'react'
import type { AppView } from '../InternalNav'
import type { Note } from '@types'
import { DEFAULT_NAVBAR_ITEMS, renderNavIcon } from '../navConfig'
import { FileText, Plus, Bot, RefreshCw, LayoutGrid } from 'lucide-react'

export interface ViewsNavigatorModalProps {
  notes?: Note[]
  onNavigate: (view: AppView) => void
  onSelectNote?: (noteId: string) => void
  onAddNote?: (title: string) => void
  onAddCard?: (title: string) => void
  onOpenChat?: () => void
  onOpenSync?: () => void
  onClose: () => void
}

interface PaletteItem {
  id: string
  type: 'view' | 'note' | 'action'
  label: string
  sublabel?: string
  badge: string
  icon: React.ReactNode
  onSelect: () => void
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

export const ViewsNavigatorModal = ({
  notes = [],
  onNavigate,
  onSelectNote,
  onAddNote,
  onAddCard,
  onOpenChat,
  onOpenSync,
  onClose,
}: ViewsNavigatorModalProps) => {
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  // Build items list
  const paletteItems = useMemo<PaletteItem[]>(() => {
    const q = query.trim().toLowerCase()
    const items: PaletteItem[] = []

    // 1. Quick Actions when query is typed
    if (q) {
      if (onAddNote) {
        items.push({
          id: `action:add-note`,
          type: 'action',
          label: `Criar nota "${query.trim()}"`,
          sublabel: 'Abre no editor de notas',
          badge: 'AÇÃO',
          icon: <Plus className="w-4 h-4 text-emerald-400" />,
          onSelect: () => onAddNote(query.trim()),
        })
      }
      if (onAddCard) {
        items.push({
          id: `action:add-card`,
          type: 'action',
          label: `Criar tarefa "${query.trim()}"`,
          sublabel: 'Adiciona no planejamento',
          badge: 'AÇÃO',
          icon: <Plus className="w-4 h-4 text-indigo-400" />,
          onSelect: () => onAddCard(query.trim()),
        })
      }
    } else {
      // System static actions
      if (onOpenChat) {
        items.push({
          id: 'action:open-chat',
          type: 'action',
          label: 'Conversar com Assistente IA',
          sublabel: 'Abre o chatbot lateral',
          badge: 'IA',
          icon: <Bot className="w-4 h-4 text-indigo-400" />,
          onSelect: () => onOpenChat(),
        })
      }
      if (onOpenSync) {
        items.push({
          id: 'action:open-sync',
          type: 'action',
          label: 'Sincronização Local & Rede',
          sublabel: 'Status do servidor e pareamento',
          badge: 'SYNC',
          icon: <RefreshCw className="w-4 h-4 text-cyan-400" />,
          onSelect: () => onOpenSync(),
        })
      }
    }

    // 2. Matching Views
    const filteredViews = ALL_VIEWS.filter(v =>
      !q || v.label.toLowerCase().includes(q) || v.description.toLowerCase().includes(q)
    )
    for (const v of filteredViews) {
      const iconId = DEFAULT_NAVBAR_ITEMS.find(i => i.view === v.view)?.iconId
      items.push({
        id: `view:${v.view}`,
        type: 'view',
        label: v.label,
        sublabel: v.description || undefined,
        badge: 'TELA',
        icon: iconId ? renderNavIcon(iconId) : <LayoutGrid className="w-4 h-4 text-slate-400" />,
        onSelect: () => onNavigate(v.view),
      })
    }

    // 3. Matching Notes
    if (q && notes.length > 0) {
      const matchingNotes = notes
        .filter(n => (n.title && n.title.toLowerCase().includes(q)) || (n.content && n.content.toLowerCase().includes(q)))
        .slice(0, 8)

      for (const n of matchingNotes) {
        items.push({
          id: `note:${n.id}`,
          type: 'note',
          label: n.title || 'Nota sem título',
          sublabel: n.content ? n.content.replace(/[#*`\n]/g, ' ').slice(0, 50) : undefined,
          badge: 'NOTA',
          icon: <FileText className="w-4 h-4 text-amber-400" />,
          onSelect: () => {
            if (onSelectNote) onSelectNote(n.id)
            else onNavigate('notes')
          },
        })
      }
    }

    return items
  }, [query, notes, onNavigate, onSelectNote, onAddNote, onAddCard, onOpenChat, onOpenSync])

  useEffect(() => { setCursor(0) }, [query])

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${cursor}"]`) as HTMLElement | null
    el?.scrollIntoView({ block: 'nearest' })
  }, [cursor])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setCursor(c => Math.min(c + 1, paletteItems.length - 1))
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setCursor(c => Math.max(c - 1, 0))
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      const item = paletteItems[cursor]
      if (item) {
        item.onSelect()
        onClose()
      }
    }
    if (e.key === 'Escape') onClose()
  }

  return (
    <div className="vn-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Command Palette">
      <div className="vn-modal" onClick={e => e.stopPropagation()}>
        <div className="vn-search-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" className="vn-search-icon">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            className="vn-search-input"
            placeholder="Buscar telas, notas, comandos ou digite para criar... (Ctrl+K)"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <kbd className="vn-kbd">Esc</kbd>
        </div>

        <div className="vn-list" ref={listRef}>
          {paletteItems.map((item, idx) => {
            const isActive = cursor === idx
            return (
              <button
                key={item.id}
                type="button"
                data-idx={idx}
                className={`vn-item ${isActive ? 'is-active' : ''}`}
                onMouseEnter={() => setCursor(idx)}
                onClick={() => {
                  item.onSelect()
                  onClose()
                }}
              >
                <span className="vn-item-icon">{item.icon}</span>
                <div className="flex-1 flex flex-col text-left min-w-0">
                  <span className="vn-item-label truncate">{item.label}</span>
                  {item.sublabel && (
                    <span className="text-[11px] text-slate-400 truncate leading-tight">
                      {item.sublabel}
                    </span>
                  )}
                </div>
                <span className="text-[9px] font-mono font-bold tracking-wider px-1.5 py-0.5 rounded bg-white/5 text-slate-400 shrink-0 ml-2">
                  {item.badge}
                </span>
              </button>
            )
          })}

          {paletteItems.length === 0 && (
            <div className="vn-empty">Nenhum resultado encontrado para "{query}"</div>
          )}
        </div>

        <div className="vn-footer">
          <span><kbd className="vn-kbd">↑↓</kbd> navegar</span>
          <span><kbd className="vn-kbd">Enter</kbd> selecionar</span>
          <span><kbd className="vn-kbd">Ctrl+K</kbd> atalho</span>
          <span><kbd className="vn-kbd">Esc</kbd> fechar</span>
        </div>
      </div>
    </div>
  )
}
