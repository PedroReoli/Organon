/**
 * HabitsTodayWidget — lista de habitos previstos para hoje.
 *
 * Mostra cada habito como uma linha com checkbox (para habitos boolean)
 * ou progress (para count/quantity/time). Clique marca como feito via
 * callback `onMarkHabit`. Tambem exibe progress bar do dia.
 *
 * Definido no upgrade 05 (foundations).
 */

import React, { useMemo } from 'react'
import type {
  DashboardWidgetColSpan,
  Habit,
  HabitEntry,
} from '@types'
import { getTodayISO } from '@utils'
import { WidgetShell } from './WidgetShell'

interface HabitsTodayWidgetProps {
  colSpan: DashboardWidgetColSpan
  habits: Habit[]
  habitEntries: HabitEntry[]
  editMode?: boolean
  onRemove?: () => void
  onSpanChange?: (span: DashboardWidgetColSpan) => void
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>
  isDragging?: boolean
  /** Marca habito como feito ou incrementa valor. */
  onMarkHabit: (habit: Habit) => void
}

function isHabitScheduledToday(habit: Habit, dayOfWeek: number): boolean {
  if (habit.frequency === 'daily') return true
  if (habit.frequency === 'weekly') {
    if (habit.weekDays.length === 0) return true
    return habit.weekDays.includes(dayOfWeek)
  }
  return false
}

export const HabitsTodayWidget: React.FC<HabitsTodayWidgetProps> = ({
  colSpan,
  habits,
  habitEntries,
  editMode,
  onRemove,
  onSpanChange,
  dragHandleProps,
  isDragging,
  onMarkHabit,
}) => {
  const { todayList, todayISO, doneCount } = useMemo(() => {
    const iso = getTodayISO()
    const dow = new Date(iso + 'T00:00:00').getDay()
    const entriesToday = habitEntries.filter((e) => e.date === iso)

    const list = habits
      .filter((h) => isHabitScheduledToday(h, dow))
      .map((h) => {
        const entry = entriesToday.find((e) => e.habitId === h.id) ?? null
        const currentValue = entry?.value ?? 0
        const isDone = !entry ? false : entry.value >= h.target && !entry.skipped
        return { habit: h, entry, currentValue, isDone }
      })
      .sort((a, b) => a.habit.order - b.habit.order)

    return {
      todayList: list,
      todayISO: iso,
      doneCount: list.filter((x) => x.isDone).length,
    }
  }, [habits, habitEntries])

  const progressPct =
    todayList.length === 0 ? 0 : Math.round((doneCount / todayList.length) * 100)

  return (
    <WidgetShell
      colSpan={colSpan}
      title="Habitos de hoje"
      count={`${doneCount}/${todayList.length}`}
      editMode={editMode}
      onRemove={onRemove}
      onSpanChange={onSpanChange}
      dragHandleProps={dragHandleProps}
      isDragging={isDragging}
      footer={
        todayList.length > 0 ? (
          <div className="dw-habits-progress">
            <div className="dw-habits-progress-bar">
              <div
                className="dw-habits-progress-fill"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="dw-habits-progress-label">{progressPct}%</span>
          </div>
        ) : null
      }
    >
      {todayList.length === 0 ? (
        <div className="dw-empty">Nenhum habito para hoje</div>
      ) : (
        <ul className="dw-habits-list" data-date={todayISO}>
          {todayList.map(({ habit, currentValue, isDone }) => (
            <li
              key={habit.id}
              className={`dw-habit ${isDone ? 'is-done' : ''}`}
            >
              <button
                type="button"
                className="dw-habit-check"
                onClick={() => onMarkHabit(habit)}
                disabled={isDone}
                style={{ borderColor: habit.color }}
                title={isDone ? 'Ja marcado' : 'Marcar como feito'}
              >
                {isDone && (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={habit.color}
                    strokeWidth="3"
                    width="12"
                    height="12"
                  >
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                )}
              </button>
              <div className="dw-habit-body">
                <span className="dw-habit-name">{habit.name}</span>
                {habit.type !== 'check' && (
                  <span className="dw-habit-value">
                    {currentValue}/{habit.target}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </WidgetShell>
  )
}
