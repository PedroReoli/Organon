import { useEffect, useMemo, useRef, useState } from 'react'
import type { AppView } from '../InternalNav'
import type { Card, Note } from '@types'
import { DEFAULT_NAVBAR_ITEMS, renderNavIcon } from '../navConfig'
import { FileText, Plus, Bot, RefreshCw, LayoutGrid, CheckSquare } from 'lucide-react'
import { CommandDefinition, rankCommands } from '../../../commands/commandRegistry'

export interface ViewsNavigatorModalProps {
  notes?: Note[]
  cards?: Card[]
  onNavigate: (view: AppView) => void
  onSelectNote?: (noteId: string) => void
  onAddNote?: (title: string) => void
  onAddCard?: (title: string) => void
  onOpenChat?: () => void
  onOpenSync?: () => void
  onClose: () => void
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
  cards = [],
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
  const paletteItems = useMemo<CommandDefinition[]>(() => {
    const q = query.trim().toLowerCase()
    const items: CommandDefinition[] = []

    // 1. Quick Actions when query is typed
    if (q) {
      if (onAddNote) {
        items.push({
          id: `action:add-note`,
          group: 'action',
          title: `Criar nota "${query.trim()}"`,
          description: 'Abre no editor de notas',
          keywords: ['criar', 'nova', 'nota'],
          mutates: true,
          preview: `Criará uma nota com o título "${query.trim()}".`,
          run: () => { onAddNote(query.trim()); return { ok: true } },
        })
      }
      if (onAddCard) {
        items.push({
          id: `action:add-card`,
          group: 'action',
          title: `Criar tarefa "${query.trim()}"`,
          description: 'Adiciona no planejamento',
          keywords: ['criar', 'nova', 'tarefa', 'card'],
          mutates: true,
          preview: `Criará uma tarefa com o título "${query.trim()}".`,
          run: () => { onAddCard(query.trim()); return { ok: true } },
        })
      }
    } else {
      // System static actions
      if (onOpenChat) {
        items.push({
          id: 'action:open-chat',
          group: 'action',
          title: 'Conversar com Assistente IA',
          description: 'Abre o chatbot lateral',
          keywords: ['chat', 'ia', 'assistente'],
          shortcut: 'Ctrl+\'',
          mutates: false,
          run: () => onOpenChat(),
        })
      }
      if (onOpenSync) {
        items.push({
          id: 'action:open-sync',
          group: 'action',
          title: 'Sincronização Local & Rede',
          description: 'Status do servidor e pareamento',
          keywords: ['sync', 'sincronizar', 'rede'],
          mutates: false,
          run: () => onOpenSync(),
        })
      }
    }

    // 2. Matching Views
    const filteredViews = ALL_VIEWS.filter(v =>
      !q || v.label.toLowerCase().includes(q) || v.description.toLowerCase().includes(q)
    )
    for (const v of filteredViews) {
      items.push({
        id: `view:${v.view}`,
        group: 'view',
        title: v.label,
        description: v.description || undefined,
        keywords: [v.view, v.label, v.description],
        mutates: false,
        run: () => onNavigate(v.view),
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
          group: 'note',
          title: n.title || 'Nota sem título',
          description: n.content ? n.content.replace(/[#*`\n]/g, ' ').slice(0, 80) : undefined,
          keywords: [n.title || '', n.content || '', 'nota'],
          mutates: false,
          run: () => {
            if (onSelectNote) onSelectNote(n.id)
            else onNavigate('notes')
          },
        })
      }
    }

    if (q && cards.length > 0) {
      for (const card of cards.slice(0, 500)) {
        items.push({
          id: `task:${card.id}`,
          group: 'task',
          title: card.title || 'Tarefa sem título',
          description: card.description || 'Abrir no Planejador',
          keywords: [card.title || '', card.description || '', card.priority || '', 'tarefa', 'card'],
          mutates: false,
          run: () => onNavigate('planner'),
        })
      }
    }

    return rankCommands(items, query)
  }, [query, notes, cards, onNavigate, onSelectNote, onAddNote, onAddCard, onOpenChat, onOpenSync])

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
        void item.run()
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
            const view = item.id.startsWith('view:') ? item.id.slice(5) : null
            const iconId = view ? DEFAULT_NAVBAR_ITEMS.find(entry => entry.view === view)?.iconId : null
            const icon = item.group === 'note'
              ? <FileText className="w-4 h-4 text-amber-400" />
              : item.group === 'task'
                ? <CheckSquare className="w-4 h-4 text-indigo-400" />
                : item.id === 'action:open-chat'
                  ? <Bot className="w-4 h-4 text-indigo-400" />
                  : item.id === 'action:open-sync'
                    ? <RefreshCw className="w-4 h-4 text-cyan-400" />
                    : item.mutates
                      ? <Plus className="w-4 h-4 text-emerald-400" />
                      : iconId ? renderNavIcon(iconId) : <LayoutGrid className="w-4 h-4 text-slate-400" />
            return (
              <button
                key={item.id}
                type="button"
                data-idx={idx}
                className={`vn-item ${isActive ? 'is-active' : ''}`}
                onMouseEnter={() => setCursor(idx)}
                onClick={() => {
                  void item.run()
                  onClose()
                }}
              >
                <span className="vn-item-icon">{icon}</span>
                <div className="flex-1 flex flex-col text-left min-w-0">
                  <span className="vn-item-label truncate">{item.title}</span>
                  {item.description && (
                    <span className="text-[11px] text-slate-400 truncate leading-tight">
                      {item.description}
                    </span>
                  )}
                </div>
                <span className="text-[9px] font-mono font-bold tracking-wider px-1.5 py-0.5 rounded bg-white/5 text-slate-400 shrink-0 ml-2">
                  {item.shortcut || item.group.toUpperCase()}
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
