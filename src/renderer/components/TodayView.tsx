import { useState, useEffect, useRef } from 'react'
import type { Card, CalendarEvent, AppMacro, Period, Habit, HabitEntry, Bill, Expense, SavingsGoal, FileItem, Note, ShortcutItem, QuickAccessItem } from '../types'
import { PERIOD_LABELS, STATUS_LABELS, STATUS_COLORS } from '../types'
import { expandCalendarEvents, getTodayISO, getDayFromDate, getCurrentWeekDates } from '../utils'
import type { AppView } from './InternalNav'
import { QuickSearchModal } from './QuickSearchModal'
import { AVAILABLE_VIEWS } from './quickAccessViews'

interface TodayViewProps {
  cards: Card[]
  calendarEvents: CalendarEvent[]
  macros: AppMacro[]
  habits: Habit[]
  habitEntries: HabitEntry[]
  bills: Bill[]
  expenses: Expense[]
  savingsGoals: SavingsGoal[]
  shortcuts: ShortcutItem[]
  files: FileItem[]
  notes: Note[]
  quickAccess: QuickAccessItem[]
  showQuickSearch: boolean
  onOpenQuickSearch: () => void
  onCloseQuickSearch: () => void
  onAddQuickAccess: (view: string, label: string) => void
  onRemoveQuickAccess: (id: string) => void
  onRunMacro: (macroId: string) => void
  onToggleHabitBoolean: (habit: Habit) => void
  onNavigate: (view: AppView) => void
  onGoToPlannerCard: (cardId: string) => void
  onGoToCalendarDate: (dateISO: string) => void
  onOpenShortcut: (url: string) => void
  onOpenFile: (fileId: string) => void
  onGoToNotes: () => void
}

