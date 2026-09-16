import React, { useMemo, useState } from 'react'
import type { WeekReport } from '@types'

interface OverviewViewProps {
  reports: WeekReport[]
  onBack: () => void
  onSelectReport: (index: number) => void
}

const COMMIT_TYPE_COLORS: Record<string, string> = {
  feat: '#22c55e', fix: '#ef4444', refactor: 'var(--color-primary)', chore: '#94a3b8',
  docs: '#60a5fa', perf: '#f59e0b', other: '#6b7280', revert: '#f97316',
  style: 'var(--color-primary)', merge: '#6b7280',
}

const PIE_COLORS = ['var(--color-primary)', '#22c55e', '#f97316', 'var(--color-primary)', 'var(--color-primary)', 'var(--color-primary)', '#eab308', '#ef4444']

type ChartMode = 'line' | 'bar' | 'area' | 'stacked'

const MONTHS_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function formatWeekLabel(dateStr: string): string {
  const parts = dateStr.split('-')
  if (parts.length < 3) return dateStr
  const day = parts[2]
  const month = MONTHS_SHORT[parseInt(parts[1], 10) - 1] || parts[1]
  return `${day} ${month}`
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

  const pieSlices = useMemo(() => {
    const entries = Object.entries(commitTypes).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])
    const total = entries.reduce((s, [, v]) => s + v, 0)
    if (total === 0) return []
    let angle = -Math.PI / 2
    return entries.map(([type, count], i) => {
      const sweep = (count / total) * 2 * Math.PI
      const x1 = Math.cos(angle); const y1 = Math.sin(angle)
      angle += sweep
      const x2 = Math.cos(angle); const y2 = Math.sin(angle)
      return {
        type, count, pct: Math.round((count / total) * 100),
        x1, y1, x2, y2, large: sweep > Math.PI ? 1 : 0,
        color: COMMIT_TYPE_COLORS[type] ?? PIE_COLORS[i % PIE_COLORS.length],
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
  const [chartMode, setChartMode] = useState<ChartMode>('bar')
  const H = 240, PAD_L = 40, PAD_R = 20, PAD_T = 24, PAD_B = 36
  
  const chartGap = 48
  const W = Math.max(800, PAD_L + PAD_R + (lineData.length * chartGap))
  const chartStartX = PAD_L + ((W - PAD_L - PAD_R) - (chartGap * lineData.length)) / 2
  const barW = 24

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

      <div className="projects-stats-bar" style={{ marginBottom: '32px' }}>
        <div className="projects-stat-card">
          <span className="projects-stat-value">{sliced.length}</span>
          <span className="projects-stat-label">Semanas</span>
        </div>
        <div className="projects-stat-card">
          <span className="projects-stat-value">{totals.commits}</span>
          <span className="projects-stat-label">Commits totais</span>
        </div>
        <div className="projects-stat-card">
          <span className="projects-stat-value">{avgCommits}</span>
          <span className="projects-stat-label">Média/semana</span>
        </div>
        <div className="projects-stat-card">
          <span className="projects-stat-value">{totals.activeRepos}</span>
          <span className="projects-stat-label">Repos ativos</span>
        </div>
        {totals.todos > 0 && (
          <div className="projects-stat-card">
            <span className="projects-stat-value" style={{ color: 'var(--accent-yellow)' }}>{totals.todos}</span>
            <span className="projects-stat-label">TODOs</span>
          </div>
        )}
        {totals.badCommits > 0 && (
          <div className="projects-stat-card">
            <span className="projects-stat-value" style={{ color: 'var(--accent-red)' }}>{totals.badCommits}</span>
            <span className="projects-stat-label">Bad commits</span>
          </div>
        )}
      </div>

      {lineData.length >= 2 && (
        <div className="projects-dashboard-card" style={{ marginBottom: '24px', paddingBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 className="projects-card-title" style={{ margin: 0 }}>Evolução de commits por semana</h3>
            <div className="projects-tabs" style={{ marginBottom: 0 }}>
              {(['bar', 'line', 'area', 'stacked'] as ChartMode[]).map(mode => (
                <button
                  key={mode}
                  type="button"
                  className={`projects-tab ${chartMode === mode ? 'projects-tab-active' : ''}`}
                  style={chartMode === mode ? { color: 'var(--accent-primary)', borderBottomColor: 'var(--accent-primary)' } : {}}
                  onClick={() => setChartMode(mode)}
                >
                  {mode === 'bar' ? 'Barras' : mode === 'line' ? 'Linha' : mode === 'area' ? 'Área' : 'Stacked'}
                </button>
              ))}
            </div>
          </div>
          <div style={{ width: '100%', overflowX: 'auto', overflowY: 'hidden' }}>
            <svg width={W} height={H} className="rp-line-svg" style={{ minWidth: W }} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
              {/* Grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map(pct => {
                const y = PAD_T + (1 - pct) * (H - PAD_T - PAD_B)
                return (
                  <g key={`grid-${pct}`}>
                    <line x1={PAD_L} y1={y} x2={W - PAD_R} y2={y} stroke="var(--border)" strokeWidth={1} strokeDasharray={pct === 0 ? "0" : "4,4"} />
                    <text x={PAD_L - 8} y={y + 4} textAnchor="end" fontSize="11" fill="var(--text-secondary)">{Math.round(lineMax * pct)}</text>
                  </g>
                )
              })}

              {chartMode === 'bar' && lineData.map((r, i) => {
                const x = chartStartX + i * chartGap + (chartGap - barW) / 2
                const barH = (r.summary.totalCommits / lineMax) * (H - PAD_T - PAD_B)
                const y = H - PAD_B - barH
                return (
                  <g key={r.date}>
                    <rect x={x} y={y} width={barW} height={barH} rx={4} fill="var(--accent-primary)" opacity={0.85}>
                      <title>{`${formatWeekLabel(r.date)}: ${r.summary.totalCommits} commits`}</title>
                    </rect>
                    <text x={x + barW / 2} y={y - 6} textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--text-primary)">{r.summary.totalCommits}</text>
                  </g>
                )
              })}

              {chartMode === 'line' && (
                <>
                  <polyline
                    points={lineData.map((r, i) => {
                      const x = chartStartX + i * chartGap + chartGap / 2
                      const y = H - PAD_B - (r.summary.totalCommits / lineMax) * (H - PAD_T - PAD_B)
                      return `${x},${y}`
                    }).join(' ')}
                    fill="none"
                    stroke="var(--accent-primary)"
                    strokeWidth={3}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                  {lineData.map((r, i) => {
                    const x = chartStartX + i * chartGap + chartGap / 2
                    const y = H - PAD_B - (r.summary.totalCommits / lineMax) * (H - PAD_T - PAD_B)
                    return (
                      <g key={r.date}>
                        <circle cx={x} cy={y} r={5} fill="var(--bg-primary)" stroke="var(--accent-primary)" strokeWidth={2} />
                        <title>{`${formatWeekLabel(r.date)}: ${r.summary.totalCommits} commits`}</title>
                        <text x={x} y={y - 10} textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--text-primary)">{r.summary.totalCommits}</text>
                      </g>
                    )
                  })}
                </>
              )}

              {chartMode === 'area' && (
                <>
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="var(--accent-primary)" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <path
                    d={(() => {
                      const pts = lineData.map((r, i) => {
                        const x = chartStartX + i * chartGap + chartGap / 2
                        const y = H - PAD_B - (r.summary.totalCommits / lineMax) * (H - PAD_T - PAD_B)
                        return { x, y }
                      })
                      const baseline = H - PAD_B
                      return `M ${pts[0].x},${baseline} ` + pts.map(p => `L ${p.x},${p.y}`).join(' ') + ` L ${pts[pts.length - 1].x},${baseline} Z`
                    })()}
                    fill="url(#areaGrad)"
                  />
                  <polyline
                    points={lineData.map((r, i) => {
                      const x = chartStartX + i * chartGap + chartGap / 2
                      const y = H - PAD_B - (r.summary.totalCommits / lineMax) * (H - PAD_T - PAD_B)
                      return `${x},${y}`
                    }).join(' ')}
                    fill="none"
                    stroke="var(--accent-primary)"
                    strokeWidth={3}
                    strokeLinejoin="round"
                  />
                  {lineData.map((r, i) => {
                    const x = chartStartX + i * chartGap + chartGap / 2
                    const y = H - PAD_B - (r.summary.totalCommits / lineMax) * (H - PAD_T - PAD_B)
                    return (
                      <circle key={r.date} cx={x} cy={y} r={4} fill="var(--accent-primary)">
                        <title>{`${formatWeekLabel(r.date)}: ${r.summary.totalCommits} commits`}</title>
                      </circle>
                    )
                  })}
                </>
              )}

              {chartMode === 'stacked' && lineData.map((r, i) => {
                const x = chartStartX + i * chartGap + (chartGap - barW) / 2
                const types = chartTypesPerWeek[i] || {}
                const total = r.summary.totalCommits
                const stackTypes = ['feat', 'fix', 'refactor', 'chore', 'docs', 'style', 'other']
                let yOffset = H - PAD_B
                return (
                  <g key={r.date}>
                    {stackTypes.map(type => {
                      const count = types[type] || 0
                      if (count === 0) return null
                      const segH = (count / lineMax) * (H - PAD_T - PAD_B)
                      yOffset -= segH
                      return (
                        <rect key={type} x={x} y={yOffset} width={barW} height={segH} fill={COMMIT_TYPE_COLORS[type] || '#6b7280'} opacity={0.85} rx={2}>
                          <title>{`${formatWeekLabel(r.date)} — ${type}: ${count}`}</title>
                        </rect>
                      )
                    })}
                    <text x={x + barW / 2} y={H - PAD_B - (total / lineMax) * (H - PAD_T - PAD_B) - 6} textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--text-primary)">{total}</text>
                  </g>
                )
              })}

              {/* X axis labels */}
              {lineData.map((r, i) => {
                const x = chartStartX + i * chartGap + chartGap / 2
                // Se houver muitas semanas, pode omitir algumas, mas com chartGap = 48 dá pra mostrar todas.
                // Mas vamos rotacionar um pouco pra ficar melhor e não sobrepor as barras.
                return (
                  <text key={`lbl-${r.date}`} x={x} y={H - 12} textAnchor="middle" fontSize="12" fill="var(--text-secondary)">
                    {formatWeekLabel(r.date)}
                  </text>
                )
              })}
            </svg>
          </div>
        </div>
      )}

      <div className="projects-dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginBottom: '24px' }}>
        <div className="projects-dashboard-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 className="projects-card-title">Top repos (total de commits)</h3>
          <div className="projects-top-list">
            {topRepos.map(repo => {
              const pct = Math.max(4, (repo.commits / maxRepoCommits) * 100)
              return (
                <div key={`${repo.group}/${repo.name}`} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className="projects-top-name" style={{ width: '120px' }} title={`${repo.group}/${repo.name}`}>{repo.name}</span>
                  <div className="projects-top-track">
                    <div className="projects-top-fill" style={{ width: `${pct}%`, backgroundColor: 'var(--accent-primary)' }} />
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', width: '32px', textAlign: 'right' }}>{repo.commits}</span>
                </div>
              )
            })}
          </div>
        </div>

        {pieSlices.length > 0 && (
          <div className="projects-dashboard-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 className="projects-card-title">Tipos de commit (acumulado)</h3>
            <div style={{ display: 'flex', gap: '32px', alignItems: 'center', height: '100%', justifyContent: 'center' }}>
              <svg width={160} height={160} viewBox="0 0 120 120">
                {pieSlices.map(s => {
                  const R = 50, CX = 60, CY = 60
                  return (
                    <path
                      key={s.type}
                      d={`M ${CX} ${CY} L ${CX + s.x1 * R} ${CY + s.y1 * R} A ${R} ${R} 0 ${s.large} 1 ${CX + s.x2 * R} ${CY + s.y2 * R} Z`}
                      fill={s.color}
                      opacity={0.85}
                      stroke="var(--bg-primary)"
                      strokeWidth={1}
                    >
                      <title>{`${s.type}: ${s.count} (${s.pct}%)`}</title>
                    </path>
                  )
                })}
              </svg>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {pieSlices.map(s => (
                  <div key={s.type} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: s.color }} />
                    <span style={{ color: 'var(--text-primary)', width: '60px' }}>{s.type}</span>
                    <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{s.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {badRepos.length > 0 && (
          <div className="projects-dashboard-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 className="projects-card-title" style={{ color: 'var(--accent-red)' }}>Repos com mais bad commits</h3>
            <div className="projects-top-list">
              {badRepos.map(([key, count]) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className="projects-top-name" style={{ width: '120px' }} title={key}>{key.split('/')[1] ?? key}</span>
                  <div className="projects-top-track">
                    <div className="projects-top-fill" style={{ width: `${(count / (badRepos[0][1] || 1)) * 100}%`, backgroundColor: 'var(--accent-red)' }} />
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent-red)', width: '32px', textAlign: 'right' }}>{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {stoppedRecurrent.length > 0 && (
          <div className="projects-dashboard-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 className="projects-card-title" style={{ color: 'var(--accent-yellow)' }}>Repos parados recorrentes</h3>
            <div className="projects-top-list">
              {stoppedRecurrent.map(([key, weeks]) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className="projects-top-name" style={{ width: '120px' }} title={key}>{key.split('/')[1] ?? key}</span>
                  <div className="projects-top-track">
                    <div className="projects-top-fill" style={{ width: `${(weeks / (stoppedRecurrent[0][1] || 1)) * 100}%`, backgroundColor: 'var(--accent-yellow)' }} />
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent-yellow)', width: '32px', textAlign: 'right' }}>{weeks}s</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="projects-dashboard-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h3 className="projects-card-title">Semanas analisadas</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflowY: 'auto', paddingRight: '8px' }}>
          {sliced.map((r, i) => (
            <button
              key={r.date}
              type="button"
              onClick={() => onSelectReport(i)}
              className="projects-commit-row"
              style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', textAlign: 'left', transition: 'border-color 0.2s', gap: '16px' }}
            >
              <span style={{ width: '60px', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{r.weekLabel}</span>
              <span style={{ width: '120px', fontSize: '12px', color: 'var(--text-muted)' }}>
                {r.period ? `${r.period.from}–${r.period.to}` : r.date}
              </span>
              <div className="projects-top-track" style={{ flex: 1 }}>
                <div className="projects-top-fill" style={{ width: `${Math.max(4, (r.summary.totalCommits / lineMax) * 100)}%`, backgroundColor: 'var(--accent-primary)' }} />
              </div>
              <span style={{ width: '40px', textAlign: 'right', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{r.summary.totalCommits}c</span>
              <span style={{ width: '60px', textAlign: 'right', fontSize: '11px', color: 'var(--text-secondary)' }}>{r.summary.activeThisWeek} ativos</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}