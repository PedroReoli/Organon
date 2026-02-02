import { useEffect, useMemo, useRef, useState } from 'react'
import type { CalendarEvent, Card, FileItem, Note, ShortcutItem } from '../types'
import { formatDateFull, formatDateShort } from '../utils'
import type { AppView } from './InternalNav'

type QuickResult =
  | { kind: 'card'; id: string; title: string; meta: string }
  | { kind: 'event'; id: string; sourceId?: string; title: string; date: string; time: string | null }
  | { kind: 'shortcut'; id: string; title: string; url: string }
  | { kind: 'file'; id: string; name: string; meta: string }
  | { kind: 'note'; id: string; title: string }

interface QuickSearchModalProps {
  cards: Card[]
  events: CalendarEvent[]
  shortcuts: ShortcutItem[]
  files: FileItem[]
  notes: Note[]
  onClose: () => void
  onGoToPlannerCard: (cardId: string) => void
  onGoToCalendarDate: (dateISO: string) => void
  onOpenShortcut: (url: string) => void
  onOpenFile: (fileId: string) => void
  onGoToNotes: () => void
  onNavigate: (view: AppView) => void
}

export const QuickSearchModal = ({
  cards,
  events,
  shortcuts,
  files,
  notes,
  onClose,
  onGoToPlannerCard,
  onGoToCalendarDate,
  onOpenShortcut,
  onOpenFile,
  onGoToNotes,
  onNavigate,
}: QuickSearchModalProps) => {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; result: QuickResult } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const contextMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (contextMenu) {
          setContextMenu(null)
        } else {
          onClose()
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose, contextMenu])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null)
      }
    }
    if (contextMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [contextMenu])

  const results = useMemo<QuickResult[]>(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []

    const res: QuickResult[] = []

    for (const c of cards) {
      if (!c.title.toLowerCase().includes(q)) continue
      res.push({
        kind: 'card',
        id: c.id,
        title: c.title,
        meta: c.hasDate && c.date ? `Card • ${formatDateShort(c.date)}${c.time ? ` ${c.time}` : ''}` : 'Card',
      })
    }

    for (const e of events) {
      const title = e.title ?? ''
      if (!title.toLowerCase().includes(q)) continue
      res.push({
        kind: 'event',
        id: e.id,
        sourceId: (e as CalendarEvent & { sourceId?: string }).sourceId,
        title,
        date: e.date,
        time: e.time ?? null,
      })
    }

    for (const s of shortcuts) {
      const t = s.title ?? ''
      const v = s.value ?? ''
      if (!t.toLowerCase().includes(q) && !v.toLowerCase().includes(q)) continue
      res.push({ kind: 'shortcut', id: s.id, title: t, url: v })
    }

    for (const f of files) {
      if (!f.name.toLowerCase().includes(q)) continue
      res.push({
        kind: 'file',
        id: f.id,
        name: f.name,
        meta: `${f.type.toUpperCase()} • ${new Date(f.createdAt).toLocaleDateString()}`,
      })
    }

    for (const n of notes) {
      if (!n.title.toLowerCase().includes(q)) continue
      res.push({ kind: 'note', id: n.id, title: n.title })
    }

    return res.slice(0, 30)
  }, [query, cards, events, shortcuts, files, notes])

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  const runResult = (result: QuickResult) => {
    if (result.kind === 'card') {
      onGoToPlannerCard(result.id)
      return
    }
    if (result.kind === 'event') {
      onGoToCalendarDate(result.date)
      return
    }
    if (result.kind === 'shortcut') {
      onOpenShortcut(result.url)
      return
    }
    if (result.kind === 'file') {
      onOpenFile(result.id)
      return
    }
    if (result.kind === 'note') {
      onGoToNotes()
      return
    }
  }

  const goToLocation = (result: QuickResult) => {
    setContextMenu(null)
    onClose()
    
    if (result.kind === 'card') {
      onNavigate('planner')
      setTimeout(() => onGoToPlannerCard(result.id), 100)
    } else if (result.kind === 'event') {
      onNavigate('calendar')
      setTimeout(() => onGoToCalendarDate(result.date), 100)
    } else if (result.kind === 'shortcut') {
      onNavigate('shortcuts')
    } else if (result.kind === 'file') {
      onNavigate('files')
    } else if (result.kind === 'note') {
      onNavigate('notes')
    }
  }

  const handleContextMenu = (e: React.MouseEvent, result: QuickResult) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, result })
  }

  return (
    <div className="quick-search-inline">
      <div className="quick-search-input-wrapper">
        <svg className="quick-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          className="quick-search-input"
          placeholder="Buscar cards, eventos, atalhos, arquivos, notas..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setActiveIndex(i => Math.min(i + 1, Math.max(results.length - 1, 0)))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setActiveIndex(i => Math.max(i - 1, 0))
            } else if (e.key === 'Enter') {
              e.preventDefault()
              const r = results[activeIndex]
              if (r) runResult(r)
            } else if (e.key === 'Escape') {
              onClose()
            }
          }}
        />
        <button className="quick-search-close" onClick={onClose} title="Fechar (Esc)">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 4L4 12M4 4l8 8" />
          </svg>
        </button>
      </div>

      {query.trim() && results.length === 0 && (
        <div className="quick-search-results">
          <div className="quick-empty">Nenhum resultado.</div>
        </div>
      )}

      {results.length > 0 && (
        <div className="quick-search-results" role="listbox" aria-label="Resultados">
          {results.map((r, idx) => (
            <button
              key={`${r.kind}:${r.id}`}
              type="button"
              className={`quick-result ${idx === activeIndex ? 'is-active' : ''}`}
              onMouseEnter={() => setActiveIndex(idx)}
              onClick={() => runResult(r)}
              onContextMenu={(e) => handleContextMenu(e, r)}
            >
              <div className="quick-result-title">
                {r.kind === 'event' && (
                  <span className="quick-kind">Evento</span>
                )}
                {r.kind === 'card' && (
                  <span className="quick-kind">Card</span>
                )}
                {r.kind === 'shortcut' && (
                  <span className="quick-kind">Atalho</span>
                )}
                {r.kind === 'file' && (
                  <span className="quick-kind">Arquivo</span>
                )}
                {r.kind === 'note' && (
                  <span className="quick-kind">Nota</span>
                )}

                <span className="quick-title-text">
                  {r.kind === 'file' ? r.name : r.title}
                </span>
              </div>
              <div className="quick-result-meta">
                {r.kind === 'card' && r.meta}
                {r.kind === 'event' && `${formatDateFull(r.date)}${r.time ? ` • ${r.time}` : ''}`}
                {r.kind === 'shortcut' && r.url}
                {r.kind === 'file' && r.meta}
                {r.kind === 'note' && 'Abrir em Notas'}
              </div>
            </button>
          ))}
        </div>
      )}

      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="quick-search-context-menu"
          style={{
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
          }}
        >
          <button
            className="quick-search-context-item"
            onClick={() => goToLocation(contextMenu.result)}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M8 2L2 8l6 6M14 2l-6 6 6 6" />
            </svg>
            <span>Ir até o local</span>
          </button>
        </div>
      )}
    </div>
  )
}

