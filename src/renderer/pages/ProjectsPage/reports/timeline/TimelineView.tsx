import React, { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import type { WeekReport } from '@types'

interface TimelineViewProps {
  reports: WeekReport[]
}

interface DayCommit {
  repo: string
  group: string
  msg: string
  type: string
  time?: string
}

export const TimelineView: React.FC<TimelineViewProps> = ({ reports }) => {
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  // Build commit index by day
  const commitsByDay = useMemo(() => {
    const map = new Map<string, DayCommit[]>()
    for (const report of reports) {
      for (const repo of report.repos) {
        for (const c of repo.commits) {
          if (!c.date) continue
          const d = c.date.slice(0, 10)
          const list = map.get(d) ?? []
          list.push({ repo: repo.name, group: repo.group, msg: c.msg, type: c.type, time: c.time })
          map.set(d, list)
        }
      }
    }
    return map
  }, [reports])

  // Build a heatmap of daily activity over the last 365 days
  const heatmapData = useMemo(() => {
    const days: { date: string; count: number; weekday: number }[] = []
    const now = new Date()
    for (let i = 364; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      days.push({ date: key, count: commitsByDay.get(key)?.length ?? 0, weekday: d.getDay() })
    }
    return days
  }, [commitsByDay])

  const maxCount = Math.max(1, ...heatmapData.map(d => d.count))

  // Group by weeks (columns)
  const weeks: typeof heatmapData[] = []
  let currentWeek: typeof heatmapData = []
  for (const day of heatmapData) {
    currentWeek.push(day)
    if (day.weekday === 6) {
      weeks.push(currentWeek)
      currentWeek = []
    }
  }
  if (currentWeek.length > 0) weeks.push(currentWeek)

  // Monthly activity summary
  const monthlyData = useMemo(() => {
    const months = new Map<string, { commits: number; days: number }>()
    for (const d of heatmapData) {
      const m = d.date.slice(0, 7)
      const entry = months.get(m) ?? { commits: 0, days: 0 }
      entry.commits += d.count
      if (d.count > 0) entry.days++
      months.set(m, entry)
    }
    return Array.from(months.entries()).map(([month, data]) => ({ month, ...data }))
  }, [heatmapData])

  // Top active days
  const topDays = useMemo(() => {
    return [...heatmapData].filter(d => d.count > 0).sort((a, b) => b.count - a.count).slice(0, 5)
  }, [heatmapData])

  const totalCommits = heatmapData.reduce((s, d) => s + d.count, 0)
  const activeDays = heatmapData.filter(d => d.count > 0).length
  const currentStreak = (() => {
    let streak = 0
    for (let i = heatmapData.length - 1; i >= 0; i--) {
      if (heatmapData[i].count > 0) streak++
      else break
    }
    return streak
  })()

  function getColor(count: number): string {
    if (count === 0) return 'var(--color-background)'
    const intensity = count / maxCount
    if (intensity > 0.75) return '#22c55e'
    if (intensity > 0.5) return '#4ade80'
    if (intensity > 0.25) return '#86efac'
    return '#bbf7d0'
  }

  const dayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  // Month labels for the heatmap columns
  const monthLabels = useMemo(() => {
    const labels: { label: string; col: number }[] = []
    let lastMonth = ''
    weeks.forEach((week, i) => {
      const firstDay = week[0]
      if (firstDay) {
        const m = firstDay.date.slice(0, 7)
        if (m !== lastMonth) {
          const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
          const monthIdx = parseInt(firstDay.date.slice(5, 7)) - 1
          labels.push({ label: monthNames[monthIdx], col: i })
          lastMonth = m
        }
      }
    })
    return labels
  }, [weeks])

  const selectedDayCommits = selectedDay ? (commitsByDay.get(selectedDay) ?? []) : []

  const TYPE_COLORS: Record<string, string> = {
    feat: '#22c55e', fix: '#ef4444', refactor: 'var(--color-primary)', chore: '#94a3b8',
    docs: '#60a5fa', perf: '#f59e0b', other: '#6b7280', revert: '#f97316', test: 'var(--color-primary)',
  }

  function fmtDate(d: string): string {
    return d.slice(8, 10) + '/' + d.slice(5, 7) + '/' + d.slice(0, 4)
  }

  return (
    <div className="projects-content-scroll">
      <div className="projects-header">
        <div>
          <h1 className="projects-title">Timeline de Atividade</h1>
          <p className="projects-subtitle">Último ano</p>
        </div>
      </div>

      <div className="projects-stats-bar" style={{ marginBottom: '32px' }}>
        <div className="projects-stat-card">
          <span className="projects-stat-value">{totalCommits}</span>
          <span className="projects-stat-label">Commits</span>
        </div>
        <div className="projects-stat-card">
          <span className="projects-stat-value">{activeDays}</span>
          <span className="projects-stat-label">Dias ativos</span>
        </div>
        <div className="projects-stat-card">
          <span className="projects-stat-value" style={{ color: 'var(--accent-green)' }}>{currentStreak}</span>
          <span className="projects-stat-label">Streak atual</span>
        </div>
        <div className="projects-stat-card">
          <span className="projects-stat-value">{activeDays > 0 ? Math.round(totalCommits / activeDays) : 0}</span>
          <span className="projects-stat-label">Média/dia ativo</span>
        </div>
      </div>

      <div className="projects-dashboard-grid" style={{ alignItems: 'flex-start' }}>
        {/* Heatmap (Coluna Esquerda) */}
        <div className="projects-dashboard-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflow: 'hidden' }}>
          <h2 className="projects-card-title">Contribuições</h2>

          <div style={{ display: 'flex', flexDirection: 'column', overflowX: 'auto', paddingBottom: '16px' }}>
            {/* Month labels */}
            <div style={{ display: 'flex', paddingLeft: '40px', marginBottom: '12px', position: 'relative', height: '16px' }}>
              {monthLabels.map((m, i) => (
                <span
                  key={i}
                  style={{ position: 'absolute', left: `${40 + m.col * 22}px`, fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)' }}
                >{m.label}</span>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '4px' }}>
              {/* Day labels */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '36px' }}>
                {dayLabels.map((l, i) => (
                  <span key={i} style={{ fontSize: '12px', color: 'var(--text-muted)', height: '18px', lineHeight: '18px', textAlign: 'right', paddingRight: '6px' }}>
                    {i % 2 === 1 ? l : ''}
                  </span>
                ))}
              </div>

              {/* Grid */}
              <div style={{ display: 'flex', gap: '4px' }}>
                {weeks.map((week, wi) => (
                  <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {week.map(day => (
                      <div
                        key={day.date}
                        style={{ 
                          width: '18px', height: '18px', borderRadius: '4px', cursor: day.count > 0 ? 'pointer' : 'default',
                          background: getColor(day.count), border: selectedDay === day.date ? '2px solid var(--text-primary)' : '1px solid rgba(255,255,255,0.05)',
                          transition: 'transform 0.1s ease',
                          transform: selectedDay === day.date ? 'scale(1.1)' : 'scale(1)',
                          boxShadow: selectedDay === day.date ? '0 0 8px rgba(255,255,255,0.2)' : 'none'
                        }}
                        title={`${fmtDate(day.date)}: ${day.count} commits`}
                        onClick={() => day.count > 0 && setSelectedDay(selectedDay === day.date ? null : day.date)}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-muted)', marginTop: '24px', paddingLeft: '40px' }}>
              <span>Menos</span>
              {[0, 0.25, 0.5, 0.75, 1].map((v, i) => (
                <div key={i} style={{ width: '16px', height: '16px', borderRadius: '3px', background: getColor(v * maxCount) }} />
              ))}
              <span>Mais</span>
              <span style={{ marginLeft: '12px', opacity: 0.7 }}>(máx: {maxCount})</span>
            </div>
          </div>

          {/* Detalhe do dia selecionado */}
          {selectedDay && (
            <div style={{ marginTop: '16px', background: 'var(--bg-secondary)', borderRadius: '6px', padding: '16px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{fmtDate(selectedDay)}</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', background: 'var(--bg-primary)', padding: '2px 8px', borderRadius: '12px' }}>{selectedDayCommits.length} commits</span>
                </div>
                <button type="button" className="projects-btn" style={{ padding: '4px 8px', border: 'none', background: 'transparent' }} onClick={() => setSelectedDay(null)} aria-label="Fechar"><X size={14} /></button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                {selectedDayCommits.sort((a, b) => (b.time ?? '').localeCompare(a.time ?? '')).map((c, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '60px 100px 1fr 60px', gap: '12px', alignItems: 'center', background: 'var(--bg-primary)', padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                    <span style={{ background: TYPE_COLORS[c.type] ?? '#6b7280', color: '#fff', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', textAlign: 'center' }}>{c.type}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.repo}</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.msg}</span>
                    {c.time && <span style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'right' }}>{c.time}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Coluna Direita (Resumo Mensal e Top Dias empilhados) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Monthly summary */}
          <div className="projects-dashboard-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 className="projects-card-title">Resumo mensal</h2>
            <div className="projects-top-list" style={{ gap: '12px', maxHeight: '360px', overflowY: 'auto', paddingRight: '8px' }}>
              {monthlyData.map(m => (
                <div key={m.month} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span className="projects-top-name">{m.month}</span>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'baseline' }}>
                      <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>{m.commits}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{m.days}d ativos</span>
                    </div>
                  </div>
                  <div className="projects-top-track">
                    <div
                      className="projects-top-fill"
                      style={{ width: `${Math.min(100, (m.commits / Math.max(1, ...monthlyData.map(x => x.commits))) * 100)}%`, backgroundColor: 'var(--accent-primary)' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top days */}
          {topDays.length > 0 && (
            <div className="projects-dashboard-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h2 className="projects-card-title">Dias mais produtivos</h2>
              <div className="projects-top-list" style={{ gap: '8px' }}>
                {topDays.map((d, i) => (
                  <div key={d.date} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-primary)', padding: '12px 16px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '12px', width: '20px' }}>#{i + 1}</span>
                      <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>{fmtDate(d.date)}</span>
                    </div>
                    <span style={{ color: 'var(--accent-yellow)', fontWeight: 600, fontSize: '14px' }}>{d.count} commits</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
