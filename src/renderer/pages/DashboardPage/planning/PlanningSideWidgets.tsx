import React, { useMemo, useRef, useState } from 'react'
import type { AgendaCategory, Card, CalendarEvent, CardPriority, CardStatus } from '@types'
import { PRIORITY_COLORS, STATUS_COLORS, STATUS_LABELS, STATUS_ORDER } from '@types'
import { expandCalendarEvents, getTodayISO } from '@utils'

// ── Helpers compartilhados ───────────────────────────────────────────────

const MONTH_FULL = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const DAY_SHORT = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
const PRIORITIES: CardPriority[] = ['P1', 'P2', 'P3', 'P4']

export const PRESET_COLORS = [
  'var(--color-primary)', '#10b981', '#f59e0b', '#ef4444', 'var(--color-primary)',
  'var(--color-primary)', 'var(--color-primary)', '#f97316', 'var(--color-primary)', '#64748b',
]

export function toISO(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

export function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return toISO(d.getFullYear(), d.getMonth(), d.getDate())
}

// ── MiniCal ──────────────────────────────────────────────────────────────

interface MiniCalProps {
  events: CalendarEvent[]
  cards: Card[]
  catMap: Record<string, AgendaCategory>
  selectedDate: string | null
  onSelect: (d: string) => void
}

