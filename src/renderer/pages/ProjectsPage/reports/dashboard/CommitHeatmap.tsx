import React, { useMemo, useState } from 'react'
import type { HeatmapEntry } from '@types'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DAY_LABELS: Record<string, string> = {
  Mon: 'Seg',
  Tue: 'Ter',
  Wed: 'Qua',
  Thu: 'Qui',
  Fri: 'Sex',
  Sat: 'Sáb',
  Sun: 'Dom',
}

const PERIODS = [
  { label: 'Madrugada', hours: [0, 1, 2, 3, 4, 5], color: 'var(--color-primary)' },
  { label: 'Manhã', hours: [6, 7, 8, 9, 10, 11], color: '#f59e0b' },
  { label: 'Tarde', hours: [12, 13, 14, 15, 16, 17], color: '#22c55e' },
  { label: 'Noite', hours: [18, 19, 20, 21, 22, 23], color: '#ef4444' },
]

export function normalizeDay(raw: string | number | undefined | null): string {
  if (raw === undefined || raw === null) return 'Mon'
  if (typeof raw === 'number' || /^\d+$/.test(String(raw).trim())) {
    const n = Number(raw)
    const jsDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    return jsDays[n] ?? 'Mon'
  }
  const clean = String(raw)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '')

  if (clean.startsWith('seg') || clean.startsWith('mon')) return 'Mon'
  if (clean.startsWith('ter') || clean.startsWith('tue')) return 'Tue'
  if (clean.startsWith('qua') || clean.startsWith('wed')) return 'Wed'
  if (clean.startsWith('qui') || clean.startsWith('thu')) return 'Thu'
  if (clean.startsWith('sex') || clean.startsWith('fri')) return 'Fri'
  if (clean.startsWith('sab') || clean.startsWith('sat')) return 'Sat'
  if (clean.startsWith('dom') || clean.startsWith('sun')) return 'Sun'
  return 'Mon'
}

type HeatmapView = 'grid' | 'bars' | 'period'

const FIXED_H = 175

interface CommitHeatmapProps {
  heatmapData: HeatmapEntry[]
}

