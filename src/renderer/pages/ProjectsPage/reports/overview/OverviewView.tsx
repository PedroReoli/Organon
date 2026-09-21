import React, { useMemo, useState, useRef, useEffect } from 'react'
import type { WeekReport } from '@types'
import { TrendingUp } from 'lucide-react'
import { getCommitTypeColor } from '../constants/commitTypes'

interface OverviewViewProps {
  reports: WeekReport[]
  onBack: () => void
  onSelectReport: (index: number) => void
}

const PIE_COLORS = ['#818cf8', '#34d399', '#f97316', '#38bdf8', '#fbbf24', '#f87171', '#a78bfa', '#94a3b8']

type ChartMode = 'line' | 'bar' | 'area' | 'stacked'

const MONTHS_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function formatWeekLabel(dateStr: string): string {
  const parts = dateStr.split('-')
  if (parts.length < 3) return dateStr
  const day = parts[2]
  const month = MONTHS_SHORT[parseInt(parts[1], 10) - 1] || parts[1]
  return `${day} ${month}`
}

function getSmoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return ''
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`
  if (points.length === 2) return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`

  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[Math.min(points.length - 1, i + 2)]

    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6

    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`
  }
  return d
}

export const OverviewView: React.FC<OverviewViewProps> = ({ reports, onBack, onSelectReport }) => {
  const [weeksLimit, setWeeksLimit] = useState<number>(reports.length)

  const sliced = useMemo(() => reports.slice(0, weeksLimit), [reports, weeksLimit])
  const chronological = useMemo(() => [...sliced].reverse(), [sliced])

  const totals = useMemo(() => {
    let commits = 0, todos = 0, badCommits = 0
    const activeRepos = new Set<string>()
    for (const r of sliced) {
      commits += r.summary.totalCommits
      todos += r.summary.totalTodos
      badCommits += r.summary.totalBadCommits ?? 0
      for (const repo of r.repos) {
        if (repo.commitCount > 0) activeRepos.add(`${repo.group}/${repo.name}`)
      }
    }
    return { commits, todos, badCommits, activeRepos: activeRepos.size }
  }, [sliced])

  const avgCommits = sliced.length > 0 ? Math.round(totals.commits / sliced.length) : 0

  const topRepos = useMemo(() => {
    const map = new Map<string, { name: string; group: string; commits: number; weeks: number }>()
    for (const r of sliced) {
      for (const repo of r.repos) {
        const key = `${repo.group}/${repo.name}`
        const cur = map.get(key) ?? { name: repo.name, group: repo.group, commits: 0, weeks: 0 }
        cur.commits += repo.commitCount
        if (repo.commitCount > 0) cur.weeks++
        map.set(key, cur)
      }
    }
    return [...map.values()].sort((a, b) => b.commits - a.commits).slice(0, 10)
  }, [sliced])

  const maxRepoCommits = topRepos[0]?.commits || 1

  const commitTypes = useMemo(() => {
    const acc: Record<string, number> = {}
    for (const r of sliced) {
      for (const repo of r.repos) {
        for (const [type, count] of Object.entries(repo.commitTypes ?? {})) {
          acc[type] = (acc[type] ?? 0) + (count as number)
        }
      }
    }
    return acc
  }, [sliced])

  const [hoveredType, setHoveredType] = useState<string | null>(null)

  const pieSlices = useMemo(() => {
    const entries = Object.entries(commitTypes).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])
    const total = entries.reduce((s, [, v]) => s + v, 0)
    if (total === 0) return []
    let angle = -Math.PI / 2
    const totalEntries = entries.length
    const CX = 75, CY = 75, RO = 62, RI = 38

    return entries.map(([type, count], i) => {
      const sweep = (count / total) * 2 * Math.PI
      const gap = totalEntries > 1 ? 0.03 : 0
      const aStart = angle + gap / 2
      const aEnd = angle + sweep - gap / 2
      angle += sweep

      const ox1 = CX + RO * Math.cos(aStart)
      const oy1 = CY + RO * Math.sin(aStart)
      const ox2 = CX + RO * Math.cos(aEnd)
      const oy2 = CY + RO * Math.sin(aEnd)
      const ix1 = CX + RI * Math.cos(aStart)
      const iy1 = CY + RI * Math.sin(aStart)
      const ix2 = CX + RI * Math.cos(aEnd)
      const iy2 = CY + RI * Math.sin(aEnd)
      const large = (aEnd - aStart) > Math.PI ? 1 : 0

      const path = `M ${ox1} ${oy1} A ${RO} ${RO} 0 ${large} 1 ${ox2} ${oy2} L ${ix2} ${iy2} A ${RI} ${RI} 0 ${large} 0 ${ix1} ${iy1} Z`

      return {
        type,
        count,
        pct: Math.round((count / total) * 100),
        color: getCommitTypeColor(type, PIE_COLORS[i % PIE_COLORS.length]),
        path,
      }
    })
  }, [commitTypes])

  const badRepos = useMemo(() => {
    const map = new Map<string, number>()
    for (const r of sliced) {
      for (const repo of r.repos) {
        if ((repo.badCommits?.length ?? 0) > 0) {
          const key = `${repo.group}/${repo.name}`
          map.set(key, (map.get(key) ?? 0) + (repo.badCommits?.length ?? 0))
        }
      }
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
  }, [sliced])

  const stoppedRecurrent = useMemo(() => {
    const map = new Map<string, number>()
    for (const r of sliced) {
      for (const repo of r.repos) {
        if (repo.status === 'parado') {
          const key = `${repo.group}/${repo.name}`
          map.set(key, (map.get(key) ?? 0) + 1)
        }
      }
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
  }, [sliced])

  const lineData = chronological
  const lineMax = Math.max(1, ...lineData.map(r => r.summary.totalCommits))
  const [chartMode, setChartMode] = useState<ChartMode>('area')
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const [chartWidth, setChartWidth] = useState(1000)
  const [hoveredWeekIdx, setHoveredWeekIdx] = useState<number | null>(null)

  useEffect(() => {
    const el = chartContainerRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setChartWidth(Math.max(480, Math.round(entry.contentRect.width)))
        }
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const H = 220, PAD_L = 44, PAD_R = 24, PAD_T = 28, PAD_B = 36
  const chartGap = lineData.length > 0 ? (chartWidth - PAD_L - PAD_R) / lineData.length : 48
  const chartStartX = PAD_L
  const barW = Math.max(8, Math.min(36, chartGap * 0.65))

  const peakWeek = useMemo(() => {
    if (!lineData.length) return null
    let max = lineData[0]
    for (const r of lineData) {
      if (r.summary.totalCommits > max.summary.totalCommits) max = r
    }
    return max
  }, [lineData])

  const pts = useMemo(() => {
    return lineData.map((r, i) => {
      const x = chartStartX + i * chartGap + chartGap / 2
      const y = H - PAD_B - (r.summary.totalCommits / lineMax) * (H - PAD_T - PAD_B)
      return { x, y, report: r, idx: i }
    })
  }, [lineData, chartGap, chartStartX, lineMax, H, PAD_B, PAD_T])

  const smoothLinePath = useMemo(() => getSmoothPath(pts), [pts])
  const smoothAreaPath = useMemo(() => {
    if (pts.length < 2) return ''
    const baseline = H - PAD_B
    return `${smoothLinePath} L ${pts[pts.length - 1].x} ${baseline} L ${pts[0].x} ${baseline} Z`
  }, [smoothLinePath, pts, H, PAD_B])

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const relX = mouseX - PAD_L
    if (relX < 0 || relX > chartWidth - PAD_L - PAD_R || lineData.length === 0) {
      setHoveredWeekIdx(null)
      return
    }
    const idx = Math.min(lineData.length - 1, Math.max(0, Math.floor(relX / chartGap)))
    setHoveredWeekIdx(idx)
  }

  const chartTypesPerWeek = useMemo(() => {
    return chronological.map(r => {
      const types: Record<string, number> = {}
      for (const repo of r.repos) {
        for (const [type, count] of Object.entries(repo.commitTypes ?? {})) {
          types[type] = (types[type] ?? 0) + (count as number)
        }
      }
      return types
    })
  }, [chronological])

  const weekOptions = [...new Set([4, 8, 12, reports.length])].filter(v => v <= reports.length)

  return (
    <div className="projects-content-scroll">
      <div className="projects-header">
        <div>
          <button type="button" className="projects-btn" onClick={onBack} style={{ marginBottom: '8px', padding: '4px 8px', border: 'none', background: 'transparent', paddingLeft: 0 }}>← Voltar</button>
          <h1 className="projects-title">Visão Geral</h1>
        </div>
        <div className="projects-tabs">
          {weekOptions.map(n => (
            <button
              key={n}
              type="button"
              className={`projects-tab ${weeksLimit === n ? 'projects-tab-active' : ''}`}
              style={weeksLimit === n ? { color: 'var(--accent-primary)', borderBottomColor: 'var(--accent-primary)' } : {}}
              onClick={() => setWeeksLimit(n)}
            >
              {n === reports.length ? 'Tudo' : `${n} Semanas`}
            </button>
          ))}
        </div>
      </div>

      <div className="projects-stats-compact-bar" style={{ marginBottom: 6 }}>
        <div className="projects-stat-pill">
          <span className="projects-stat-pill-label">Semanas:</span>
          <span className="projects-stat-pill-value">{sliced.length}</span>
        </div>
        <div className="projects-stat-pill pill-blue">
          <span className="projects-stat-pill-label">Commits:</span>
          <span className="projects-stat-pill-value">{totals.commits}</span>
        </div>
        <div className="projects-stat-pill">
          <span className="projects-stat-pill-label">Média/sem:</span>
          <span className="projects-stat-pill-value">{avgCommits}</span>
        </div>
        <div className="projects-stat-pill pill-green">
          <span className="projects-stat-pill-label">Ativos:</span>
          <span className="projects-stat-pill-value">{totals.activeRepos}</span>
        </div>
        {totals.todos > 0 && (
          <div className="projects-stat-pill pill-amber">
            <span className="projects-stat-pill-label">TODOs:</span>
            <span className="projects-stat-pill-value">{totals.todos}</span>
          </div>
        )}
        {totals.badCommits > 0 && (
          <div className="projects-stat-pill pill-red">
            <span className="projects-stat-pill-label">Bad Commits:</span>
            <span className="projects-stat-pill-value">{totals.badCommits}</span>
          </div>
        )}
      </div>

      {lineData.length >= 2 && (
        <div className="projects-dashboard-card" style={{ marginBottom: 8, padding: '12px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h3 className="projects-card-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                <TrendingUp size={16} color="var(--color-primary)" />
                <span>Evolução de Commits por Semana</span>
              </h3>
              {peakWeek && (
                <span style={{ fontSize: '11px', background: 'rgba(99, 102, 241, 0.12)', border: '1px solid rgba(99, 102, 241, 0.25)', color: '#a5b4fc', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                  Pico: {peakWeek.summary.totalCommits} ({formatWeekLabel(peakWeek.date)})
                </span>
              )}
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Média: {avgCommits} commits/sem
              </span>
            </div>

            <div className="projects-tabs" style={{ marginBottom: 0 }}>
              {(['area', 'line', 'bar', 'stacked'] as ChartMode[]).map(mode => (
                <button
                  key={mode}
                  type="button"
                  className={`projects-tab ${chartMode === mode ? 'projects-tab-active' : ''}`}
                  style={chartMode === mode ? { color: 'var(--color-primary)', borderBottomColor: 'var(--color-primary)', fontWeight: 700 } : {}}
                  onClick={() => setChartMode(mode)}
                >
                  {mode === 'area' ? 'Área' : mode === 'line' ? 'Linha' : mode === 'bar' ? 'Barras' : 'Stacked'}
                </button>
              ))}
            </div>
          </div>

          <div
            ref={chartContainerRef}
            style={{ width: '100%', position: 'relative', overflow: 'hidden' }}
          >
            {/* Interactive floating tooltip card */}
            {hoveredWeekIdx !== null && lineData[hoveredWeekIdx] && (() => {
              const r = lineData[hoveredWeekIdx]
              const p = pts[hoveredWeekIdx]
              const leftPos = Math.min(Math.max(12, p.x - 100), chartWidth - 220)
              const types = chartTypesPerWeek[hoveredWeekIdx] || {}
              const typeEntries = Object.entries(types).filter(([, c]) => (c as number) > 0)
              const activeCount = (r.repos || []).filter(repo => repo.commitCount > 0).length

              return (
                <div
                  style={{
                    position: 'absolute',
                    left: `${leftPos}px`,
                    top: '8px',
                    zIndex: 20,
                    pointerEvents: 'none',
                    background: '#111420',
                    border: '1px solid rgba(99, 102, 241, 0.4)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6), 0 0 12px rgba(99, 102, 241, 0.2)',
                    minWidth: '180px',
                  }}
                >
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '2px' }}>
                    Semana de {formatWeekLabel(r.date)}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {r.summary.totalCommits}
                    </span>
                    <span style={{ fontSize: '11px', color: '#a5b4fc', fontWeight: 600 }}>commits</span>
                    {activeCount > 0 && (
                      <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                        {activeCount} repos
                      </span>
                    )}
                  </div>
                  {typeEntries.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '4px' }}>
                      {typeEntries.map(([t, count]) => (
                        <span
                          key={t}
                          style={{
                            fontSize: '9.5px',
                            color: getCommitTypeColor(t),
                            background: 'rgba(255,255,255,0.05)',
                            padding: '1px 5px',
                            borderRadius: '3px',
                            fontWeight: 600,
                          }}
                        >
                          {t}: {count as number}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )
            })()}

            <svg
              width={chartWidth}
              height={H}
              viewBox={`0 0 ${chartWidth} ${H}`}
              style={{ display: 'block', width: '100%', cursor: 'crosshair' }}
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setHoveredWeekIdx(null)}
            >
              <defs>
                <linearGradient id="smoothAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.4} />
                  <stop offset="70%" stopColor="var(--color-primary)" stopOpacity={0.08} />
                  <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              {/* Grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map(pct => {
                const y = PAD_T + (1 - pct) * (H - PAD_T - PAD_B)
                return (
                  <g key={`grid-${pct}`}>
                    <line
                      x1={PAD_L}
                      y1={y}
                      x2={chartWidth - PAD_R}
                      y2={y}
                      stroke="var(--border)"
                      strokeWidth={1}
                      strokeDasharray={pct === 0 ? '0' : '4,4'}
                      opacity={0.6}
                    />
                    <text
                      x={PAD_L - 8}
                      y={y + 3.5}
                      textAnchor="end"
                      fontSize="10"
                      fill="var(--text-muted)"
                      fontWeight="500"
                    >
                      {Math.round(lineMax * pct)}
                    </text>
                  </g>
                )
              })}

              {/* Crosshair vertical line */}
              {hoveredWeekIdx !== null && pts[hoveredWeekIdx] && (
                <line
                  x1={pts[hoveredWeekIdx].x}
                  y1={PAD_T}
                  x2={pts[hoveredWeekIdx].x}
                  y2={H - PAD_B}
                  stroke="var(--color-primary)"
                  strokeWidth={1.5}
                  strokeDasharray="3,3"
                  opacity={0.8}
                />
              )}

              {/* Mode: AREA */}
              {chartMode === 'area' && (
                <>
                  {smoothAreaPath && (
                    <path d={smoothAreaPath} fill="url(#smoothAreaGrad)" />
                  )}
                  {smoothLinePath && (
                    <path
                      d={smoothLinePath}
                      fill="none"
                      stroke="var(--color-primary)"
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}
                  {pts.map((p, i) => {
                    const isHovered = hoveredWeekIdx === i
                    return (
                      <g key={p.report.date}>
                        {isHovered && (
                          <circle
                            cx={p.x}
                            cy={p.y}
                            r={10}
                            fill="var(--color-primary)"
                            opacity={0.25}
                          />
                        )}
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r={isHovered ? 6 : 3.5}
                          fill={isHovered ? '#ffffff' : 'var(--bg-primary)'}
                          stroke="var(--color-primary)"
                          strokeWidth={isHovered ? 3 : 2}
                          style={{ transition: 'all 0.12s ease' }}
                        />
                      </g>
                    )
                  })}
                </>
              )}

              {/* Mode: LINE */}
              {chartMode === 'line' && (
                <>
                  {smoothLinePath && (
                    <path
                      d={smoothLinePath}
                      fill="none"
                      stroke="var(--color-primary)"
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}
                  {pts.map((p, i) => {
                    const isHovered = hoveredWeekIdx === i
                    return (
                      <g key={p.report.date}>
                        {isHovered && (
                          <circle
                            cx={p.x}
                            cy={p.y}
                            r={10}
                            fill="var(--color-primary)"
                            opacity={0.25}
                          />
                        )}
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r={isHovered ? 6 : 4}
                          fill={isHovered ? '#ffffff' : 'var(--color-primary)'}
                          stroke={isHovered ? 'var(--color-primary)' : 'var(--bg-primary)'}
                          strokeWidth={2}
                          style={{ transition: 'all 0.12s ease' }}
                        />
                      </g>
                    )
                  })}
                </>
              )}

              {/* Mode: BAR */}
              {chartMode === 'bar' && lineData.map((r, i) => {
                const x = chartStartX + i * chartGap + (chartGap - barW) / 2
                const barH = (r.summary.totalCommits / lineMax) * (H - PAD_T - PAD_B)
                const y = H - PAD_B - barH
                const isHovered = hoveredWeekIdx === i
                return (
                  <g key={r.date}>
                    <rect
                      x={x}
                      y={y}
                      width={barW}
                      height={Math.max(2, barH)}
                      rx={3}
                      fill={isHovered ? '#818cf8' : 'var(--color-primary)'}
                      opacity={isHovered ? 1 : 0.85}
                      style={{ transition: 'all 0.12s ease' }}
                    />
                    {isHovered && (
                      <text
                        x={x + barW / 2}
                        y={y - 6}
                        textAnchor="middle"
                        fontSize="11"
                        fontWeight="700"
                        fill="var(--text-primary)"
                      >
                        {r.summary.totalCommits}
                      </text>
                    )}
                  </g>
                )
              })}

              {/* Mode: STACKED */}
              {chartMode === 'stacked' && lineData.map((r, i) => {
                const x = chartStartX + i * chartGap + (chartGap - barW) / 2
                const types = chartTypesPerWeek[i] || {}
                const total = r.summary.totalCommits
                const stackTypes = ['feat', 'fix', 'refactor', 'chore', 'docs', 'style', 'other']
                let yOffset = H - PAD_B
                const isHovered = hoveredWeekIdx === i

                return (
                  <g key={r.date} opacity={isHovered ? 1 : 0.9}>
                    {stackTypes.map(type => {
                      const count = types[type] || 0
                      if (count === 0) return null
                      const segH = (count / lineMax) * (H - PAD_T - PAD_B)
                      yOffset -= segH
                      return (
                        <rect
                          key={type}
                          x={x}
                          y={yOffset}
                          width={barW}
                          height={segH}
                          fill={getCommitTypeColor(type)}
                          rx={2}
                        />
                      )
                    })}
                    {isHovered && (
                      <text
                        x={x + barW / 2}
                        y={H - PAD_B - (total / lineMax) * (H - PAD_T - PAD_B) - 6}
                        textAnchor="middle"
                        fontSize="11"
                        fontWeight="700"
                        fill="var(--text-primary)"
                      >
                        {total}
                      </text>
                    )}
                  </g>
                )
              })}

              {/* X axis labels agrupados com espaçamento harmonioso */}
              {lineData.map((r, i) => {
                const step = lineData.length > 20 ? Math.ceil(lineData.length / 10) : lineData.length > 10 ? 2 : 1
                const shouldShowLabel = i % step === 0 || i === lineData.length - 1
                if (!shouldShowLabel) return null
                const x = chartStartX + i * chartGap + chartGap / 2
                const isHovered = hoveredWeekIdx === i
                return (
                  <text
                    key={`lbl-${r.date}`}
                    x={x}
                    y={H - 12}
                    textAnchor="middle"
                    fontSize="10"
                    fill={isHovered ? 'var(--text-primary)' : 'var(--text-muted)'}
                    fontWeight={isHovered ? '700' : '500'}
                  >
                    {formatWeekLabel(r.date)}
                  </text>
                )
              })}
            </svg>
          </div>
        </div>
      )}

      <div className="projects-dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '6px', marginBottom: '6px' }}>
        <div className="projects-dashboard-card" style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '6px 10px' }}>
          <h3 className="projects-card-title">Top repos (total de commits)</h3>
          <div className="projects-top-list">
            {topRepos.map(repo => {
              const pct = Math.max(4, (repo.commits / maxRepoCommits) * 100)
              return (
                <div key={`${repo.group}/${repo.name}`} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="projects-top-name" style={{ width: '110px' }} title={`${repo.group}/${repo.name}`}>{repo.name}</span>
                  <div className="projects-top-track">
                    <div className="projects-top-fill" style={{ width: `${pct}%`, backgroundColor: 'var(--accent-primary)' }} />
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', width: '32px', textAlign: 'right' }}>{repo.commits}</span>
                </div>
              )
            })}
          </div>
        </div>

        {pieSlices.length > 0 && (() => {
          const hoveredSlice = pieSlices.find(s => s.type === hoveredType)
          const totalCommitsSum = pieSlices.reduce((sum, s) => sum + s.count, 0)
          const CX = 75, CY = 75

          return (
            <div className="projects-dashboard-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 className="projects-card-title" style={{ margin: 0 }}>Tipos de Commit (Acumulado)</h3>
                <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                  {totalCommitsSum} commits classificados
                </span>
              </div>

              <div style={{ display: 'flex', gap: '16px', alignItems: 'center', height: '100%', justifyContent: 'space-between' }}>
                {/* Donut SVG */}
                <div style={{ position: 'relative', width: 150, height: 150, flexShrink: 0 }}>
                  <svg width={150} height={150} viewBox="0 0 150 150">
                    {pieSlices.map(s => {
                      const isHovered = hoveredType === s.type
                      return (
                        <path
                          key={s.type}
                          d={s.path}
                          fill={s.color}
                          opacity={hoveredType ? (isHovered ? 1 : 0.4) : 0.9}
                          stroke="#111420"
                          strokeWidth={2}
                          style={{
                            cursor: 'pointer',
                            transition: 'opacity 0.15s ease, transform 0.15s ease',
                            transformOrigin: `${CX}px ${CY}px`,
                            transform: isHovered ? 'scale(1.04)' : 'scale(1)',
                          }}
                          onMouseEnter={() => setHoveredType(s.type)}
                          onMouseLeave={() => setHoveredType(null)}
                        >
                          <title>{`${s.type}: ${s.count} (${s.pct}%)`}</title>
                        </path>
                      )
                    })}

                    {/* Central Donut Readout */}
                    <text
                      x={CX}
                      y={CY - 2}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill={hoveredSlice ? hoveredSlice.color : 'var(--text-primary)'}
                      fontSize={hoveredSlice ? '18' : '17'}
                      fontWeight="800"
                    >
                      {hoveredSlice ? hoveredSlice.count : totalCommitsSum}
                    </text>
                    <text
                      x={CX}
                      y={CY + 14}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="var(--text-muted)"
                      fontSize="9"
                      fontWeight="700"
                      letterSpacing="0.05em"
                    >
                      {hoveredSlice ? `${hoveredSlice.type.toUpperCase()} (${hoveredSlice.pct}%)` : 'COMMITS'}
                    </text>
                  </svg>
                </div>

                {/* Interactive Legend with progress bars */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1, minWidth: 0, maxHeight: 180, overflowY: 'auto' }}>
                  {pieSlices.map(s => {
                    const isHovered = hoveredType === s.type
                    return (
                      <div
                        key={s.type}
                        onMouseEnter={() => setHoveredType(s.type)}
                        onMouseLeave={() => setHoveredType(null)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '3px 6px',
                          borderRadius: '4px',
                          background: isHovered ? 'rgba(255, 255, 255, 0.07)' : 'transparent',
                          cursor: 'pointer',
                          transition: 'all 0.12s ease',
                        }}
                      >
                        <span
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '2px',
                            background: s.color,
                            flexShrink: 0,
                            boxShadow: isHovered ? `0 0 8px ${s.color}` : 'none',
                          }}
                        />
                        <span
                          style={{
                            color: isHovered ? '#ffffff' : 'var(--text-primary)',
                            fontSize: '11px',
                            width: '52px',
                            fontWeight: isHovered ? 700 : 500,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {s.type}
                        </span>
                        <div style={{ flex: 1, height: '4px', background: 'rgba(255, 255, 255, 0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{ width: `${s.pct}%`, height: '100%', background: s.color, borderRadius: '2px' }} />
                        </div>
                        <span style={{ color: 'var(--text-muted)', fontSize: '10px', width: '28px', textAlign: 'right', fontWeight: 600 }}>
                          {s.pct}%
                        </span>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '11px', width: '32px', textAlign: 'right', fontWeight: 700 }}>
                          {s.count}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })()}
        
        {badRepos.length > 0 && (
          <div className="projects-dashboard-card" style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '6px 10px' }}>
            <h3 className="projects-card-title" style={{ color: 'var(--accent-red)' }}>Repos com mais bad commits</h3>
            <div className="projects-top-list">
              {badRepos.map(([key, count]) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="projects-top-name" style={{ width: '110px' }} title={key}>{key.split('/')[1] ?? key}</span>
                  <div className="projects-top-track">
                    <div className="projects-top-fill" style={{ width: `${(count / (badRepos[0][1] || 1)) * 100}%`, backgroundColor: 'var(--accent-red)' }} />
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent-red)', width: '32px', textAlign: 'right' }}>{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {stoppedRecurrent.length > 0 && (
          <div className="projects-dashboard-card" style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '6px 10px' }}>
            <h3 className="projects-card-title" style={{ color: 'var(--accent-yellow)' }}>Repos parados recorrentes</h3>
            <div className="projects-top-list">
              {stoppedRecurrent.map(([key, weeks]) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="projects-top-name" style={{ width: '110px' }} title={key}>{key.split('/')[1] ?? key}</span>
                  <div className="projects-top-track">
                    <div className="projects-top-fill" style={{ width: `${(weeks / (stoppedRecurrent[0][1] || 1)) * 100}%`, backgroundColor: 'var(--accent-yellow)' }} />
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent-yellow)', width: '32px', textAlign: 'right' }}>{weeks}s</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="projects-dashboard-card" style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '6px 10px' }}>
        <h3 className="projects-card-title">Semanas analisadas</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '350px', overflowY: 'auto', paddingRight: '4px' }}>
          {sliced.map((r, i) => (
            <button
              key={r.date}
              type="button"
              onClick={() => onSelectReport(i)}
              className="projects-commit-row"
              style={{ display: 'flex', alignItems: 'center', padding: '4px 8px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer', textAlign: 'left', transition: 'border-color 0.2s', gap: '10px' }}
            >
              <span style={{ width: '55px', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>{r.weekLabel}</span>
              <span style={{ width: '110px', fontSize: '11px', color: 'var(--text-muted)' }}>
                {r.period ? `${r.period.from}–${r.period.to}` : r.date}
              </span>
              <div className="projects-top-track" style={{ flex: 1 }}>
                <div className="projects-top-fill" style={{ width: `${Math.max(4, (r.summary.totalCommits / lineMax) * 100)}%`, backgroundColor: 'var(--accent-primary)' }} />
              </div>
              <span style={{ width: '38px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>{r.summary.totalCommits}c</span>
              <span style={{ width: '55px', textAlign: 'right', fontSize: '10.5px', color: 'var(--text-secondary)' }}>{r.summary.activeThisWeek} atv</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}