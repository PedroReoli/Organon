import React, { useCallback, useMemo, useRef, useState } from 'react'
import { Check, X } from 'lucide-react'
import { CalendarEventModal } from '../CalendarEventModal'
import { useAgendaCategories } from '@hooks/useAgendaCategories'
import type {
  AgendaCategory, Card, CalendarEvent, CardPriority, CardStatus,
} from '@types'
import {
  PRIORITY_COLORS, STATUS_COLORS, STATUS_LABELS, STATUS_ORDER,
} from '@types'
import { expandCalendarEvents, getTodayISO, formatDateShort } from '@utils'

// ── Helpers de data ────────────────────────────────────────────────────────

const MONTH_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const MONTH_FULL  = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const DAY_SHORT   = ['D','S','T','Q','Q','S','S']
const DAY_LONG    = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
const PRIORITIES: CardPriority[] = ['P1','P2','P3','P4']

function toISO(y: number, m: number, d: number) {
  return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
}
function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n)
  return toISO(d.getFullYear(), d.getMonth(), d.getDate())
}
function getDayName(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  const today = getTodayISO()
  if (iso === today) return 'Hoje'
  if (iso === addDays(today, 1)) return 'Amanhã'
  return `${DAY_LONG[d.getDay()]}, ${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`
}
function makeBlankEvent(date: string): CalendarEvent {
  return {
    id:'', title:'', date, time:null, recurrence:null, reminder:null,
    description:'', color:'var(--color-primary)', categoryId:null,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  }
}

const PRESET_COLORS = [
  'var(--color-primary)','#10b981','#f59e0b','#ef4444','var(--color-primary)',
  'var(--color-primary)','var(--color-primary)','#f97316','var(--color-primary)','#64748b',
]

// ── Mini calendário ────────────────────────────────────────────────────────

interface MiniCalProps {
  events: CalendarEvent[]
  cards: Card[]
  catMap: Record<string, AgendaCategory>
  selectedDate: string | null
  onSelect: (d: string) => void
}

