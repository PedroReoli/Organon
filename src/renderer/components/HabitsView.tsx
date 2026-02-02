import { useEffect, useRef, useState } from 'react'
import type { Habit, HabitEntry, HabitType, HabitFrequency } from '../types'
import { getTodayISO } from '../utils'

interface HabitsViewProps {
  habits: Habit[]
  entries: HabitEntry[]
  onAddHabit: (input: Omit<Habit, 'id' | 'createdAt' | 'order'>) => string
  onUpdateHabit: (habitId: string, updates: Partial<Omit<Habit, 'id' | 'createdAt'>>) => void
  onRemoveHabit: (habitId: string) => void
  onAddEntry: (input: Omit<HabitEntry, 'id'>) => void
  onUpdateEntry: (entryId: string, updates: Partial<Omit<HabitEntry, 'id'>>) => void
  onRemoveEntry: (entryId: string) => void
}

const HABIT_TYPE_LABELS: Record<HabitType, string> = {
  boolean: 'Sim/Nao',
  count: 'Contagem',
  time: 'Tempo (min)',
  quantity: 'Quantidade',
}

const HABIT_FREQUENCY_LABELS: Record<HabitFrequency, string> = {
  daily: 'Diario',
  weekly: 'Semanal',
}

const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']
const WEEKDAY_SHORT = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

const DEFAULT_COLORS = [
  '#6366f1', '#22c55e', '#f97316', '#ef4444', '#eab308',
  '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e',
]