export function MiniCal({ events, cards, catMap, selectedDate, onSelect }: MiniCalProps) {
  const today = getTodayISO()
  const [cal, setCal] = useState(() => new Date())
  const y = cal.getFullYear(), mo = cal.getMonth()
  const totalDays = new Date(y, mo + 1, 0).getDate()
  const startPad = new Date(y, mo, 1).getDay()
  const mStart = toISO(y, mo, 1)
  const mEnd = toISO(y, mo, totalDays)
  const expanded = useMemo(() => expandCalendarEvents(events, mStart, mEnd), [events, mStart, mEnd])
  const dotMap = useMemo(() => {
    const m: Record<string, string[]> = {}
    for (const e of expanded) {
      if (!m[e.date]) m[e.date] = []
      const col = (e.categoryId && catMap[e.categoryId]?.color) || e.color
      if (m[e.date].length < 3) m[e.date].push(col)
    }
    for (const c of cards) {
      if (c.date && c.hasDate && !m[c.date]) m[c.date] = []
    }
    return m
  }, [expanded, cards, catMap])

  const days: (number | null)[] = Array(startPad).fill(null)
  for (let i = 1; i <= totalDays; i++) days.push(i)

  return (
    <div className="agenda-mini-cal">
      <div className="agenda-mini-cal-nav">
        <button className="agenda-mini-cal-btn" type="button" onClick={() => setCal(new Date(y, mo - 1, 1))}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="10" height="10"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <span className="agenda-mini-cal-label">{MONTH_FULL[mo]} {y}</span>
        <button className="agenda-mini-cal-btn" type="button" onClick={() => setCal(new Date(y, mo + 1, 1))}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="10" height="10"><polyline points="9 18 15 12 9 6" /></svg>
        </button>
      </div>
      <div className="agenda-mini-cal-head">
        {DAY_SHORT.map((d, i) => <span key={i}>{d}</span>)}
      </div>
      <div className="agenda-mini-cal-grid">
        {days.map((day, i) => {
          if (!day) return <div key={i} />
          const iso = toISO(y, mo, day)
          const dots = dotMap[iso] ?? []
          return (
            <button key={i} type="button"
              className={['mcal-day', iso === today ? 'is-today' : '', iso === selectedDate ? 'is-sel' : '', dots.length ? 'has-dot' : ''].filter(Boolean).join(' ')}
              onClick={() => onSelect(iso)}>
              {day}
              {dots.length > 0 && <span className="mcal-dots">{dots.map((c, j) => <span key={j} className="mcal-dot" style={{ background: c }} />)}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── CatMgr ──────────────────────────────────────────────────────────────

interface CatMgrProps {
  categories: AgendaCategory[]
  filterCatId: string | null
  onFilter: (id: string | null) => void
  onAdd: (c: Omit<AgendaCategory, 'id'>) => void
  onEdit: (id: string, u: Partial<Omit<AgendaCategory, 'id'>>) => void
  onRemove: (id: string) => void
}

export function CatMgr({ categories, filterCatId, onFilter, onAdd, onEdit, onRemove }: CatMgrProps) {
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(PRESET_COLORS[0])
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')
  const inp = useRef<HTMLInputElement>(null)

  const startNew = () => { setCreating(true); setTimeout(() => inp.current?.focus(), 40) }
  const confirm = () => {
    if (newName.trim()) onAdd({ name: newName.trim(), color: newColor })
    setCreating(false); setNewName(''); setNewColor(PRESET_COLORS[0])
  }
  const confirmEdit = () => {
    if (editId) onEdit(editId, { name: editName.trim() || undefined, color: editColor })
    setEditId(null)
  }

  return (
    <div className="cat-mgr">
      {categories.map(cat => editId === cat.id ? (
        <div key={cat.id} className="cat-edit-row">
          <input type="color" value={editColor} onChange={e => setEditColor(e.target.value)} className="cat-color-pick" />
          <input value={editName} className="cat-name-inp" autoFocus
            onChange={e => setEditName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') confirmEdit(); if (e.key === 'Escape') setEditId(null) }} />
          <button type="button" className="cat-act is-ok" onClick={confirmEdit}>✓</button>
          <button type="button" className="cat-act" onClick={() => setEditId(null)}>✕</button>
        </div>
      ) : (
        <div key={cat.id} className={`cat-row${filterCatId === cat.id ? ' is-active' : ''}`}
          style={{ '--cat': cat.color } as React.CSSProperties}>
          <button type="button" className="cat-filter-btn" onClick={() => onFilter(filterCatId === cat.id ? null : cat.id)}>
            <span className="cat-dot" style={{ background: cat.color }} />
            <span className="cat-label">{cat.name}</span>
          </button>
          <span className="cat-acts">
            <button type="button" className="cat-act" title="Editar"
              onClick={() => { setEditId(cat.id); setEditName(cat.name); setEditColor(cat.color) }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="10" height="10"><path d="M11 4H4a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
            </button>
            <button type="button" className="cat-act is-del" title="Remover" onClick={() => onRemove(cat.id)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="10" height="10"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg>
            </button>
          </span>
        </div>
      ))}

      {creating ? (
        <div className="cat-create-form">
          <div className="cat-presets">
            {PRESET_COLORS.map(c => (
              <button key={c} type="button" className={`cat-preset${newColor === c ? ' is-sel' : ''}`}
                style={{ background: c }} onClick={() => setNewColor(c)} />
            ))}
          </div>
          <div className="cat-create-row">
            <span className="cat-dot" style={{ background: newColor }} />
            <input ref={inp} value={newName} className="cat-name-inp" placeholder="Nome da categoria"
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') confirm(); if (e.key === 'Escape') setCreating(false) }} />
            <button type="button" className="cat-act is-ok" onClick={confirm}>✓</button>
            <button type="button" className="cat-act" onClick={() => setCreating(false)}>✕</button>
          </div>
        </div>
      ) : (
        <button type="button" className="cat-add-btn" onClick={startNew}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="10" height="10"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Nova categoria
        </button>
      )}
    </div>
  )
}

// ── ReportsPanel ─────────────────────────────────────────────────────────

interface ReportsPanelProps {
  cards: Card[]
}

export function ReportsPanel({ cards }: ReportsPanelProps) {
  const today = getTodayISO()
  const withDate = cards.filter(c => c.hasDate && c.date)

  const byPriority = useMemo(() => {
    const counts: Record<string, number> = { P1: 0, P2: 0, P3: 0, P4: 0, none: 0 }
    for (const c of withDate.filter(x => x.status !== 'done')) counts[c.priority ?? 'none']++
    return counts
  }, [withDate])

  const byStatus = useMemo(() => {
    const counts: Record<CardStatus, number> = { todo: 0, in_progress: 0, blocked: 0, done: 0 }
    for (const c of cards) counts[c.status]++
    return counts
  }, [cards])

  const overdue = withDate.filter(c => c.status !== 'done' && c.date! < today).length
  const pending = withDate.filter(c => c.status !== 'done').length
  const blocked = cards.filter(c => c.status === 'blocked').length
  const todayN = withDate.filter(c => c.date === today).length
  const done7 = withDate.filter(c => c.status === 'done' && c.date! >= addDays(today, -7)).length
  const maxPri = Math.max(1, ...PRIORITIES.map(p => byPriority[p] ?? 0))
  const maxSta = Math.max(1, ...STATUS_ORDER.map(s => byStatus[s] ?? 0))

  return (
    <div className="reports-panel">
      <div className="reports-kpis">
        <div className={`kpi${overdue > 0 ? ' kpi--danger' : ''}`}><span className="kpi-val">{overdue}</span><span className="kpi-lbl">Atrasadas</span></div>
        <div className="kpi"><span className="kpi-val">{pending}</span><span className="kpi-lbl">Pendentes</span></div>
        <div className={`kpi${blocked > 0 ? ' kpi--warn' : ''}`}><span className="kpi-val">{blocked}</span><span className="kpi-lbl">Bloqueadas</span></div>
        <div className="kpi"><span className="kpi-val">{todayN}</span><span className="kpi-lbl">Hoje</span></div>
        <div className="kpi kpi--ok"><span className="kpi-val">{done7}</span><span className="kpi-lbl">Feitas (7d)</span></div>
      </div>
      <div className="reports-section">
        <div className="reports-section-title">Por Prioridade</div>
        <div className="reports-bars">
          {PRIORITIES.map(p => (
            <div key={p} className="report-bar-row">
              <span className="report-bar-label" style={{ color: PRIORITY_COLORS[p] }}>{p}</span>
              <div className="report-bar-track"><div className="report-bar-fill" style={{ width: `${Math.round(((byPriority[p] ?? 0) / maxPri) * 100)}%`, background: PRIORITY_COLORS[p] }} /></div>
              <span className="report-bar-count">{byPriority[p] ?? 0}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="reports-section">
        <div className="reports-section-title">Por Status</div>
        <div className="reports-bars">
          {STATUS_ORDER.map(s => (
            <div key={s} className="report-bar-row">
              <span className="report-bar-label" style={{ color: STATUS_COLORS[s] }}>{STATUS_LABELS[s]}</span>
              <div className="report-bar-track"><div className="report-bar-fill" style={{ width: `${Math.round(((byStatus[s] ?? 0) / maxSta) * 100)}%`, background: STATUS_COLORS[s] }} /></div>
              <span className="report-bar-count">{byStatus[s] ?? 0}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
