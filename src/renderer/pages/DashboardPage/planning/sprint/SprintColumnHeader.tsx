/**
 * SprintColumnHeader — header da coluna de 1 dia no Sprint Board.
 *
 * Mostra nome do dia, data (DD), contador feitos/total e botao que
 * abre o drill-down horario.
 *
 * Definido no upgrade 01.
 */

import React from 'react'
import type { Day } from '@types'
import { DAY_LABELS } from '@types'

interface SprintColumnHeaderProps {
  day: Day
  dateISO: string
  totalCount: number
  doneCount: number
  isToday: boolean
  onOpenHourly?: (day: Day, dateISO: string) => void
}

function getDayNumber(iso: string): string {
  return String(Number(iso.slice(8, 10)))
}

export const SprintColumnHeader: React.FC<SprintColumnHeaderProps> = ({
  day,
  dateISO,
  totalCount,
  doneCount,
  isToday,
  onOpenHourly,
}) => {
  return (
    <header
      className={['sprint-column-header', isToday ? 'is-today' : '']
        .filter(Boolean)
        .join(' ')}
    >
      <div className="sprint-column-header-main">
        <span className="sprint-column-header-day">{DAY_LABELS[day]}</span>
        <span className="sprint-column-header-date">{getDayNumber(dateISO)}</span>
      </div>
      <div className="sprint-column-header-aux">
        <span className="sprint-column-header-count" title="Feitos / Total">
          {doneCount}/{totalCount}
        </span>
        {onOpenHourly && (
          <button
            type="button"
            className="sprint-column-header-hourly"
            title="Abrir vista horaria do dia"
            onClick={() => onOpenHourly(day, dateISO)}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              width="14"
              height="14"
            >
              <circle cx="12" cy="12" r="9" />
              <polyline points="12 7 12 12 15 15" />
            </svg>
          </button>
        )}
      </div>
    </header>
  )
}