const addDays = (isoDate: string, days: number): string => {
  const d = new Date(isoDate + 'T00:00:00')
  d.setDate(d.getDate() + days)
  const yyyy = d.getFullYear()
  const mm = (d.getMonth() + 1).toString().padStart(2, '0')
  const dd = d.getDate().toString().padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const getWeekday = (isoDate: string): number => {
  return new Date(isoDate + 'T00:00:00').getDay()
}

const getLast7Days = (today: string): string[] => {
  const days: string[] = []
  for (let i = 6; i >= 0; i--) {
    days.push(addDays(today, -i))
  }
  return days
}

const getLast30Days = (today: string): string[] => {
  const days: string[] = []
  for (let i = 29; i >= 0; i--) {
    days.push(addDays(today, -i))
  }
  return days
}

const getWeekStart = (isoDate: string): string => {
  const dayOfWeek = getWeekday(isoDate)
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  return addDays(isoDate, diff)
}

export const HabitsView = ({
  habits,
  entries,
  onAddHabit,
  onUpdateHabit,
  onRemoveHabit,
  onAddEntry,
  onUpdateEntry,
  onRemoveEntry,
}: HabitsViewProps) => {
  const today = getTodayISO()
  const last7Days = getLast7Days(today)
  const last30Days = getLast30Days(today)
  const weekStart = getWeekStart(today)

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState<HabitType>('boolean')
  const [newTarget, setNewTarget] = useState(1)
  const [newFrequency, setNewFrequency] = useState<HabitFrequency>('daily')
  const [newWeeklyTarget, setNewWeeklyTarget] = useState(5)
  const [newWeekDays, setNewWeekDays] = useState<number[]>([1, 2, 3, 4, 5])
  const [newTrigger, setNewTrigger] = useState('')
  const [newReason, setNewReason] = useState('')
  const [newMinimumTarget, setNewMinimumTarget] = useState(0)
  const [newColor, setNewColor] = useState(DEFAULT_COLORS[0])

  // Skip modal state
  const [skipHabitId, setSkipHabitId] = useState<string | null>(null)
  const [skipReason, setSkipReason] = useState('')

  // Confirm delete
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  // Expanded detail panel
  const [expandedHabitId, setExpandedHabitId] = useState<string | null>(null)

  // Timer state for time-type habits
  const [timerHabitId, setTimerHabitId] = useState<string | null>(null)
  const [timerSeconds, setTimerSeconds] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Helpers
  const getEntryForDate = (habitId: string, date: string): HabitEntry | undefined => {
    return entries.find(e => e.habitId === habitId && e.date === date)
  }

  const getTodayEntry = (habitId: string): HabitEntry | undefined => {
    return getEntryForDate(habitId, today)
  }

  const isHabitDoneForDate = (habit: Habit, date: string): boolean => {
    const entry = getEntryForDate(habit.id, date)
    if (!entry) return false
    if (entry.skipped) return false
    if (habit.type === 'boolean') return entry.value >= 1
    return entry.value >= habit.target
  }

  const isHabitSkippedForDate = (habitId: string, date: string): boolean => {
    const entry = getEntryForDate(habitId, date)
    return entry?.skipped === true
  }

  const isHabitScheduledForDate = (habit: Habit, date: string): boolean => {
    if (habit.frequency === 'daily') return true
    if (habit.weekDays.length > 0) {
      const dayOfWeek = getWeekday(date)
      return habit.weekDays.includes(dayOfWeek)
    }
    return true
  }

  // Stats
  const getStreakCount = (habit: Habit): number => {
    let streak = 0
    let checkDate = today

    if (!isHabitDoneForDate(habit, today) && !isHabitSkippedForDate(habit.id, today)) {
      checkDate = addDays(today, -1)
    }

    for (let i = 0; i < 365; i++) {
      if (!isHabitScheduledForDate(habit, checkDate)) {
        checkDate = addDays(checkDate, -1)
        continue
      }
      if (isHabitDoneForDate(habit, checkDate) || isHabitSkippedForDate(habit.id, checkDate)) {
        streak++
        checkDate = addDays(checkDate, -1)
      } else {
        break
      }
    }
    return streak
  }

  const getBestStreak = (): number => {
    let best = 0
    for (const habit of habits) {
      best = Math.max(best, getStreakCount(habit))
    }
    return best
  }

  const getWeekCompletionRate = (): number => {
    if (habits.length === 0) return 0
    let totalScheduled = 0
    let totalDone = 0

    for (const habit of habits) {
      for (let i = 0; i < 7; i++) {
        const date = addDays(weekStart, i)
        if (date > today) continue
        if (!isHabitScheduledForDate(habit, date)) continue
        totalScheduled++
        if (isHabitDoneForDate(habit, date) || isHabitSkippedForDate(habit.id, date)) {
          totalDone++
        }
      }
    }

    if (totalScheduled === 0) return 0
    return Math.round((totalDone / totalScheduled) * 100)
  }

  const get30DayRate = (): number => {
    if (habits.length === 0) return 0
    let totalScheduled = 0
    let totalDone = 0

    for (const habit of habits) {
      for (const date of last30Days) {
        if (!isHabitScheduledForDate(habit, date)) continue
        totalScheduled++
        if (isHabitDoneForDate(habit, date) || isHabitSkippedForDate(habit.id, date)) {
          totalDone++
        }
      }
    }

    if (totalScheduled === 0) return 0
    return Math.round((totalDone / totalScheduled) * 100)
  }

  const getCompletionRateForDate = (date: string): number => {
    let scheduled = 0
    let done = 0
    for (const habit of habits) {
      if (!isHabitScheduledForDate(habit, date)) continue
      scheduled++
      if (isHabitDoneForDate(habit, date) || isHabitSkippedForDate(habit.id, date)) {
        done++
      }
    }
    return scheduled === 0 ? 0 : done / scheduled
  }

  const getHabitCompletionRate = (habit: Habit, days: number): number => {
    let scheduled = 0
    let done = 0
    for (let i = 0; i < days; i++) {
      const date = addDays(today, -i)
      if (!isHabitScheduledForDate(habit, date)) continue
      scheduled++
      if (isHabitDoneForDate(habit, date) || isHabitSkippedForDate(habit.id, date)) {
        done++
      }
    }
    return scheduled === 0 ? 0 : Math.round((done / scheduled) * 100)
  }

  const getTodayCompletionCount = (): { done: number; total: number } => {
    let done = 0
    let total = 0
    for (const habit of habits) {
      if (!isHabitScheduledForDate(habit, today)) continue
      total++
      if (isHabitDoneForDate(habit, today) || isHabitSkippedForDate(habit.id, today)) {
        done++
      }
    }
    return { done, total }
  }

  // Handlers
  const handleToggleBoolean = (habit: Habit) => {
    const entry = getTodayEntry(habit.id)
    if (entry) {
      if (entry.value >= 1 && !entry.skipped) {
        onUpdateEntry(entry.id, { value: 0 })
      } else {
        onUpdateEntry(entry.id, { value: 1, skipped: false, skipReason: '' })
      }
    } else {
      onAddEntry({ habitId: habit.id, date: today, value: 1, skipped: false, skipReason: '' })
    }
  }

  const handleIncrementCount = (habit: Habit, delta: number) => {
    const entry = getTodayEntry(habit.id)
    if (entry) {
      const newValue = Math.max(0, entry.value + delta)
      onUpdateEntry(entry.id, { value: newValue, skipped: false, skipReason: '' })
    } else if (delta > 0) {
      onAddEntry({ habitId: habit.id, date: today, value: delta, skipped: false, skipReason: '' })
    }
  }

  const handleSetValue = (habit: Habit, value: number) => {
    const entry = getTodayEntry(habit.id)
    if (entry) {
      onUpdateEntry(entry.id, { value: Math.max(0, value), skipped: false, skipReason: '' })
    } else {
      onAddEntry({ habitId: habit.id, date: today, value: Math.max(0, value), skipped: false, skipReason: '' })
    }
  }

  const handleSkip = (habitId: string) => {
    const entry = getTodayEntry(habitId)
    if (entry) {
      onUpdateEntry(entry.id, { skipped: true, skipReason: skipReason.trim() })
    } else {
      onAddEntry({ habitId, date: today, value: 0, skipped: true, skipReason: skipReason.trim() })
    }
    setSkipHabitId(null)
    setSkipReason('')
  }

  const handleStartTimer = (habitId: string) => {
    if (timerRef.current) clearInterval(timerRef.current)
    setTimerHabitId(habitId)
    setTimerSeconds(0)
    timerRef.current = setInterval(() => {
      setTimerSeconds(s => s + 1)
    }, 1000)
  }

  const handleStopTimer = (habit: Habit) => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    const minutes = Math.max(1, Math.round(timerSeconds / 60))
    handleIncrementCount(habit, minutes)
    setTimerHabitId(null)
    setTimerSeconds(0)
  }

  const formatTimer = (seconds: number): string => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const handleAddHabit = () => {
    if (!newName.trim()) return
    const habitData = {
      name: newName.trim(),
      type: newType,
      target: newType === 'boolean' ? 1 : Math.max(1, newTarget),
      frequency: newFrequency,
      weeklyTarget: newFrequency === 'weekly' ? Math.max(1, newWeeklyTarget) : 7,
      weekDays: newFrequency === 'weekly' ? newWeekDays : [],
      trigger: newTrigger.trim(),
      reason: newReason.trim(),
      minimumTarget: newMinimumTarget,
      color: newColor,
    }

    if (editingHabitId) {
      onUpdateHabit(editingHabitId, habitData)
    } else {
      onAddHabit(habitData)
    }
    resetForm()
    setShowAddModal(false)
  }

  const resetForm = () => {
    setNewName('')
    setNewType('boolean')
    setNewTarget(1)
    setNewFrequency('daily')
    setNewWeeklyTarget(5)
    setNewWeekDays([1, 2, 3, 4, 5])
    setNewTrigger('')
    setNewReason('')
    setNewMinimumTarget(0)
    setNewColor(DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)])
    setEditingHabitId(null)
  }

  const openEditHabit = (habit: Habit) => {
    setEditingHabitId(habit.id)
    setNewName(habit.name)
    setNewType(habit.type)
    setNewTarget(habit.target)
    setNewFrequency(habit.frequency)
    setNewWeeklyTarget(habit.weeklyTarget)
    setNewWeekDays([...habit.weekDays])
    setNewTrigger(habit.trigger)
    setNewReason(habit.reason)
    setNewMinimumTarget(habit.minimumTarget)
    setNewColor(habit.color)
    setShowAddModal(true)
  }

  const handleDeleteHabit = (habitId: string) => {
    const habitEntries = entries.filter(e => e.habitId === habitId)
    for (const entry of habitEntries) {
      onRemoveEntry(entry.id)
    }
    onRemoveHabit(habitId)
    setConfirmDeleteId(null)
  }

  const toggleWeekDay = (day: number) => {
    setNewWeekDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    )
  }

  // Sort habits by order
  const sortedHabits = [...habits].sort((a, b) => a.order - b.order)
  const todayStats = getTodayCompletionCount()
  const weekRate = getWeekCompletionRate()
  const monthRate = get30DayRate()
  const bestStreak = getBestStreak()

  const getStreakDotColor = (
    habit: Habit,
    date: string
  ): { bg: string; opacity: number; border?: string } => {
    const isDone = isHabitDoneForDate(habit, date)
    const isSkipped = isHabitSkippedForDate(habit.id, date)
    const isScheduled = isHabitScheduledForDate(habit, date)
    const isFuture = date > today

    if (isFuture) return { bg: 'transparent', opacity: 0.2, border: '1px solid var(--color-border)' }
    if (!isScheduled) return { bg: 'var(--color-border)', opacity: 0.3 }
    if (isDone) return { bg: habit.color, opacity: 1 }
    if (isSkipped) return { bg: 'var(--color-text-muted)', opacity: 0.5 }
    if (date < today) return { bg: 'var(--color-border)', opacity: 0.4 }
    return { bg: 'transparent', opacity: 0.5, border: `2px solid ${habit.color}` }
  }

  const formatValue = (habit: Habit, value: number): string => {
    if (habit.type === 'time') {
      if (value >= 60) {
        const h = Math.floor(value / 60)
        const m = value % 60
        return m > 0 ? `${h}h${m}min` : `${h}h`
      }
      return `${value}min`
    }
    return `${value}`
  }

  const getTargetLabel = (habit: Habit): string => {
    if (habit.type === 'boolean') return ''
    if (habit.type === 'time') return `Meta: ${formatValue(habit, habit.target)}`
    return `Meta: ${habit.target}`
  }

  const rateColor = (rate: number) => rate >= 80 ? '#22c55e' : rate >= 50 ? '#eab308' : '#ef4444'

  return (
    <div className="habits-layout">
      {/* Header */}
      <header className="habits-header">
        <div>
          <h2>Habitos e Rotinas</h2>
          <p className="habits-header-sub">
            {todayStats.done}/{todayStats.total} concluidos hoje — {weekRate}% na semana
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowAddModal(true) }}>
          + Novo Habito
        </button>
      </header>

      {/* Stats bar */}
      {habits.length > 0 && (
        <div className="habits-stats">
          <div className="habits-stat">
            <span className="habits-stat-value" style={{ color: 'var(--color-primary)' }}>
              {todayStats.done}/{todayStats.total}
            </span>
            <span className="habits-stat-label">Hoje</span>
          </div>
          <div className="habits-stat">
            <span className="habits-stat-value" style={{ color: rateColor(weekRate) }}>
              {weekRate}%
            </span>
            <span className="habits-stat-label">Semana</span>
          </div>
          <div className="habits-stat">
            <span className="habits-stat-value" style={{ color: rateColor(monthRate) }}>
              {monthRate}%
            </span>
            <span className="habits-stat-label">30 Dias</span>
          </div>
          <div className="habits-stat">
            <span className="habits-stat-value">{bestStreak}</span>
            <span className="habits-stat-label">Melhor Sequencia</span>
          </div>
          <div className="habits-stat">
            <span className="habits-stat-value">{habits.length}</span>
            <span className="habits-stat-label">Habitos</span>
          </div>
        </div>
      )}

      {/* 30-day heatmap */}
      {habits.length > 0 && (
        <div className="habits-heatmap-section">
          <span className="habits-heatmap-label">Ultimos 30 dias</span>
          <div className="habits-heatmap">
            {last30Days.map(date => {
              const rate = getCompletionRateForDate(date)
              const dayLabel = WEEKDAY_LABELS[getWeekday(date)]
              return (
                <div
                  key={date}
                  className="habits-heatmap-cell"
                  style={{
                    background: rate === 0 ? 'var(--color-border)' : 'var(--color-primary)',
                    opacity: rate === 0 ? 0.15 : 0.3 + rate * 0.7,
                  }}
                  title={`${dayLabel} ${date.split('-').reverse().join('/')}: ${Math.round(rate * 100)}%`}
                />
              )
            })}
          </div>
        </div>
      )}

      {/* Habits list */}
      <div className="habits-list-scroll">
        {sortedHabits.length === 0 && (
          <div className="habits-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48" style={{ opacity: 0.2 }}>
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
            <p>Nenhum habito cadastrado. Crie seu primeiro habito!</p>
          </div>
        )}

        {sortedHabits.map(habit => {
          const todayEntry = getTodayEntry(habit.id)
          const currentValue = todayEntry?.value ?? 0
          const isDone = isHabitDoneForDate(habit, today)
          const isSkipped = todayEntry?.skipped === true
          const streak = getStreakCount(habit)
          const isScheduledToday = isHabitScheduledForDate(habit, today)
          const isExpanded = expandedHabitId === habit.id

          return (
            <div key={habit.id} className={`habits-card ${isSkipped ? 'is-skipped' : ''}`} style={{ borderLeftColor: habit.color }}>
              <div className="habits-card-main">
                {/* Left: info & controls */}
                <div className="habits-card-body" onClick={() => setExpandedHabitId(isExpanded ? null : habit.id)}>
                  <div className="habits-card-title-row">
                    <span className="habits-card-name">{habit.name}</span>
                    <span className="habits-badge">{HABIT_TYPE_LABELS[habit.type]}</span>
                    <span className="habits-badge">{HABIT_FREQUENCY_LABELS[habit.frequency]}</span>
                    {streak > 0 && (
                      <span className="habits-badge habits-badge-streak">{streak} dias</span>
                    )}
                  </div>

                  {getTargetLabel(habit) && (
                    <p className="habits-card-meta">{getTargetLabel(habit)}</p>
                  )}

                  {isScheduledToday && isSkipped && (
                    <div className="habits-skipped-info" onClick={e => e.stopPropagation()}>
                      Pulado hoje{todayEntry?.skipReason ? `: ${todayEntry.skipReason}` : ''}
                      <button
                        className="btn btn-secondary habits-undo-btn"
                        onClick={() => {
                          if (todayEntry) onUpdateEntry(todayEntry.id, { skipped: false, skipReason: '' })
                        }}
                      >Desfazer</button>
                    </div>
                  )}

                  {!isScheduledToday && (
                    <p className="habits-card-meta">Nao agendado para hoje</p>
                  )}

                  {/* 7-day streak with day labels */}
                  <div className="habits-week-strip">
                    {last7Days.map(date => {
                      const dot = getStreakDotColor(habit, date)
                      const dayIdx = getWeekday(date)
                      return (
                        <div key={date} className="habits-week-day" title={`${WEEKDAY_LABELS[dayIdx]} - ${date}`}>
                          <span className="habits-week-day-label">{WEEKDAY_SHORT[dayIdx]}</span>
                          <div
                            className="habits-week-dot"
                            style={{
                              background: dot.bg,
                              opacity: dot.opacity,
                              border: dot.border || 'none',
                            }}
                          />
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Check button */}
                {isScheduledToday && !isSkipped && (
                  <div className="habits-check-area" onClick={e => e.stopPropagation()}>
                    {habit.type === 'boolean' && (
                      <button
                        className={`habits-check-btn ${isDone ? 'is-done' : ''}`}
                        onClick={() => handleToggleBoolean(habit)}
                        style={{ '--habit-color': habit.color } as React.CSSProperties}
                        title={isDone ? 'Desmarcar' : 'Marcar como feito'}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isDone ? 3 : 2} width="22" height="22">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      </button>
                    )}

                    {(habit.type === 'count' || habit.type === 'quantity') && (
                      <>
                        <button
                          className={`habits-check-btn ${isDone ? 'is-done' : ''}`}
                          onClick={() => handleIncrementCount(habit, 1)}
                          style={{ '--habit-color': habit.color } as React.CSSProperties}
                          title={`Adicionar +1 (${currentValue}/${habit.target})`}
                        >
                          {isDone ? (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="22" height="22">
                              <path d="M20 6L9 17l-5-5" />
                            </svg>
                          ) : (
                            <span className="habits-check-plus">+1</span>
                          )}
                        </button>
                        <span className={`habits-check-progress ${isDone ? 'done' : ''}`}>
                          {currentValue}/{habit.target}
                        </span>
                        {currentValue > 0 && !isDone && (
                          <button
                            className="habits-check-undo"
                            onClick={() => handleIncrementCount(habit, -1)}
                            title="Remover 1"
                          >-1</button>
                        )}
                      </>
                    )}

                    {habit.type === 'time' && (
                      <>
                        {timerHabitId === habit.id ? (
                          <>
                            <button
                              className="habits-check-btn is-timing"
                              onClick={() => handleStopTimer(habit)}
                              title="Parar cronometro"
                            >
                              <span className="habits-timer-display">{formatTimer(timerSeconds)}</span>
                            </button>
                            <span className="habits-check-progress">Parar</span>
                          </>
                        ) : (
                          <>
                            <button
                              className={`habits-check-btn ${isDone ? 'is-done' : ''}`}
                              onClick={() => handleIncrementCount(habit, 5)}
                              style={{ '--habit-color': habit.color } as React.CSSProperties}
                              title={`Adicionar +5min (${formatValue(habit, currentValue)})`}
                            >
                              {isDone ? (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="22" height="22">
                                  <path d="M20 6L9 17l-5-5" />
                                </svg>
                              ) : (
                                <span className="habits-check-plus">+5</span>
                              )}
                            </button>
                            <span className={`habits-check-progress ${isDone ? 'done' : ''}`}>
                              {formatValue(habit, currentValue)}
                            </span>
                            <button
                              className="habits-timer-start-btn"
                              onClick={() => handleStartTimer(habit.id)}
                              title="Iniciar cronometro"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                              </svg>
                            </button>
                          </>
                        )}
                      </>
                    )}

                    <button
                      className="habits-skip-link"
                      onClick={() => { setSkipHabitId(habit.id); setSkipReason('') }}
                      title="Pular hoje"
                    >Pular</button>
                  </div>
                )}

                {/* Right: actions */}
                <div className="habits-card-actions">
                  <button className="btn-icon" onClick={() => openEditHabit(habit)} title="Editar">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  {confirmDeleteId === habit.id ? (
                    <div className="habits-confirm-delete">
                      <button className="btn btn-sm btn-danger" onClick={() => handleDeleteHabit(habit.id)}>Sim</button>
                      <button className="btn btn-sm btn-secondary" onClick={() => setConfirmDeleteId(null)}>Nao</button>
                    </div>
                  ) : (
                    <button className="btn-icon btn-icon-danger" onClick={() => setConfirmDeleteId(habit.id)} title="Excluir">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Expanded detail panel */}
              {isExpanded && (
                <div className="habits-detail-panel">
                  <div className="habits-detail-stats">
                    <div className="habits-detail-stat">
                      <span className="habits-detail-stat-value">{getHabitCompletionRate(habit, 7)}%</span>
                      <span className="habits-detail-stat-label">7 dias</span>
                    </div>
                    <div className="habits-detail-stat">
                      <span className="habits-detail-stat-value">{getHabitCompletionRate(habit, 30)}%</span>
                      <span className="habits-detail-stat-label">30 dias</span>
                    </div>
                    <div className="habits-detail-stat">
                      <span className="habits-detail-stat-value">{streak}</span>
                      <span className="habits-detail-stat-label">Sequencia atual</span>
                    </div>
                  </div>

                  {/* Individual 30-day heatmap */}
                  <div className="habits-detail-heatmap">
                    {last30Days.map(date => {
                      const isDoneDate = isHabitDoneForDate(habit, date)
                      const isSkippedDate = isHabitSkippedForDate(habit.id, date)
                      const isScheduled = isHabitScheduledForDate(habit, date)
                      let opacity = 0.1
                      let bg = 'var(--color-border)'
                      if (isScheduled && isDoneDate) { bg = habit.color; opacity = 1 }
                      else if (isScheduled && isSkippedDate) { bg = 'var(--color-text-muted)'; opacity = 0.5 }
                      else if (isScheduled && date < today) { bg = 'var(--color-border)'; opacity = 0.3 }
                      else if (!isScheduled) { opacity = 0.08 }

                      return (
                        <div
                          key={date}
                          className="habits-heatmap-cell"
                          style={{ background: bg, opacity }}
                          title={`${date.split('-').reverse().join('/')}`}
                        />
                      )
                    })}
                  </div>

                  {habit.trigger && (
                    <div className="habits-detail-info">
                      <strong>Gatilho:</strong> {habit.trigger}
                    </div>
                  )}
                  {habit.reason && (
                    <div className="habits-detail-info">
                      <strong>Motivo:</strong> {habit.reason}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Skip modal */}
      {skipHabitId && (
        <div className="modal-backdrop" onClick={() => setSkipHabitId(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <header className="modal-header">
              <h2>Pular Habito</h2>
              <button className="modal-close-btn" onClick={() => setSkipHabitId(null)}>&times;</button>
            </header>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Motivo (opcional)</label>
                <input
                  type="text"
                  value={skipReason}
                  onChange={e => setSkipReason(e.target.value)}
                  className="form-input"
                  placeholder="Ex: doente, viagem..."
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && handleSkip(skipHabitId)}
                />
              </div>
            </div>
            <footer className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSkipHabitId(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={() => handleSkip(skipHabitId)}>Pular</button>
            </footer>
          </div>
        </div>
      )}

      {/* Add/Edit habit modal */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => { setShowAddModal(false); resetForm() }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <header className="modal-header">
              <h2>{editingHabitId ? 'Editar Habito' : 'Novo Habito'}</h2>
              <button className="modal-close-btn" onClick={() => { setShowAddModal(false); resetForm() }}>&times;</button>
            </header>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Nome</label>
                <input type="text" value={newName} onChange={e => setNewName(e.target.value)} className="form-input" placeholder="Ex: Beber agua, Meditar, Exercicio..." autoFocus />
              </div>

              <div className="form-group">
                <label className="form-label">Tipo</label>
                <select
                  className="form-input"
                  value={newType}
                  onChange={e => {
                    const type = e.target.value as HabitType
                    setNewType(type)
                    if (type === 'boolean') setNewTarget(1)
                    else if (type === 'time') setNewTarget(30)
                    else setNewTarget(1)
                  }}
                >
                  {(Object.keys(HABIT_TYPE_LABELS) as HabitType[]).map(type => (
                    <option key={type} value={type}>{HABIT_TYPE_LABELS[type]}</option>
                  ))}
                </select>
                <p className="form-hint">
                  {newType === 'boolean' && 'Sim ou nao — marcar como feito.'}
                  {newType === 'count' && 'Contagem — ex: 8 copos de agua.'}
                  {newType === 'time' && 'Tempo em minutos — ex: 30 minutos de leitura.'}
                  {newType === 'quantity' && 'Quantidade — ex: 50 flexoes.'}
                </p>
              </div>

              {newType !== 'boolean' && (
                <div className="form-group">
                  <label className="form-label">Meta {newType === 'time' ? '(minutos)' : ''}</label>
                  <input type="number" min={1} value={newTarget} onChange={e => setNewTarget(Math.max(1, Number(e.target.value)))} className="form-input" style={{ width: 120 }} />
                </div>
              )}

              {newType !== 'boolean' && (
                <div className="form-group">
                  <label className="form-label">Meta minima (opcional)</label>
                  <input type="number" min={0} value={newMinimumTarget} onChange={e => setNewMinimumTarget(Math.max(0, Number(e.target.value)))} className="form-input" style={{ width: 120 }} />
                  <p className="form-hint">Valor minimo aceitavel para dias dificeis.</p>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Frequencia</label>
                <select className="form-input" value={newFrequency} onChange={e => setNewFrequency(e.target.value as HabitFrequency)}>
                  {(Object.keys(HABIT_FREQUENCY_LABELS) as HabitFrequency[]).map(freq => (
                    <option key={freq} value={freq}>{HABIT_FREQUENCY_LABELS[freq]}</option>
                  ))}
                </select>
              </div>

              {newFrequency === 'weekly' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Vezes por semana</label>
                    <input type="number" min={1} max={7} value={newWeeklyTarget} onChange={e => setNewWeeklyTarget(Math.min(7, Math.max(1, Number(e.target.value))))} className="form-input" style={{ width: 80 }} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Dias da semana</label>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {WEEKDAY_LABELS.map((label, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className={`btn ${newWeekDays.includes(idx) ? 'btn-primary' : 'btn-secondary'}`}
                          style={{ padding: '4px 10px', fontSize: 12, minWidth: 40 }}
                          onClick={() => toggleWeekDay(idx)}
                        >{label}</button>
                      ))}
                    </div>
                    <p className="form-hint">Selecione os dias em que o habito deve ser feito.</p>
                  </div>
                </>
              )}

              <div className="form-group">
                <label className="form-label">Gatilho (opcional)</label>
                <input type="text" value={newTrigger} onChange={e => setNewTrigger(e.target.value)} className="form-input" placeholder="Ex: depois de escovar os dentes..." />
                <p className="form-hint">Um lembrete do momento ideal para este habito.</p>
              </div>

              <div className="form-group">
                <label className="form-label">Motivo (opcional)</label>
                <input type="text" value={newReason} onChange={e => setNewReason(e.target.value)} className="form-input" placeholder="Ex: melhorar a saude..." />
              </div>

              <div className="form-group">
                <label className="form-label">Cor</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  {DEFAULT_COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewColor(color)}
                      style={{
                        width: 28, height: 28, borderRadius: '50%', background: color,
                        border: newColor === color ? '3px solid var(--color-text)' : '2px solid transparent',
                        cursor: 'pointer', padding: 0, flexShrink: 0,
                      }}
                      title={color}
                    />
                  ))}
                  <input
                    type="color"
                    value={newColor}
                    onChange={e => setNewColor(e.target.value)}
                    style={{ width: 28, height: 28, padding: 0, border: 'none', cursor: 'pointer' }}
                    title="Cor personalizada"
                  />
                </div>
              </div>
            </div>
            <footer className="modal-footer">
              <button className="btn btn-secondary" onClick={() => { setShowAddModal(false); resetForm() }}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleAddHabit} disabled={!newName.trim()}>
                {editingHabitId ? 'Salvar' : 'Adicionar'}
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  )
}