function MiniCal({ events, cards, catMap, selectedDate, onSelect }: MiniCalProps) {
  const today = getTodayISO()
  const [cal, setCal] = useState(() => new Date())
  const y = cal.getFullYear(), mo = cal.getMonth()
  const totalDays = new Date(y, mo + 1, 0).getDate()
  const startPad  = new Date(y, mo, 1).getDay()
  const mStart = toISO(y, mo, 1)
  const mEnd   = toISO(y, mo, totalDays)
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

  const days: (number|null)[] = Array(startPad).fill(null)
  for (let i = 1; i <= totalDays; i++) days.push(i)

  return (
    <div className="agenda-mini-cal">
      <div className="agenda-mini-cal-nav">
        <button className="agenda-mini-cal-btn" type="button" onClick={() => setCal(new Date(y, mo-1, 1))}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="10" height="10"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span className="agenda-mini-cal-label">{MONTH_FULL[mo]} {y}</span>
        <button className="agenda-mini-cal-btn" type="button" onClick={() => setCal(new Date(y, mo+1, 1))}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="10" height="10"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>
      <div className="agenda-mini-cal-head">
        {DAY_SHORT.map((d,i) => <span key={i}>{d}</span>)}
      </div>
      <div className="agenda-mini-cal-grid">
        {days.map((day, i) => {
          if (!day) return <div key={i}/>
          const iso = toISO(y, mo, day)
          const dots = dotMap[iso] ?? []
          return (
            <button key={i} type="button"
              className={['mcal-day', iso===today?'is-today':'', iso===selectedDate?'is-sel':'', dots.length?'has-dot':''].filter(Boolean).join(' ')}
              onClick={() => onSelect(iso)}
            >
              {day}
              {dots.length > 0 && (
                <span className="mcal-dots">
                  {dots.map((c,j) => <span key={j} className="mcal-dot" style={{background:c}}/>)}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Gerenciador de categorias ──────────────────────────────────────────────

interface CatMgrProps {
  categories: AgendaCategory[]
  filterCatId: string | null
  onFilter: (id: string|null) => void
  onAdd: (c: Omit<AgendaCategory,'id'>) => void
  onEdit: (id: string, u: Partial<Omit<AgendaCategory,'id'>>) => void
  onRemove: (id: string) => void
}

function CatMgr({ categories, filterCatId, onFilter, onAdd, onEdit, onRemove }: CatMgrProps) {
  const [creating,  setCreating]  = useState(false)
  const [newName,   setNewName]   = useState('')
  const [newColor,  setNewColor]  = useState(PRESET_COLORS[0])
  const [editId,    setEditId]    = useState<string|null>(null)
  const [editName,  setEditName]  = useState('')
  const [editColor, setEditColor] = useState('')
  const inp = useRef<HTMLInputElement>(null)

  const startNew = () => { setCreating(true); setTimeout(()=>inp.current?.focus(),40) }
  const confirm  = () => {
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
          <input type="color" value={editColor} onChange={e=>setEditColor(e.target.value)} className="cat-color-pick"/>
          <input value={editName} className="cat-name-inp" autoFocus
            onChange={e=>setEditName(e.target.value)}
            onKeyDown={e=>{ if(e.key==='Enter')confirmEdit(); if(e.key==='Escape')setEditId(null) }}
          />
          <button type="button" className="cat-act is-ok" onClick={confirmEdit} aria-label="Salvar"><Check size={11} /></button>
          <button type="button" className="cat-act" onClick={()=>setEditId(null)} aria-label="Cancelar"><X size={11} /></button>
        </div>
      ) : (
        <div key={cat.id} className={`cat-row${filterCatId===cat.id?' is-active':''}`}
          style={{'--cat':cat.color} as React.CSSProperties}>
          <button type="button" className="cat-filter-btn" onClick={()=>onFilter(filterCatId===cat.id?null:cat.id)}>
            <span className="cat-dot" style={{background:cat.color}}/>
            <span className="cat-label">{cat.name}</span>
          </button>
          <span className="cat-acts">
            <button type="button" className="cat-act" title="Editar"
              onClick={()=>{setEditId(cat.id);setEditName(cat.name);setEditColor(cat.color)}}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="10" height="10"><path d="M11 4H4a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button type="button" className="cat-act is-del" title="Remover" onClick={()=>onRemove(cat.id)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="10" height="10"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
            </button>
          </span>
        </div>
      ))}

      {creating ? (
        <div className="cat-create-form">
          <div className="cat-presets">
            {PRESET_COLORS.map(c=>(
              <button key={c} type="button" className={`cat-preset${newColor===c?' is-sel':''}`}
                style={{background:c}} onClick={()=>setNewColor(c)}/>
            ))}
          </div>
          <div className="cat-create-row">
            <span className="cat-dot" style={{background:newColor}}/>
            <input ref={inp} value={newName} className="cat-name-inp" placeholder="Nome da categoria"
              onChange={e=>setNewName(e.target.value)}
              onKeyDown={e=>{ if(e.key==='Enter')confirm(); if(e.key==='Escape')setCreating(false) }}
            />
            <button type="button" className="cat-act is-ok" onClick={confirm} aria-label="Confirmar"><Check size={11} /></button>
            <button type="button" className="cat-act" onClick={()=>setCreating(false)} aria-label="Cancelar"><X size={11} /></button>
          </div>
        </div>
      ) : (
        <button type="button" className="cat-add-btn" onClick={startNew}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="10" height="10"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nova categoria
        </button>
      )}
    </div>
  )
}

// ── Timeline de eventos/tarefas ────────────────────────────────────────────

interface TimelineItem {
  type: 'event' | 'card'
  id: string
  title: string
  time: string | null
  color: string
  status?: CardStatus
  priority?: CardPriority | null
  catName?: string
  sourceEvent?: CalendarEvent
  sourceCard?: Card
}

interface AgendaTimelineProps {
  cards: Card[]
  events: CalendarEvent[]
  catMap: Record<string, AgendaCategory>
  filterCatId: string | null
  selectedDate: string | null
  onEventClick: (e: CalendarEvent) => void
  onNewEvent: (date: string) => void
}

function AgendaTimeline({
  cards, events, catMap, filterCatId, selectedDate, onEventClick, onNewEvent,
}: AgendaTimelineProps) {
  const today = getTodayISO()
  const startDate = selectedDate ?? today
  const endDate   = addDays(startDate, 29) // 30 days

  const grouped = useMemo(() => {
    const expanded = expandCalendarEvents(events, startDate, endDate)
    const map: Record<string, TimelineItem[]> = {}

    for (const e of expanded) {
      if (e.date < startDate) continue
      if (filterCatId && e.categoryId !== filterCatId) continue
      if (!map[e.date]) map[e.date] = []
      const cat = e.categoryId ? catMap[e.categoryId] : null
      map[e.date].push({
        type: 'event', id: e.id, title: e.title,
        time: e.time, color: cat?.color ?? e.color,
        catName: cat?.name, sourceEvent: e,
      })
    }

    for (const c of cards) {
      if (!c.hasDate || !c.date) continue
      if (c.date < startDate || c.date > endDate) continue
      if (c.status === 'done') continue
      if (!map[c.date]) map[c.date] = []
      map[c.date].push({
        type: 'card', id: c.id, title: c.title,
        time: c.time, color: STATUS_COLORS[c.status],
        status: c.status, priority: c.priority,
        sourceCard: c,
      })
    }

    // Sort each day: events first, then by time
    for (const date of Object.keys(map)) {
      map[date].sort((a, b) => {
        const tA = a.time ?? '99:99', tB = b.time ?? '99:99'
        return tA.localeCompare(tB)
      })
    }

    return map
  }, [cards, events, catMap, filterCatId, startDate, endDate])

  const dates = useMemo(() => {
    const all: string[] = []
    for (let i = 0; i < 30; i++) all.push(addDays(startDate, i))
    return all.filter(d => grouped[d] && grouped[d].length > 0)
  }, [grouped, startDate])

  if (dates.length === 0) {
    return (
      <div className="timeline-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="40" height="40">
          <rect x="3" y="4" width="18" height="18" rx="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        <p>Nenhum evento ou tarefa nos próximos 30 dias</p>
        <button type="button" className="timeline-new-btn" onClick={() => onNewEvent(startDate)}>
          + Criar evento
        </button>
      </div>
    )
  }

  return (
    <div className="agenda-timeline">
      {dates.map(date => (
        <div key={date} className="timeline-day-group">
          <div className={`timeline-day-label${date === today ? ' is-today' : ''}`}>
            <span className="timeline-day-name">{getDayName(date)}</span>
            <button type="button" className="timeline-day-add" onClick={() => onNewEvent(date)} title="Novo evento neste dia">+</button>
          </div>
          <div className="timeline-day-items">
            {grouped[date].map(item => (
              <button
                key={`${item.type}-${item.id}`}
                type="button"
                className={`timeline-item timeline-item--${item.type}${item.status === 'blocked' ? ' is-blocked' : ''}`}
                style={{ '--item-color': item.color } as React.CSSProperties}
                onClick={() => item.sourceEvent && onEventClick(item.sourceEvent)}
              >
                <span className="timeline-item-bar" style={{ background: item.color }}/>
                <div className="timeline-item-body">
                  <div className="timeline-item-top">
                    <span className="timeline-item-title">{item.title}</span>
                    {item.priority && (
                      <span className="timeline-item-priority"
                        style={{ color: PRIORITY_COLORS[item.priority], background: `${PRIORITY_COLORS[item.priority]}18` }}>
                        {item.priority}
                      </span>
                    )}
                    {item.status && item.type === 'card' && (
                      <span className="timeline-item-status" style={{ color: STATUS_COLORS[item.status] }}>
                        {STATUS_LABELS[item.status]}
                      </span>
                    )}
                  </div>
                  <div className="timeline-item-meta">
                    {item.time && <span className="timeline-item-time">{item.time}</span>}
                    {item.catName && <span className="timeline-item-cat" style={{ color: item.color }}>{item.catName}</span>}
                    {item.type === 'event' && !item.catName && <span className="timeline-item-type">Evento</span>}
                    {item.type === 'card' && <span className="timeline-item-type">Tarefa</span>}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Painel de relatórios ───────────────────────────────────────────────────

interface ReportsPanelProps {
  cards: Card[]
  catMap: Record<string, AgendaCategory>
}

function ReportsPanel({ cards, catMap: _catMap }: ReportsPanelProps) {
  const today = getTodayISO()
  const withDate = cards.filter(c => c.hasDate && c.date)

  const byPriority = useMemo(() => {
    const counts: Record<string, number> = { P1:0, P2:0, P3:0, P4:0, none:0 }
    for (const c of withDate.filter(c=>c.status!=='done')) {
      const k = c.priority ?? 'none'
      counts[k] = (counts[k]??0) + 1
    }
    return counts
  }, [withDate])

  const byStatus = useMemo(() => {
    const counts: Record<CardStatus, number> = { todo: 0, in_progress: 0, blocked: 0, done: 0, postponed: 0, cancelled: 0, overdue: 0 }
    for (const c of cards) counts[c.status] = (counts[c.status] ?? 0) + 1
    return counts
  }, [cards])

  // byCat not used in render but kept for future use

  const overdue  = withDate.filter(c => c.status !== 'done' && c.date! < today).length
  const pending  = withDate.filter(c => c.status !== 'done').length
  const todayAll = withDate.filter(c => c.date === today).length
  const blocked  = cards.filter(c => c.status === 'blocked').length
  const done7    = withDate.filter(c => c.status === 'done' && c.date! >= addDays(today, -7)).length

  const maxPri = Math.max(1, ...PRIORITIES.map(p => byPriority[p] ?? 0))
  const maxSta = Math.max(1, ...STATUS_ORDER.map(s => byStatus[s] ?? 0))

  return (
    <div className="reports-panel">
      {/* KPIs */}
      <div className="reports-kpis">
        <div className={`kpi${overdue > 0 ? ' kpi--danger' : ''}`}>
          <span className="kpi-val">{overdue}</span>
          <span className="kpi-lbl">Atrasadas</span>
        </div>
        <div className="kpi">
          <span className="kpi-val">{pending}</span>
          <span className="kpi-lbl">Pendentes</span>
        </div>
        <div className={`kpi${blocked > 0 ? ' kpi--warn' : ''}`}>
          <span className="kpi-val">{blocked}</span>
          <span className="kpi-lbl">Bloqueadas</span>
        </div>
        <div className="kpi">
          <span className="kpi-val">{todayAll}</span>
          <span className="kpi-lbl">Hoje</span>
        </div>
        <div className="kpi kpi--ok">
          <span className="kpi-val">{done7}</span>
          <span className="kpi-lbl">Feitas (7d)</span>
        </div>
      </div>

      {/* Por Prioridade */}
      <div className="reports-section">
        <div className="reports-section-title">Por Prioridade</div>
        <div className="reports-bars">
          {PRIORITIES.map(p => {
            const count = byPriority[p] ?? 0
            const pct   = Math.round((count / maxPri) * 100)
            return (
              <div key={p} className="report-bar-row">
                <span className="report-bar-label" style={{ color: PRIORITY_COLORS[p] }}>{p}</span>
                <div className="report-bar-track">
                  <div className="report-bar-fill" style={{ width: `${pct}%`, background: PRIORITY_COLORS[p] }}/>
                </div>
                <span className="report-bar-count">{count}</span>
              </div>
            )
          })}
          {byPriority.none > 0 && (
            <div className="report-bar-row">
              <span className="report-bar-label" style={{ color: 'var(--color-text-muted)' }}>—</span>
              <div className="report-bar-track">
                <div className="report-bar-fill" style={{ width: `${Math.round((byPriority.none/maxPri)*100)}%`, background: 'var(--color-text-muted)' }}/>
              </div>
              <span className="report-bar-count">{byPriority.none}</span>
            </div>
          )}
        </div>
      </div>

      {/* Por Status */}
      <div className="reports-section">
        <div className="reports-section-title">Por Status</div>
        <div className="reports-bars">
          {STATUS_ORDER.map(s => {
            const count = byStatus[s] ?? 0
            const pct   = Math.round((count / maxSta) * 100)
            return (
              <div key={s} className="report-bar-row">
                <span className="report-bar-label" style={{ color: STATUS_COLORS[s] }}>{STATUS_LABELS[s]}</span>
                <div className="report-bar-track">
                  <div className="report-bar-fill" style={{ width: `${pct}%`, background: STATUS_COLORS[s] }}/>
                </div>
                <span className="report-bar-count">{count}</span>
              </div>
            )
          })}
        </div>
      </div>


      {/* Distribuição de tarefas por dia (próximos 7 dias) */}
      <div className="reports-section">
        <div className="reports-section-title">Próximos 7 dias</div>
        <div className="reports-week-chart">
          {Array.from({length:7}, (_,i) => {
            const date  = addDays(today, i)
            const d     = new Date(date + 'T00:00:00')
            const count = withDate.filter(c => c.date === date && c.status !== 'done').length
            const isT   = date === today
            return (
              <div key={date} className={`week-bar-col${isT?' is-today':''}`}>
                <div className="week-bar-stack">
                  {count > 0 && <div className="week-bar" style={{ height: Math.min(60, count * 10 + 8) }}>{count}</div>}
                  {count === 0 && <div className="week-bar week-bar--empty"/>}
                </div>
                <span className="week-bar-day">{DAY_SHORT[d.getDay()]}</span>
                <span className="week-bar-date">{d.getDate()}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── HubAgenda ─────────────────────────────────────────────────────────────

interface HubAgendaProps {
  cards: Card[]
  calendarEvents: CalendarEvent[]
  onEditEvent: (id: string, updates: Partial<Omit<CalendarEvent,'id'|'createdAt'>>) => void
  onRemoveEvent: (id: string) => void
  onAddEvent?: (e: Omit<CalendarEvent,'id'|'createdAt'|'updatedAt'>) => void
  // Kept for compatibility with App.tsx but not used in this hub:
  projects?: unknown; reduceModeSignal?: unknown; getCardsForLocation?: unknown
  onAddCard?: unknown; onEditCard?: unknown; onRemoveCard?: unknown
  onMoveCard?: unknown; onReorderCard?: unknown; openCardId?: unknown
  onOpenCardHandled?: unknown; isLoggedIn?: unknown
}

export const HubAgenda = ({
  cards, calendarEvents, onEditEvent, onRemoveEvent, onAddEvent,
}: HubAgendaProps) => {
  const { categories, addCategory, editCategory, removeCategory } = useAgendaCategories()

  const catMap    = useMemo(() => Object.fromEntries(categories.map(c=>[c.id,c])), [categories])
  const today     = getTodayISO()

  const [selectedDate,  setSelectedDate] = useState<string | null>(null)
  const [filterCatId,   setFilterCatId]  = useState<string | null>(null)
  const [editingEvent,  setEditingEvent] = useState<CalendarEvent | null>(null)
  const [creatingEvent, setCreatingEvent]= useState<CalendarEvent | null>(null)

  const handleNewEvent = useCallback((date: string) => {
    setCreatingEvent(makeBlankEvent(date))
  }, [])

  return (
    <div className="hub-agenda">
      {/* ── Cabeçalho ─────────────────────────────── */}
      <header className="hub-agenda-header">
        <div className="hub-agenda-header-left">
          <h1 className="hub-agenda-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            Agenda
          </h1>
          {filterCatId && catMap[filterCatId] && (
            <span className="hub-agenda-filter-badge" style={{ background: `${catMap[filterCatId].color}20`, color: catMap[filterCatId].color, borderColor: `${catMap[filterCatId].color}40` }}>
              {catMap[filterCatId].name}
              <button type="button" onClick={() => setFilterCatId(null)}>×</button>
            </span>
          )}
        </div>
        <button type="button" className="hub-agenda-new-btn" onClick={() => handleNewEvent(selectedDate ?? today)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="12" height="12"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Novo evento
        </button>
      </header>

      {/* ── Layout principal ───────────────────────── */}
      <div className="hub-agenda-body">

        {/* COLUNA ESQUERDA: calendário + categorias */}
        <aside className="hub-agenda-left">
          <MiniCal
            events={calendarEvents}
            cards={cards}
            catMap={catMap}
            selectedDate={selectedDate}
            onSelect={setSelectedDate}
          />

          <div className="hub-agenda-left-section">
            <div className="hub-section-title">Categorias</div>
            <CatMgr
              categories={categories}
              filterCatId={filterCatId}
              onFilter={setFilterCatId}
              onAdd={addCategory}
              onEdit={editCategory}
              onRemove={removeCategory}
            />
          </div>
        </aside>

        {/* COLUNA CENTRAL: timeline */}
        <section className="hub-agenda-center">
          <div className="hub-section-header">
            <span className="hub-section-title">
              {selectedDate && selectedDate !== today
                ? `A partir de ${formatDateShort(selectedDate)}`
                : 'Próximos 30 dias'}
            </span>
            {selectedDate && (
              <button type="button" className="hub-section-reset" onClick={() => setSelectedDate(null)}>
                Hoje
              </button>
            )}
          </div>
          <AgendaTimeline
            cards={cards}
            events={calendarEvents}
            catMap={catMap}
            filterCatId={filterCatId}
            selectedDate={selectedDate}
            onEventClick={setEditingEvent}
            onNewEvent={handleNewEvent}
          />
        </section>

        {/* COLUNA DIREITA: relatórios */}
        <aside className="hub-agenda-right">
          <div className="hub-section-title">Relatórios</div>
          <ReportsPanel cards={cards} catMap={catMap}/>
        </aside>
      </div>

      {/* Modais */}
      {editingEvent && (
        <CalendarEventModal
          event={editingEvent}
          defaultPeriod="morning"
          categories={categories}
          onClose={() => setEditingEvent(null)}
          onSave={(updates: Partial<CalendarEvent>) => {
            const baseId = (editingEvent as CalendarEvent & {sourceId?:string}).sourceId ?? editingEvent.id
            onEditEvent(baseId, updates)
            setEditingEvent(null)
          }}
          onDelete={() => {
            const baseId = (editingEvent as CalendarEvent & {sourceId?:string}).sourceId ?? editingEvent.id
            onRemoveEvent(baseId)
            setEditingEvent(null)
          }}
        />
      )}
      {creatingEvent && (
        <CalendarEventModal
          event={creatingEvent}
          defaultPeriod="morning"
          categories={categories}
          onClose={() => setCreatingEvent(null)}
          onSave={(updates: Partial<CalendarEvent>) => {
            if (!updates.title?.trim()) return
            onAddEvent?.({
              title: updates.title!, date: updates.date ?? creatingEvent.date,
              time: updates.time ?? null, color: updates.color ?? 'var(--color-primary)',
              description: updates.description ?? '', recurrence: updates.recurrence ?? null,
              reminder: updates.reminder ?? null, categoryId: updates.categoryId ?? null,
            })
            setCreatingEvent(null)
          }}
          onDelete={() => setCreatingEvent(null)}
        />
      )}
    </div>
  )
}
