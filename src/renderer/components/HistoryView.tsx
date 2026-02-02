import { useMemo, useState } from 'react'
import type { AppItem, CalendarEvent, Card, FileItem, Meeting, Note, Project } from '../types'

type HistoryKind = 'card' | 'event' | 'note' | 'file' | 'app' | 'project' | 'meeting'

interface HistoryItem {
  id: string
  kind: HistoryKind
  title: string
  timestamp: string
  detail: string
}

interface HistoryViewProps {
  cards: Card[]
  events: CalendarEvent[]
  notes: Note[]
  files: FileItem[]
  apps: AppItem[]
  projects: Project[]
  meetings: Meeting[]
}

const HISTORY_KIND_LABEL: Record<HistoryKind, string> = {
  card: 'Card',
  event: 'Evento',
  note: 'Nota',
  file: 'Arquivo',
  app: 'App',
  project: 'Projeto',
  meeting: 'Reuniao',
}

export const HistoryView = ({
  cards,
  events,
  notes,
  files,
  apps,
  projects,
  meetings,
}: HistoryViewProps) => {
  const [filter, setFilter] = useState<'all' | HistoryKind>('all')

  const items = useMemo<HistoryItem[]>(() => {
    const out: HistoryItem[] = []

    for (const c of cards) {
      out.push({
        id: `card:${c.id}`,
        kind: 'card',
        title: c.title,
        timestamp: c.updatedAt || c.createdAt,
        detail: c.date ? `Data: ${c.date}` : 'Sem data',
      })
    }

    for (const e of events) {
      out.push({
        id: `event:${e.id}`,
        kind: 'event',
        title: e.title,
        timestamp: e.updatedAt || e.createdAt,
        detail: `${e.date}${e.time ? ` ${e.time}` : ''}`,
      })
    }

    for (const n of notes) {
      out.push({
        id: `note:${n.id}`,
        kind: 'note',
        title: n.title,
        timestamp: n.updatedAt || n.createdAt,
        detail: n.mdPath,
      })
    }

    for (const f of files) {
      out.push({
        id: `file:${f.id}`,
        kind: 'file',
        title: f.name,
        timestamp: f.createdAt,
        detail: f.path,
      })
    }

    for (const a of apps) {
      out.push({
        id: `app:${a.id}`,
        kind: 'app',
        title: a.name,
        timestamp: new Date(a.order).toISOString(),
        detail: a.exePath,
      })
    }

    for (const p of projects) {
      out.push({
        id: `project:${p.id}`,
        kind: 'project',
        title: p.name,
        timestamp: p.updatedAt || p.createdAt,
        detail: p.path || 'Sem caminho',
      })
    }

    for (const m of meetings) {
      out.push({
        id: `meeting:${m.id}`,
        kind: 'meeting',
        title: m.title,
        timestamp: m.updatedAt || m.createdAt,
        detail: `${Math.max(0, Math.round(m.duration || 0))}s`,
      })
    }

    return out
      .filter(item => !!item.timestamp)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }, [apps, cards, events, files, meetings, notes, projects])

  const filtered = filter === 'all' ? items : items.filter(item => item.kind === filter)

  return (
    <div className="history-layout">
      <header className="history-header">
        <div>
          <h2>Historico</h2>
          <p>Linha do tempo de alteracoes dos seus dados.</p>
        </div>
        <div className="history-filters">
          <button className={`history-filter-btn ${filter === 'all' ? 'is-active' : ''}`} onClick={() => setFilter('all')}>Tudo</button>
          {(['card', 'event', 'note', 'file', 'app', 'project', 'meeting'] as HistoryKind[]).map(kind => (
            <button
              key={kind}
              className={`history-filter-btn ${filter === kind ? 'is-active' : ''}`}
              onClick={() => setFilter(kind)}
            >
              {HISTORY_KIND_LABEL[kind]}
            </button>
          ))}
        </div>
      </header>

      <div className="history-list">
        {filtered.length === 0 && (
          <div className="history-empty">Nenhum item encontrado para este filtro.</div>
        )}

        {filtered.map(item => (
          <div key={item.id} className="history-item">
            <div className="history-item-type">{HISTORY_KIND_LABEL[item.kind]}</div>
            <div className="history-item-main">
              <div className="history-item-title">{item.title}</div>
              <div className="history-item-detail">{item.detail}</div>
            </div>
            <div className="history-item-time">
              {new Date(item.timestamp).toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
