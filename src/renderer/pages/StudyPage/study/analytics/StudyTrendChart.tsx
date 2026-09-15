/**
 * StudyTrendChart — line chart de focusSeconds ao longo dos ultimos
 * N dias. SVG puro. Upgrade 14.
 */

import React from 'react'
import type { StudyTrendPoint } from '@hooks/useStudyAnalytics'

interface StudyTrendChartProps {
  points: StudyTrendPoint[]
  accent?: string
}

function formatMinutes(seconds: number): string {
  return Math.round(seconds / 60) + 'min'
}

export const StudyTrendChart: React.FC<StudyTrendChartProps> = ({
  points,
  accent = 'var(--color-primary)',
}) => {
  if (points.length === 0) {
    return (
      <div className="study-trend-chart is-empty">Sem sessoes registradas.</div>
    )
  }

  const width = 600
  const height = 140
  const paddingX = 8
  const paddingTop = 16
  const paddingBottom = 18
  const chartW = width - paddingX * 2
  const chartH = height - paddingTop - paddingBottom

  const max = Math.max(1, ...points.map((p) => p.focusSeconds))
  const stepX = chartW / Math.max(1, points.length - 1)
  const path = points
    .map((p, i) => {
      const x = paddingX + i * stepX
      const y = paddingTop + chartH - (p.focusSeconds / max) * chartH
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  const areaPath = `${path} L${(paddingX + (points.length - 1) * stepX).toFixed(1)},${(paddingTop + chartH).toFixed(1)} L${paddingX.toFixed(1)},${(paddingTop + chartH).toFixed(1)} Z`

  return (
    <div className="study-trend-chart">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        preserveAspectRatio="none"
        className="study-trend-chart-svg"
      >
        <defs>
          <linearGradient id="study-trend-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="0.4" />
            <stop offset="100%" stopColor={accent} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Max label */}
        <text
          x={paddingX}
          y={paddingTop - 4}
          fontSize="9"
          fill="var(--color-text-muted)"
        >
          {formatMinutes(max)}
        </text>

        {/* Baseline */}
        <line
          x1={paddingX}
          y1={paddingTop + chartH}
          x2={width - paddingX}
          y2={paddingTop + chartH}
          stroke="var(--color-border)"
          strokeWidth={1}
        />

        <path d={areaPath} fill="url(#study-trend-grad)" />
        <path
          d={path}
          fill="none"
          stroke={accent}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* First / last labels */}
        <text
          x={paddingX}
          y={height - 4}
          fontSize="9"
          fill="var(--color-text-muted)"
        >
          {points[0]?.date.slice(5)}
        </text>
        <text
          x={width - paddingX}
          y={height - 4}
          fontSize="9"
          fill="var(--color-text-muted)"
          textAnchor="end"
        >
          {points[points.length - 1]?.date.slice(5)}
        </text>
      </svg>
    </div>
  )
}