export const TodayView = ({
  cards,
  calendarEvents,
  macros,
  habits,
  habitEntries,
  bills,
  expenses,
  savingsGoals,
  shortcuts,
  files,
  notes,
  quickAccess,
  showQuickSearch,
  onOpenQuickSearch,
  onCloseQuickSearch,
  onAddQuickAccess,
  onRemoveQuickAccess,
  onRunMacro,
  onToggleHabitBoolean,
  onNavigate,
  onGoToPlannerCard,
  onGoToCalendarDate,
  onOpenShortcut,
  onOpenFile,
  onGoToNotes,
}: TodayViewProps) => {
  const today = getTodayISO()
  const todayEvents = expandCalendarEvents(calendarEvents, today, today).filter(event => event.date === today)
  const todayDay = getDayFromDate(today)

  const todayCardsWithDate = cards.filter(card => card.hasDate && card.date === today)
  const todayCardsNoDate = cards
    .filter(card => !card.hasDate && card.location.day === todayDay && !!card.location.period)
    .sort((a, b) => {
      const order: Record<Period, number> = { morning: 0, afternoon: 1, night: 2 }
      const ap = a.location.period as Period
      const bp = b.location.period as Period
      if (order[ap] !== order[bp]) return order[ap] - order[bp]
      return a.order - b.order
    })

  const allTodayCards = [...todayCardsWithDate, ...todayCardsNoDate]
  const totalItems = todayEvents.length + allTodayCards.length

  // Progress stats
  const doneCards = allTodayCards.filter(c => c.status === 'done').length
  const inProgressCards = allTodayCards.filter(c => c.status === 'in_progress').length
  const blockedCards = allTodayCards.filter(c => c.status === 'blocked').length

  // Habits stats
  const isHabitScheduledForDate = (habit: Habit, date: string): boolean => {
    if (habit.frequency === 'daily') return true
    if (habit.weekDays.length > 0) {
      const dayOfWeek = new Date(date + 'T00:00:00').getDay()
      return habit.weekDays.includes(dayOfWeek)
    }
    return true
  }

  const getHabitEntry = (habitId: string, date: string) =>
    habitEntries.find(e => e.habitId === habitId && e.date === date)

  const isHabitDone = (habit: Habit, date: string): boolean => {
    const entry = getHabitEntry(habit.id, date)
    if (!entry || entry.skipped) return false
    return habit.type === 'boolean' ? entry.value >= 1 : entry.value >= habit.target
  }

  const scheduledHabits = habits.filter(h => isHabitScheduledForDate(h, today))
  const doneHabits = scheduledHabits.filter(h => {
    const entry = getHabitEntry(h.id, today)
    return (entry && !entry.skipped && (h.type === 'boolean' ? entry.value >= 1 : entry.value >= h.target)) ||
           (entry?.skipped === true)
  })

  // Financial stats
  const currentMonth = today.slice(0, 7)
  const unpaidBills = bills.filter(b => !b.isPaid).sort((a, b) => a.dueDay - b.dueDay)
  const monthExpenses = expenses.filter(e => e.date.startsWith(currentMonth))
  const totalMonthExpenses = monthExpenses.reduce((sum, e) => sum + e.amount, 0)

  const formatCurrency = (value: number): string => `R$ ${value.toFixed(2).replace('.', ',')}`

  // Weekly overview
  const weekDates = getCurrentWeekDates()
  const DAYS_ORDER_LABELS = [
    { key: 'mon' as const, label: 'Seg' },
    { key: 'tue' as const, label: 'Ter' },
    { key: 'wed' as const, label: 'Qua' },
    { key: 'thu' as const, label: 'Qui' },
    { key: 'fri' as const, label: 'Sex' },
    { key: 'sat' as const, label: 'Sab' },
    { key: 'sun' as const, label: 'Dom' },
  ]

  const [showAddQuickAccessDropdown, setShowAddQuickAccessDropdown] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; itemId: string } | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const addQuickAccessRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const contextMenuRef = useRef<HTMLDivElement>(null)

  // Atualizar horário em tempo real
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000) // Atualiza a cada segundo

    return () => clearInterval(interval)
  }, [])

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        addQuickAccessRef.current &&
        !addQuickAccessRef.current.contains(event.target as Node)
      ) {
        setShowAddQuickAccessDropdown(false)
      }
      if (
        contextMenuRef.current &&
        !contextMenuRef.current.contains(event.target as Node)
      ) {
        setContextMenu(null)
      }
    }

    if (showAddQuickAccessDropdown || contextMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showAddQuickAccessDropdown, contextMenu])

  const todayDate = currentTime
  const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
  const dayName = dayNames[todayDate.getDay()]

  const monthStartISO = `${today.slice(0, 7)}-01`
  const monthEndISO = (() => {
    const y = todayDate.getFullYear()
    const m = todayDate.getMonth()
    const last = new Date(y, m + 1, 0).getDate()
    return `${today.slice(0, 7)}-${String(last).padStart(2, '0')}`
  })()
  const monthEventsCount = expandCalendarEvents(calendarEvents, monthStartISO, monthEndISO).length

  // Formatar data completa
  const hour = todayDate.getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'
  const monthNames = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
  const formattedTime = `${String(todayDate.getHours()).padStart(2, '0')}:${String(todayDate.getMinutes()).padStart(2, '0')}`
  const fullDateText = `${greeting}, ${dayName}, ${todayDate.getDate()} de ${monthNames[todayDate.getMonth()]} • ${formattedTime}`

  return (
    <div className="today-layout">
      <header className="today-header">
        <div className="today-date">
          <h1 className="today-date-full-line">{fullDateText}</h1>
        </div>
      </header>

      {/* Inline search bar */}
      <div className="today-search-wrapper">
        {!showQuickSearch ? (
          <div className="today-search" onClick={onOpenQuickSearch}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <span>Buscar cards, eventos, atalhos... (Ctrl+K)</span>
          </div>
        ) : (
          <QuickSearchModal
            cards={cards}
            events={calendarEvents}
            shortcuts={shortcuts}
            files={files}
            notes={notes}
            onClose={onCloseQuickSearch}
            onGoToPlannerCard={onGoToPlannerCard}
            onGoToCalendarDate={onGoToCalendarDate}
            onOpenShortcut={onOpenShortcut}
            onOpenFile={onOpenFile}
            onGoToNotes={onGoToNotes}
            onNavigate={onNavigate}
          />
        )}
      </div>

      {/* Stats */}
      <div className="today-stats">
        <div className="today-stat">
          <span className="today-stat-value">{todayEvents.length}</span>
          <span className="today-stat-label">Eventos</span>
        </div>
        <div className="today-stat">
          <span className="today-stat-value">{allTodayCards.length}</span>
          <span className="today-stat-label">Cards</span>
        </div>
        {allTodayCards.length > 0 && (
          <div className="today-stat" style={{ borderColor: STATUS_COLORS.done }}>
            <span className="today-stat-value" style={{ color: STATUS_COLORS.done }}>{doneCards}</span>
            <span className="today-stat-label">Feitos</span>
          </div>
        )}
        {scheduledHabits.length > 0 && (
          <div className="today-stat" style={{ borderColor: 'var(--color-primary)' }}>
            <span className="today-stat-value" style={{ color: 'var(--color-primary)' }}>
              {doneHabits.length}/{scheduledHabits.length}
            </span>
            <span className="today-stat-label">Habitos</span>
          </div>
        )}
        {unpaidBills.length > 0 && (
          <div className="today-stat" style={{ borderColor: '#f97316' }}>
            <span className="today-stat-value" style={{ color: '#f97316' }}>{unpaidBills.length}</span>
            <span className="today-stat-label">Contas</span>
          </div>
        )}
        <div className="today-stat today-stat-total">
          <span className="today-stat-value">{totalItems}</span>
          <span className="today-stat-label">Total</span>
        </div>
      </div>

      {/* Progress bar */}
      {allTodayCards.length > 0 && (
        <div className="today-progress">
          <div className="today-progress-bar">
            {doneCards > 0 && (
              <div className="today-progress-fill" style={{ width: `${(doneCards / allTodayCards.length) * 100}%`, background: STATUS_COLORS.done }} />
            )}
            {inProgressCards > 0 && (
              <div className="today-progress-fill" style={{ width: `${(inProgressCards / allTodayCards.length) * 100}%`, background: STATUS_COLORS.in_progress }} />
            )}
            {blockedCards > 0 && (
              <div className="today-progress-fill" style={{ width: `${(blockedCards / allTodayCards.length) * 100}%`, background: STATUS_COLORS.blocked }} />
            )}
          </div>
          <div className="today-progress-labels">
            {doneCards > 0 && <span style={{ color: STATUS_COLORS.done }}>{doneCards} feito(s)</span>}
            {inProgressCards > 0 && <span style={{ color: STATUS_COLORS.in_progress }}>{inProgressCards} em andamento</span>}
            {blockedCards > 0 && <span style={{ color: STATUS_COLORS.blocked }}>{blockedCards} bloqueado(s)</span>}
          </div>
        </div>
      )}


      <div className="today-content">
        {/* Main Column */}
        <div className="today-main-col">
          {/* Eventos */}
          <section className="today-section">
            <div className="today-section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <h2>Eventos</h2>
              <span className="today-section-count">{todayEvents.length}</span>
            </div>

            {todayEvents.length === 0 ? (
              <div className="today-empty">Nenhum evento hoje.</div>
            ) : (
              <div className="today-items">
                {todayEvents.map(event => (
                  <div key={event.id} className="today-item">
                    <div className="today-item-color" style={{ background: event.color || 'var(--color-primary)' }} />
                    <div className="today-item-content">
                      <div className="today-item-title">
                        {event.time ? `${event.time} — ` : ''}{event.title}
                      </div>
                      {event.description && (
                        <div className="today-item-desc">{event.description}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Cards do dia */}
          <section className="today-section">
            <div className="today-section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9h18" />
                <path d="M9 21V9" />
              </svg>
              <h2>Cards</h2>
              <span className="today-section-count">{allTodayCards.length}</span>
            </div>

            {allTodayCards.length === 0 ? (
              <div className="today-empty">Nenhum card para hoje.</div>
            ) : (
              <div className="today-items">
                {todayCardsWithDate.map(card => (
                  <div key={card.id} className="today-item">
                    <div className="today-item-color" style={{ background: STATUS_COLORS[card.status] }} />
                    <div className="today-item-content">
                      <div className="today-item-title">
                        {card.time ? `${card.time} — ` : ''}{card.title}
                      </div>
                      {card.checklist.length > 0 && (
                        <div className="today-item-desc">
                          Checklist: {card.checklist.filter(c => c.done).length}/{card.checklist.length}
                        </div>
                      )}
                    </div>
                    <div className="today-item-badges">
                      {card.priority && (
                        <span className="today-item-badge" style={{ color: 'var(--color-text-secondary)' }}>{card.priority}</span>
                      )}
                      <span className="today-item-badge">{STATUS_LABELS[card.status]}</span>
                    </div>
                  </div>
                ))}
                {todayCardsNoDate.map(card => (
                  <div key={card.id} className="today-item">
                    <div className="today-item-color" style={{ background: STATUS_COLORS[card.status] }} />
                    <div className="today-item-content">
                      <div className="today-item-title">{card.title}</div>
                      {card.location.period && (
                        <div className="today-item-desc">
                          {PERIOD_LABELS[card.location.period]}
                          {card.checklist.length > 0 && ` | Checklist: ${card.checklist.filter(c => c.done).length}/${card.checklist.length}`}
                        </div>
                      )}
                    </div>
                    {card.priority && (
                      <span className="today-item-badge" style={{ color: 'var(--color-text-secondary)' }}>{card.priority}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Habitos de Hoje */}
          {scheduledHabits.length > 0 && (
            <section className="today-section">
              <div className="today-section-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <path d="M9 11l3 3L22 4" />
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </svg>
                <h2>Habitos</h2>
                <span className="today-section-count">{doneHabits.length}/{scheduledHabits.length}</span>
              </div>
              <div className="today-items">
                {scheduledHabits.map(habit => {
                  const done = isHabitDone(habit, today)
                  const entry = getHabitEntry(habit.id, today)
                  const skipped = entry?.skipped === true
                  return (
                    <div key={habit.id} className={`today-item ${done || skipped ? 'is-done' : ''}`}>
                      <div className="today-item-color" style={{ background: habit.color }} />
                      <div className="today-item-content">
                        <div className="today-item-title" style={done ? { textDecoration: 'line-through', opacity: 0.6 } : undefined}>
                          {habit.name}
                        </div>
                        {habit.type !== 'boolean' && entry && (
                          <div className="today-item-desc">
                            {entry.value}/{habit.target} {habit.type === 'time' ? 'min' : ''}
                          </div>
                        )}
                      </div>
                      {habit.type === 'boolean' && !skipped && (
                        <input
                          type="checkbox"
                          checked={done}
                          onChange={() => onToggleHabitBoolean(habit)}
                          style={{ width: 18, height: 18, accentColor: habit.color, cursor: 'pointer' }}
                        />
                      )}
                      {skipped && <span className="today-item-badge">Pulado</span>}
                    </div>
                  )
                })}
              </div>
              <button className="today-section-link" onClick={() => onNavigate('habits')}>
                Ver todos os habitos
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </section>
          )}

          {/* Visao Semanal Mini */}
          <section className="today-section">
            <div className="today-section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <h2>Semana</h2>
            </div>
            <div className="today-week-grid">
              {DAYS_ORDER_LABELS.map(({ key, label }) => {
                const date = weekDates[key]
                const isToday = date === today
                const dayEvents = expandCalendarEvents(calendarEvents, date, date).filter(e => e.date === date)
                const dayCards = cards.filter(c =>
                  (c.hasDate && c.date === date) ||
                  (!c.hasDate && c.location.day === key && !!c.location.period)
                )
                return (
                  <div key={key} className={`today-week-day ${isToday ? 'is-today' : ''}`}>
                    <span className="today-week-day-name">{label}</span>
                    <span className="today-week-day-count">{dayEvents.length + dayCards.length}</span>
                    {dayEvents.length > 0 && (
                      <div className="today-week-day-dots">
                        {dayEvents.slice(0, 3).map(e => (
                          <span key={e.id} className="today-week-dot" style={{ background: e.color }} />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        </div>

        {/* Side Column */}
        <div className="today-side-col">
          {/* Financial Summary */}
          <section className="today-section">
            <div className="today-section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
              <h2>Financeiro</h2>
            </div>
            <div className="today-summary">
              {unpaidBills.length > 0 && (
                <div className="today-summary-row">
                  <span>Contas pendentes</span>
                  <span style={{ color: '#f97316', fontWeight: 600 }}>{unpaidBills.length}</span>
                </div>
              )}
              {unpaidBills.length > 0 && (
                <div className="today-summary-row">
                  <span>Proxima conta</span>
                  <span>Dia {unpaidBills[0].dueDay} - {unpaidBills[0].name}</span>
                </div>
              )}
              <div className="today-summary-row">
                <span>Gastos do mes</span>
                <span style={{ fontWeight: 600 }}>{formatCurrency(totalMonthExpenses)}</span>
              </div>
              {unpaidBills.length === 0 && bills.length > 0 && (
                <div className="today-summary-row">
                  <span style={{ color: '#22c55e' }}>Todas as contas pagas!</span>
                </div>
              )}
            </div>

            {/* Goals mini */}
            {savingsGoals.length > 0 && (
              <div className="today-goals-mini">
                {savingsGoals.slice(0, 3).map(goal => {
                  const pct = goal.targetAmount > 0 ? Math.min(100, (goal.currentAmount / goal.targetAmount) * 100) : 0
                  return (
                    <div key={goal.id} className="today-goal-mini">
                      <div className="today-goal-mini-header">
                        <span className="today-goal-mini-name">{goal.name}</span>
                        <span className="today-goal-mini-pct">{pct.toFixed(0)}%</span>
                      </div>
                      <div className="today-goal-mini-bar">
                        <div style={{ width: `${pct}%`, background: pct >= 100 ? '#22c55e' : 'var(--color-primary)' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <button className="today-section-link" onClick={() => onNavigate('financial')}>
              Ver financeiro completo
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </section>

          {macros.length > 0 && (
            <section className="today-section">
              <div className="today-section-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                <h2>Macros</h2>
              </div>
              <div className="today-macros">
                {macros.map(macro => (
                  <button key={macro.id} className="today-macro-btn" onClick={() => onRunMacro(macro.id)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                    {macro.name}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Quick summary */}
          <section className="today-section">
            <div className="today-section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <h2>Resumo</h2>
            </div>
            <div className="today-summary">
              <div className="today-summary-row">
                <span>Total no backlog</span>
                <span>{cards.filter(c => !c.location.day).length}</span>
              </div>
              <div className="today-summary-row">
                <span>Cards esta semana</span>
                <span>{cards.filter(c => c.location.day).length}</span>
              </div>
              <div className="today-summary-row">
                <span>Eventos este mes</span>
                <span>{monthEventsCount}</span>
              </div>
            </div>
          </section>

          {/* Acesso Rápido */}
          <section className="today-section">
            <div className="today-section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
              <h2>Acesso Rápido</h2>
              <div className="today-section-add-wrapper">
                <button
                  ref={addQuickAccessRef}
                  className="today-section-add"
                  onClick={() => setShowAddQuickAccessDropdown(!showAddQuickAccessDropdown)}
                  title="Adicionar atalho"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M8 3v10M3 8h10" />
                  </svg>
                </button>
                {showAddQuickAccessDropdown && (
                  <div ref={dropdownRef} className="quick-access-dropdown">
                    {AVAILABLE_VIEWS
                      .filter(view => !quickAccess.some(qa => qa.view === view.view))
                      .map(view => (
                        <button
                          key={view.view}
                          className="quick-access-dropdown-item"
                          onClick={() => {
                            onAddQuickAccess(view.view, view.label)
                            setShowAddQuickAccessDropdown(false)
                          }}
                        >
                          <span className="quick-access-dropdown-icon">{view.icon}</span>
                          <span className="quick-access-dropdown-label">{view.label}</span>
                        </button>
                      ))}
                    {AVAILABLE_VIEWS.filter(view => !quickAccess.some(qa => qa.view === view.view)).length === 0 && (
                      <div className="quick-access-dropdown-empty">Todas as páginas já estão no acesso rápido.</div>
                    )}
                  </div>
                )}
              </div>
            </div>
            {quickAccess.length === 0 ? (
              <div className="today-empty">Nenhum atalho adicionado. Clique no + para adicionar.</div>
            ) : (
              <div className={`quick-access-grid ${quickAccess.length >= 3 ? 'quick-access-grid-compact' : ''}`}>
                {quickAccess
                  .sort((a, b) => a.order - b.order)
                  .map(item => {
                    const viewOption = AVAILABLE_VIEWS.find(v => v.view === item.view)
                    if (!viewOption) return null
                    return (
                      <div key={item.id} className="quick-access-item-wrapper">
                        <button
                          className={`quick-access-item ${quickAccess.length >= 3 ? 'quick-access-item-horizontal' : ''}`}
                          onClick={() => onNavigate(item.view as AppView)}
                          onContextMenu={(e) => {
                            e.preventDefault()
                            setContextMenu({
                              x: e.clientX,
                              y: e.clientY,
                              itemId: item.id,
                            })
                          }}
                          title={`Ir para ${item.label} (botão direito para opções)`}
                        >
                          <span className="quick-access-icon">{viewOption.icon}</span>
                          <span className="quick-access-label">{item.label}</span>
                        </button>
                      </div>
                    )
                  })}
              </div>
            )}
          </section>
        </div>
      </div>

      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="quick-access-context-menu"
          style={{
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
          }}
        >
          <button
            className="quick-access-context-item"
            onClick={() => {
              onRemoveQuickAccess(contextMenu.itemId)
              setContextMenu(null)
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 4l-8 8M4 4l8 8" />
            </svg>
            Remover do acesso rápido
          </button>
        </div>
      )}
    </div>
  )
}
