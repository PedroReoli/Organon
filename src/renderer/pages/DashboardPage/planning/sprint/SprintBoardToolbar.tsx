/**
 * SprintBoardToolbar — toolbar do Sprint Board.
 *
 * Exibe navegacao de sprint (semana), label "Sprint SNN", botao Hoje e
 * filtros por status/prioridade/projeto.
 *
 * Definido no upgrade 01.
 */

import React from 'react'
import type { CardPriority, CardStatus, Day, Project } from '@types'
import { getISOWeekNumber } from '@shared/utils/date'

const MONTH_SHORT = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
]

function formatWeekLabel(weekDates: Record<Day, string>): string {
  const start = new Date(weekDates.mon + 'T00:00:00')
  const end = new Date(weekDates.sun + 'T00:00:00')
  const sm = MONTH_SHORT[start.getMonth()]
  const em = MONTH_SHORT[end.getMonth()]
  const sy = start.getFullYear()
  const ey = end.getFullYear()
  if (sy !== ey)
    return `${start.getDate()} ${sm} ${sy} — ${end.getDate()} ${em} ${ey}`
  if (sm !== em)
    return `${start.getDate()} ${sm} — ${end.getDate()} ${em} ${sy}`
  return `${start.getDate()} — ${end.getDate()} ${em} ${sy}`
}

export interface SprintFilters {
  status: Set<CardStatus>
  priority: Set<CardPriority>
  projectId: string | null
}

interface SprintBoardToolbarProps {
  weekDates: Record<Day, string>
  weekOffset: number
  projects?: Project[]
  filters: SprintFilters
  onFiltersChange: (next: SprintFilters) => void
  onPrevWeek: () => void
  onNextWeek: () => void
  onToday: () => void
}

const STATUS_OPTIONS: { value: CardStatus; label: string }[] = [
  { value: 'todo', label: 'A fazer' },
  { value: 'in_progress', label: 'Em progresso' },
  { value: 'blocked', label: 'Bloqueado' },
  { value: 'done', label: 'Feito' },
]

const PRIORITY_OPTIONS: CardPriority[] = ['P1', 'P2', 'P3', 'P4']

function toggleSetValue<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set)
  if (next.has(value)) next.delete(value)
  else next.add(value)
  return next
}

export const SprintBoardToolbar: React.FC<SprintBoardToolbarProps> = ({
  weekDates,
  weekOffset,
  projects,
  filters,
  onFiltersChange,
  onPrevWeek,
  onNextWeek,
  onToday,
}) => {
  const sprintNumber = getISOWeekNumber(weekDates.mon)
  const label = formatWeekLabel(weekDates)

  return (
    <div className="sprint-board-toolbar">
      <div className="sprint-board-toolbar-nav">
        <button
          type="button"
          className="sprint-board-toolbar-nav-btn"
          onClick={onPrevWeek}
          title="Semana anterior"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            width="14"
            height="14"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <div className="sprint-board-toolbar-label">
          <strong>Sprint S{sprintNumber}</strong>
          <span className="sprint-board-toolbar-sublabel">{label}</span>
        </div>

        <button
          type="button"
          className="sprint-board-toolbar-nav-btn"
          onClick={onNextWeek}
          title="Proxima semana"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            width="14"
            height="14"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>

        {weekOffset !== 0 && (
          <button
            type="button"
            className="sprint-board-toolbar-today"
            onClick={onToday}
          >
            Hoje
          </button>
        )}
      </div>

      <div className="sprint-board-toolbar-filters">
        <div className="sprint-board-toolbar-filter-group">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={[
                'sprint-board-toolbar-chip',
                filters.status.has(opt.value) ? 'is-active' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() =>
                onFiltersChange({
                  ...filters,
                  status: toggleSetValue(filters.status, opt.value),
                })
              }
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="sprint-board-toolbar-filter-group">
          {PRIORITY_OPTIONS.map((p) => (
            <button
              key={p}
              type="button"
              className={[
                'sprint-board-toolbar-chip',
                filters.priority.has(p) ? 'is-active' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() =>
                onFiltersChange({
                  ...filters,
                  priority: toggleSetValue(filters.priority, p),
                })
              }
            >
              {p}
            </button>
          ))}
        </div>

        {projects && projects.length > 0 && (
          <select
            className="sprint-board-toolbar-project"
            value={filters.projectId ?? ''}
            onChange={(e) =>
              onFiltersChange({
                ...filters,
                projectId: e.target.value || null,
              })
            }
          >
            <option value="">Todos projetos</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  )
}
