import { useEffect, useState } from 'react'
import type { Bill, CalendarEvent, Card, Expense, Note, Period, SavingsGoal, StudyState } from '@types'
import { STATUS_COLORS, STATUS_LABELS } from '@types'
import { expandCalendarEvents, getCurrentWeekDates, getDayFromDate, getTodayISO } from '@utils'
import type { AppView } from '../../../shared/InternalNav'
import type { DashboardSyncStatus } from '../../DashboardPage'

const DAYS_ORDER = [
  { key: 'mon' as const, label: 'Seg' },
  { key: 'tue' as const, label: 'Ter' },
  { key: 'wed' as const, label: 'Qua' },
  { key: 'thu' as const, label: 'Qui' },
  { key: 'fri' as const, label: 'Sex' },
  { key: 'sat' as const, label: 'Sab' },
  { key: 'sun' as const, label: 'Dom' },
]

const fmt = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`

// ── Report: Tasks today ───────────────────────────────────────────────────────

interface TasksWidgetProps {
  cards:    Card[]
  onGoToPlannerCard: (id: string) => void
  onNavigate: (v: AppView) => void
}

export const TasksWidget = ({ cards, onGoToPlannerCard, onNavigate }: TasksWidgetProps) => {
  const today = getTodayISO()
  const todayDay = getDayFromDate(today)
  const allTodayCards = [
    ...cards.filter(c => c.hasDate && c.date === today),
    ...cards.filter(c => !c.hasDate && c.location.day === todayDay && !!c.location.period)
      .sort((a, b) => {
        const o: Record<Period, number> = { morning: 0, afternoon: 1, night: 2 }
        return (o[a.location.period as Period] ?? 0) - (o[b.location.period as Period] ?? 0) || a.order - b.order
      }),
  ]
  const done       = allTodayCards.filter(c => c.status === 'done').length
  const inProgress = allTodayCards.filter(c => c.status === 'in_progress').length
  const blocked    = allTodayCards.filter(c => c.status === 'blocked').length
  const total      = allTodayCards.length

  return (
    <>
      {total > 0 && (
        <div className="dw-progress-bar">
          {done       > 0 && <div className="dw-progress-fill" style={{ width: `${(done       / total) * 100}%`, background: STATUS_COLORS.done       }} />}
          {inProgress > 0 && <div className="dw-progress-fill" style={{ width: `${(inProgress / total) * 100}%`, background: STATUS_COLORS.in_progress }} />}
          {blocked    > 0 && <div className="dw-progress-fill" style={{ width: `${(blocked    / total) * 100}%`, background: STATUS_COLORS.blocked     }} />}
        </div>
      )}
      {total === 0 ? (
        <div className="dw-empty">Nenhum card para hoje.</div>
      ) : (
        <div className="dw-list">
          {allTodayCards.slice(0, 6).map(card => (
            <button key={card.id} type="button" className="dw-list-item" onClick={() => onGoToPlannerCard(card.id)}>
              <span className="dw-item-dot" style={{ background: STATUS_COLORS[card.status] }} />
              <span className="dw-item-text">{card.title}</span>
              <span className="dw-item-badge">{STATUS_LABELS[card.status]}</span>
            </button>
          ))}
        </div>
      )}
      <button type="button" className="dw-link" onClick={() => onNavigate('planner')}>Abrir planejamento</button>
    </>
  )
}

// ── Report: Events today ──────────────────────────────────────────────────────

interface EventsWidgetProps {
  calendarEvents: CalendarEvent[]
  onGoToCalendarDate: (date: string) => void
  onNavigate: (v: AppView) => void
}

export const EventsWidget = ({ calendarEvents, onGoToCalendarDate, onNavigate }: EventsWidgetProps) => {
  const today = getTodayISO()
  const events = expandCalendarEvents(calendarEvents, today, today)
    .filter(e => e.date === today)
    .sort((a, b) => (!a.time ? 1 : !b.time ? -1 : a.time.localeCompare(b.time)))

  return (
    <>
      {events.length === 0 ? (
        <div className="dw-empty">Nenhum evento para hoje.</div>
      ) : (
        <div className="dw-list">
          {events.slice(0, 5).map(ev => (
            <button key={ev.id} type="button" className="dw-list-item" onClick={() => onGoToCalendarDate(ev.date)}>
              <span className="dw-item-dot" style={{ background: ev.color || 'var(--color-primary)' }} />
              <span className="dw-item-text">{ev.time ? `${ev.time} • ${ev.title}` : ev.title}</span>
            </button>
          ))}
        </div>
      )}
      <button type="button" className="dw-link" onClick={() => onNavigate('calendar')}>Abrir calendário</button>
    </>
  )
}

// ── Report: Week overview ─────────────────────────────────────────────────────

interface WeekWidgetProps {
  cards:          Card[]
  calendarEvents: CalendarEvent[]
}

export const WeekWidget = ({ cards, calendarEvents }: WeekWidgetProps) => {
  const today     = getTodayISO()
  const weekDates = getCurrentWeekDates()
  const overview  = DAYS_ORDER.map(({ key, label }) => {
    const date      = weekDates[key]
    const dayEvents = expandCalendarEvents(calendarEvents, date, date).filter(e => e.date === date)
    const dayCards  = cards.filter(c => (c.hasDate && c.date === date) || (!c.hasDate && c.location.day === key && !!c.location.period))
    const dots      = dayEvents.slice(0, 3).map(e => e.color || 'var(--color-primary)')
    return { key, label, date, total: dayEvents.length + dayCards.length, dots, isToday: date === today }
  })

  return (
    <div className="dw-week-grid">
      {overview.map(day => (
        <div key={day.key} className={`dw-week-day ${day.isToday ? 'is-today' : ''}`}>
          <span className="dw-week-day-name">{day.label}</span>
          <span className="dw-week-day-count">{day.total}</span>
          <div className="dw-week-dots">
            {day.dots.map((color, i) => <span key={i} className="dw-week-dot" style={{ background: color }} />)}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Report: Financial ─────────────────────────────────────────────────────────

interface FinancialWidgetProps {
  bills:        Bill[]
  expenses:     Expense[]
  savingsGoals: SavingsGoal[]
  onNavigate:   (v: AppView) => void
}

export const FinancialWidget = ({ bills, expenses, savingsGoals, onNavigate }: FinancialWidgetProps) => {
  const month       = getTodayISO().slice(0, 7)
  const unpaid      = bills.filter(b => !b.isPaid).length
  const monthlyExp  = expenses.filter(e => e.date.startsWith(month)).reduce((s, e) => s + e.amount, 0)
  const openGoals   = savingsGoals.filter(g => g.currentAmount < g.targetAmount).length

  return (
    <>
      <div className="dw-summary">
        <div className="dw-summary-row"><span>Contas pendentes</span><span>{unpaid}</span></div>
        <div className="dw-summary-row"><span>Gastos do mês</span><span>{fmt(monthlyExp)}</span></div>
        <div className="dw-summary-row"><span>Metas financeiras</span><span>{openGoals}</span></div>
      </div>
      <button type="button" className="dw-link" onClick={() => onNavigate('financial')}>Abrir financeiro</button>
    </>
  )
}

// ── Report: Knowledge ─────────────────────────────────────────────────────────

interface KnowledgeWidgetProps {
  notes:          Note[]
  study:          StudyState
  onNavigate:     (v: AppView) => void
}

export const KnowledgeWidget = ({ notes, study, onNavigate }: KnowledgeWidgetProps) => (
  <>
    <div className="dw-summary">
      <div className="dw-summary-row"><span>Notas</span><span>{notes.length}</span></div>
      <div className="dw-summary-row"><span>Metas de foco</span><span>{study.goals.length}</span></div>
      <div className="dw-summary-row"><span>Sessões</span><span>{study.sessions.length}</span></div>
    </div>
    <button type="button" className="dw-link" onClick={() => onNavigate('notes')}>Abrir notas</button>
  </>
)

// ── Report: Tools ─────────────────────────────────────────────────────────────

interface ToolsWidgetProps {
  shortcutsCount:        number
  appsCount:             number
  clipboardCount:        number
  colorPalettesCount:    number
}

export const ToolsWidget = ({ shortcutsCount, appsCount, clipboardCount, colorPalettesCount }: ToolsWidgetProps) => (
  <div className="dw-summary">
    <div className="dw-summary-row"><span>Atalhos</span><span>{shortcutsCount}</span></div>
    <div className="dw-summary-row"><span>Apps</span><span>{appsCount}</span></div>
    <div className="dw-summary-row"><span>Itens de clipboard</span><span>{clipboardCount}</span></div>
    <div className="dw-summary-row"><span>Paletas</span><span>{colorPalettesCount}</span></div>
  </div>
)

// ── Report: System ────────────────────────────────────────────────────────────

const SYNC_STATUS_LABELS: Record<DashboardSyncStatus, string> = {
  idle: 'Local', pending: 'Pendente', syncing: 'Sincronizando', synced: 'Sincronizado', error: 'Erro',
}

interface SystemWidgetProps {
  syncStatus:    DashboardSyncStatus
  lastSyncAt?:   string | null
  userLoggedIn:  boolean
  onNavigate:    (v: AppView) => void
}

export const SystemWidget = ({ syncStatus, lastSyncAt, userLoggedIn, onNavigate }: SystemWidgetProps) => {
  const lastLabel = lastSyncAt
    ? new Date(lastSyncAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    : 'Nunca'
  return (
    <>
      <div className="dw-summary">
        <div className="dw-summary-row"><span>Sync</span><span>{SYNC_STATUS_LABELS[syncStatus]}</span></div>
        <div className="dw-summary-row"><span>Último sync</span><span>{lastLabel}</span></div>
        <div className="dw-summary-row"><span>Modo</span><span>{userLoggedIn ? 'Conectado' : 'Local'}</span></div>
      </div>
      <button type="button" className="dw-link" onClick={() => onNavigate('settings')}>Configurações</button>
    </>
  )
}

// ── Widget: Search ────────────────────────────────────────────────────────────

interface SearchWidgetProps {
  onNavigate: (v: AppView) => void
}

export const SearchWidget = ({ onNavigate }: SearchWidgetProps) => (
  <button type="button" className="dw-search-btn" onClick={() => onNavigate('today')}>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15" className="dw-search-icon">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
    <span className="dw-search-placeholder">Buscar cards, eventos, atalhos e notas...</span>
    <kbd className="dw-search-kbd">Ctrl+K</kbd>
  </button>
)

// ── Widget: DateTime ──────────────────────────────────────────────────────────

export const DateTimeWidget = () => {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(id)
  }, [])

  const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
  const monthNames = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')

  return (
    <div className="dw-datetime">
      <span className="dw-datetime-day">{dayNames[now.getDay()]}</span>
      <span className="dw-datetime-date">{now.getDate()} de {monthNames[now.getMonth()]}</span>
      <span className="dw-datetime-time">{hh}:{mm}</span>
    </div>
  )
}
