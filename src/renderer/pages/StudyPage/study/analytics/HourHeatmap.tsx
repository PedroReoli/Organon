/**
 * HourHeatmap — grade 24x7 (hora x dia da semana) com intensidade
 * proporcional aos focusSeconds. SVG puro, zero lib. Upgrade 14.
 */

import React from 'react'
import type { StudyHeatmapCell } from '@hooks/useStudyAnalytics'

interface HourHeatmapProps {
  cells: StudyHeatmapCell[]
  max: number
  /** Cor de acento. Default usa --color-primary. */
  accent?: string
}

const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}min`
  const hours = Math.floor(minutes / 60)
  const rem = minutes % 60
  return rem === 0 ? `${hours}h` : `${hours}h${rem}m`
}

export const HourHeatmap: React.FC<HourHeatmapProps> = ({
  cells,
  max,
  accent = 'var(--color-primary)',
}) => {
  const cellSize = 18
  const gap = 2
  const leftPad = 32
  const topPad = 20
  const width = leftPad + 24 * (cellSize + gap)
  const height = topPad + 7 * (cellSize + gap)

  return (
    <div className="study-hour-heatmap">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        preserveAspectRatio="xMinYMin meet"
        className="study-hour-heatmap-svg"
      >
        {/* Hour labels topo (de 3 em 3) */}
        {Array.from({ length: 24 }).map((_, h) =>
          h % 3 === 0 ? (
            <text
              key={`hour-${h}`}
              x={leftPad + h * (cellSize + gap) + cellSize / 2}
              y={topPad - 6}
              fontSize="9"
              fill="var(--color-text-muted)"
              textAnchor="middle"
            >
              {h}h
            </text>
          ) : null,
        )}

        {/* Weekday labels esquerda */}
        {WEEKDAY_LABELS.map((label, i) => (
          <text
            key={`wd-${i}`}
            x={leftPad - 6}
            y={topPad + i * (cellSize + gap) + cellSize - 4}
            fontSize="9"
            fill="var(--color-text-muted)"
            textAnchor="end"
          >
            {label}
          </text>
        ))}

        {/* Cells */}
        {cells.map((cell) => {
          const intensity = max === 0 ? 0 : cell.focusSeconds / max
          const opacity = cell.focusSeconds === 0 ? 0 : 0.15 + intensity * 0.85
          return (
            <rect
              key={`${cell.hour}-${cell.weekday}`}
              x={leftPad + cell.hour * (cellSize + gap)}
              y={topPad + cell.weekday * (cellSize + gap)}
              width={cellSize}
              height={cellSize}
              rx={3}
              fill={cell.focusSeconds === 0 ? 'var(--color-surface)' : accent}
              fillOpacity={opacity}
              stroke="var(--color-border)"
              strokeWidth={0.5}
            >
              <title>
                {`${WEEKDAY_LABELS[cell.weekday]} ${cell.hour}h\n${formatDuration(cell.focusSeconds)} em ${cell.sessionCount} sessao${cell.sessionCount === 1 ? '' : 'es'}`}
              </title>
            </rect>
          )
        })}
      </svg>
    </div>
  )
}