export const CommitHeatmap: React.FC<CommitHeatmapProps> = ({ heatmapData }) => {
  const [view, setView] = useState<HeatmapView>('grid')
  const [tooltip, setTooltip] = useState<{ x: number; y: number; day: string; hour: number; count: number } | null>(null)

  const grid = useMemo(() => {
    const map = new Map<string, number>()
    const dayTotals = new Map<string, number>()
    const hourTotals = new Map<number, number>()
    for (const e of heatmapData) {
      const day = normalizeDay(e.day)
      const key = `${day}|${e.hour}`
      map.set(key, (map.get(key) ?? 0) + e.commits)
      dayTotals.set(day, (dayTotals.get(day) ?? 0) + e.commits)
      hourTotals.set(e.hour, (hourTotals.get(e.hour) ?? 0) + e.commits)
    }
    const max = Math.max(1, ...map.values())
    const dayMax = Math.max(1, ...dayTotals.values())
    const hourMax = Math.max(1, ...hourTotals.values())
    return { map, max, dayTotals, dayMax, hourTotals, hourMax }
  }, [heatmapData])

  const periodTotals = useMemo(() => PERIODS.map(p => ({
    ...p,
    total: p.hours.reduce((s, h) => s + (grid.hourTotals.get(h) ?? 0), 0),
  })), [grid])

  const hasData = heatmapData.length > 0

  const CELL = 14
  const GAP = 2.5
  const LABEL_W = 40
  const LABEL_H = 18
  const DAY_TOTAL_W = 34
  const hours = 24
  const W = LABEL_W + hours * (CELL + GAP) - GAP + 6 + DAY_TOTAL_W
  const H = LABEL_H + DAYS.length * (CELL + GAP) - GAP + 4

  const renderGrid = () => (
    <div style={{ position: 'relative', height: FIXED_H, overflow: 'hidden' }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height="auto"
        className="rp-heatmap-svg"
        preserveAspectRatio="xMinYMid meet"
        style={{ display: 'block', overflow: 'visible' }}
        onClick={e => { if (!(e.target as Element).closest('rect')) setTooltip(null) }}
      >
        {/* Marcadores de hora: 00h, 03h, 06h, 09h, 12h, 15h, 18h, 21h */}
        {Array.from({ length: hours }, (_, hour) =>
          hour % 3 === 0 ? (
            <text
              key={hour}
              x={LABEL_W + hour * (CELL + GAP) + CELL / 2}
              y={LABEL_H - 5}
              textAnchor="middle"
              className="rp-heatmap-label"
              style={{ fontSize: '9.5px', fill: 'var(--text-muted)' }}
            >
              {String(hour).padStart(2, '0') + 'h'}
            </text>
          ) : null
        )}

        {/* Nomes dos dias da semana (com margem suficiente para nunca cortar o 'D' de Dom) */}
        {DAYS.map((day, di) => (
          <text
            key={day}
            x={LABEL_W - 8}
            y={LABEL_H + di * (CELL + GAP) + CELL / 2 + 3.5}
            textAnchor="end"
            className="rp-heatmap-label"
            style={{ fontSize: '10px', fontWeight: 600, fill: 'var(--text-secondary)' }}
          >
            {DAY_LABELS[day]}
          </text>
        ))}

        {/* Grade de Células */}
        {DAYS.map((day, di) =>
          Array.from({ length: hours }, (_, hour) => {
            const count = grid.map.get(`${day}|${hour}`) ?? 0
            const opacity = count === 0 ? 0.08 : 0.28 + (count / grid.max) * 0.72
            const isSelected = tooltip?.day === day && tooltip?.hour === hour
            return (
              <rect
                key={`${day}-${hour}`}
                x={LABEL_W + hour * (CELL + GAP)}
                y={LABEL_H + di * (CELL + GAP)}
                width={CELL}
                height={CELL}
                rx={2.5}
                fill={count === 0 ? 'var(--color-border)' : 'var(--color-primary)'}
                fillOpacity={count === 0 ? 0.35 : opacity}
                stroke={isSelected ? 'var(--color-primary)' : 'rgba(255,255,255,0.04)'}
                strokeWidth={isSelected ? 1.5 : 0.5}
                style={{ cursor: count > 0 ? 'pointer' : 'default', transition: 'all 0.1s ease' }}
                onClick={e => {
                  if (count === 0) { setTooltip(null); return }
                  const rect = (e.target as SVGRectElement).getBoundingClientRect()
                  const parent = (e.target as SVGRectElement).closest('.rp-heatmap-block')?.getBoundingClientRect()
                  const x = rect.left - (parent?.left ?? 0) + CELL / 2
                  const y = rect.top - (parent?.top ?? 0) - 8
                  if (tooltip?.day === day && tooltip?.hour === hour) setTooltip(null)
                  else setTooltip({ x, y, day, hour, count })
                }}
              />
            )
          })
        )}

        {/* Totais do Dia na Direita */}
        {DAYS.map((day, di) => {
          const total = grid.dayTotals.get(day) ?? 0
          const barH = total === 0 ? 0 : Math.max(3, (total / grid.dayMax) * CELL)
          const xBase = LABEL_W + hours * (CELL + GAP) + 6
          const yRow = LABEL_H + di * (CELL + GAP)
          return (
            <g key={`total-${day}`}>
              <rect
                x={xBase}
                y={yRow}
                width={DAY_TOTAL_W}
                height={CELL}
                rx={3}
                fill="color-mix(in srgb, var(--color-surface) 90%, black)"
                stroke="var(--color-border)"
                strokeWidth={0.5}
              />
              {total > 0 && (
                <rect
                  x={xBase}
                  y={yRow + CELL - barH}
                  width={3}
                  height={barH}
                  rx={1.5}
                  fill="var(--color-primary)"
                  fillOpacity={0.9}
                />
              )}
              <text
                x={xBase + DAY_TOTAL_W / 2 + 1}
                y={yRow + CELL / 2 + 3.5}
                textAnchor="middle"
                className="rp-heatmap-label"
                style={{
                  fontSize: '9px',
                  fontWeight: total > 0 ? 700 : 400,
                  fill: total > 0 ? 'var(--text-primary)' : 'var(--text-muted)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {total > 0 ? total : '—'}
              </text>
            </g>
          )
        })}
      </svg>

      {tooltip && (
        <div className="rp-heatmap-tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
          <span className="rp-heatmap-tooltip-day">{DAY_LABELS[tooltip.day]}</span>
          <span className="rp-heatmap-tooltip-hour">{String(tooltip.hour).padStart(2, '0') + 'h–' + String(tooltip.hour + 1).padStart(2, '0') + 'h'}</span>
          <span className="rp-heatmap-tooltip-count">{tooltip.count} commit{tooltip.count !== 1 ? 's' : ''}</span>
        </div>
      )}

      <div className="rp-heatmap-legend">
        <span className="rp-heatmap-legend-label">menos</span>
        {[0.15, 0.35, 0.55, 0.75, 1].map((v, i) => (
          <div key={i} className="rp-heatmap-legend-cell" style={{ background: 'var(--color-primary)', opacity: v }} />
        ))}
        <span className="rp-heatmap-legend-label">mais</span>
      </div>
    </div>
  )

  const renderBars = () => (
    <div style={{ height: FIXED_H, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div className="rp-heatmap-bars-section-title">Por hora do dia</div>
      <div className="rp-heatmap-bars" style={{ height: 52, flexShrink: 0 }}>
        {Array.from({ length: 24 }, (_, h) => {
          const count = grid.hourTotals.get(h) ?? 0
          const pct = grid.hourMax > 0 ? (count / grid.hourMax) * 100 : 0
          const period = PERIODS.find(p => p.hours.includes(h))
          return (
            <div key={h} className="rp-heatmap-bar-col" title={`${String(h).padStart(2, '0')}h: ${count} commits`}>
              <div className="rp-heatmap-bar-track">
                <div
                  className="rp-heatmap-bar-fill"
                  style={{ height: `${Math.max(pct, count > 0 ? 4 : 0)}%`, background: period?.color ?? 'var(--color-primary)' }}
                />
              </div>
              {h % 6 === 0 && <span className="rp-heatmap-bar-label">{String(h).padStart(2, '0')}</span>}
            </div>
          )
        })}
      </div>
      <div className="rp-heatmap-bars-section-title">Por dia da semana</div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3, overflow: 'hidden' }}>
        {DAYS.map(day => {
          const count = grid.dayTotals.get(day) ?? 0
          const pct = grid.dayMax > 0 ? (count / grid.dayMax) * 100 : 0
          return (
            <div key={day} className="rp-heatmap-day-bar-row">
              <span className="rp-heatmap-day-bar-label">{DAY_LABELS[day]}</span>
              <div className="rp-heatmap-day-bar-track">
                <div className="rp-heatmap-day-bar-fill" style={{ width: `${Math.max(pct, count > 0 ? 2 : 0)}%` }} />
              </div>
              <span className="rp-heatmap-day-bar-value">{count}</span>
            </div>
          )
        })}
      </div>
    </div>
  )

  const renderPeriod = () => {
    const total = periodTotals.reduce((s, p) => s + p.total, 0) || 1
    const top = [...periodTotals].sort((a, b) => b.total - a.total)[0]
    return (
      <div style={{ height: FIXED_H, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {periodTotals.map(p => {
          const pct = Math.round((p.total / total) * 100)
          return (
            <div key={p.label} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <div className="rp-heatmap-period-header">
                <span className="rp-heatmap-period-dot" style={{ background: p.color }} />
                <span className="rp-heatmap-period-label">{p.label}</span>
                <span className="rp-heatmap-period-hours">{p.hours[0]}h–{p.hours[p.hours.length - 1] + 1}h</span>
                <span className="rp-heatmap-period-pct" style={{ color: p.color }}>{pct}%</span>
                <span className="rp-heatmap-period-count">{p.total}</span>
              </div>
              <div className="rp-heatmap-period-track">
                <div className="rp-heatmap-period-fill" style={{ width: `${pct}%`, background: p.color }} />
              </div>
            </div>
          )
        })}
        {top && top.total > 0 && (
          <div className="rp-heatmap-period-insight">
            Pico de produtividade: <strong style={{ color: top.color }}>{top.label}</strong> com {Math.round((top.total / total) * 100)}% dos commits
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', flexShrink: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <h3 className="projects-card-title" style={{ margin: 0 }}>Heatmap de Atividade</h3>
        <div className="projects-view-toggle">
          {([['grid', 'Grade'], ['bars', 'Barras'], ['period', 'Período']] as [HeatmapView, string][]).map(([v, label]) => (
            <button
              key={v}
              type="button"
              className={`projects-view-toggle-btn ${view === v ? 'is-active' : ''}`}
              onClick={() => setView(v)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {!hasData ? (
        <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Sem dados no período</span>
      ) : (
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {view === 'grid' && renderGrid()}
          {view === 'bars' && renderBars()}
          {view === 'period' && renderPeriod()}
        </div>
      )}
    </div>
  )
}
