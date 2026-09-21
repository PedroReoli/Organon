import React, { useMemo, useState } from 'react'
import {
  Activity,
  Calendar,
  Clock,
  FolderGit2,
  Trophy,
  X,
} from 'lucide-react'
import type { WeekReport } from '@types'
import { CommitTypeBadge } from '../components/CommitTypeBadge'

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
  const [hoveredDay, setHoveredDay] = useState<{ date: string; count: number; weekday: number } | null>(null)

  // Index de commits por dia
  const commitsByDay = useMemo(() => {
    const map = new Map<string, DayCommit[]>()
    for (const report of reports) {
      for (const repo of report.repos) {
        for (const c of repo.commits ?? []) {
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

  // Heatmap dos últimos 365 dias
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

  // Agrupamento em colunas semanais
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

  // Resumo mensal
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

  // Dias mais produtivos
  const topDays = useMemo(() => {
    return [...heatmapData].filter(d => d.count > 0).sort((a, b) => b.count - a.count).slice(0, 5)
  }, [heatmapData])

  // Distribuição por dia da semana (Segunda a Domingo)
  const weekdayTotals = useMemo(() => {
    const totals = [0, 0, 0, 0, 0, 0, 0] // 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sab
    for (const d of heatmapData) {
      totals[d.weekday] += d.count
    }
    const order = [1, 2, 3, 4, 5, 6, 0]
    const labels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
    const max = Math.max(1, ...totals)
    const grandTotal = totals.reduce((s, v) => s + v, 0) || 1

    return order.map((idx, i) => ({
      label: labels[i],
      count: totals[idx],
      barPct: Math.round((totals[idx] / max) * 100),
      sharePct: Math.round((totals[idx] / grandTotal) * 100),
    }))
  }, [heatmapData])

  // Top Repositórios mais ativos no ano
  const topReposInPeriod = useMemo(() => {
    const map = new Map<string, { repo: string; group: string; count: number }>()
    for (const report of reports) {
      for (const repo of report.repos) {
        const key = `${repo.group}/${repo.name}`
        const count = repo.commitCount || repo.commits?.length || 0
        const cur = map.get(key) ?? { repo: repo.name, group: repo.group, count: 0 }
        cur.count += count
        map.set(key, cur)
      }
    }
    const list = [...map.values()].filter(r => r.count > 0).sort((a, b) => b.count - a.count).slice(0, 7)
    const maxRepoCommits = Math.max(1, list[0]?.count || 1)
    return list.map(r => ({
      ...r,
      pct: Math.round((r.count / maxRepoCommits) * 100),
    }))
  }, [reports])

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
    if (count === 0) return 'rgba(255, 255, 255, 0.04)'
    const intensity = count / maxCount
    if (intensity > 0.65) return '#22c55e'
    if (intensity > 0.4) return '#34d399'
    if (intensity > 0.2) return '#6ee7b7'
    return '#a7f3d0'
  }

  function fmtDateFull(d: string): string {
    const parts = d.split('-')
    if (parts.length !== 3) return d
    const year = parts[0]
    const month = parseInt(parts[1], 10) - 1
    const day = parseInt(parts[2], 10)
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
    const dateObj = new Date(parseInt(year, 10), month, day)
    const dayName = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][dateObj.getDay()]
    return `${dayName}, ${day} de ${monthNames[month]} de ${year}`
  }

  const dayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  const monthLabels = useMemo(() => {
    const labels: { label: string; col: number }[] = []
    let lastMonth = ''
    weeks.forEach((week, i) => {
      const firstDay = week[0]
      if (firstDay) {
        const m = firstDay.date.slice(0, 7)
        if (m !== lastMonth) {
          const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
          const monthIdx = parseInt(firstDay.date.slice(5, 7), 10) - 1
          labels.push({ label: monthNames[monthIdx], col: i })
          lastMonth = m
        }
      }
    })
    return labels
  }, [weeks])

  const selectedDayCommits = selectedDay ? (commitsByDay.get(selectedDay) ?? []) : []

  function fmtDate(d: string): string {
    return `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`
  }

  return (
    <div className="projects-content-scroll" style={{ paddingBottom: '32px' }}>
      {/* Header */}
      <div className="projects-header" style={{ marginBottom: '8px' }}>
        <div>
          <h1 className="projects-title">Timeline de Atividade</h1>
          <p className="projects-subtitle">Histórico anual consolidado de desenvolvimento</p>
        </div>
      </div>

      {/* KPI Bar */}
      <div className="projects-stats-compact-bar" style={{ marginBottom: '12px' }}>
        <div className="projects-stat-pill">
          <span className="projects-stat-pill-label">Commits no ano:</span>
          <span className="projects-stat-pill-value">{totalCommits.toLocaleString('pt-BR')}</span>
        </div>
        <div className="projects-stat-pill pill-blue">
          <span className="projects-stat-pill-label">Dias ativos:</span>
          <span className="projects-stat-pill-value">{activeDays}</span>
        </div>
        <div className="projects-stat-pill pill-green">
          <span className="projects-stat-pill-label">Streak atual:</span>
          <span className="projects-stat-pill-value">{currentStreak}d</span>
        </div>
        <div className="projects-stat-pill">
          <span className="projects-stat-pill-label">Média/dia ativo:</span>
          <span className="projects-stat-pill-value">{activeDays > 0 ? Math.round(totalCommits / activeDays) : 0}</span>
        </div>
        <div className="projects-stat-pill">
          <span className="projects-stat-pill-label">Consistência:</span>
          <span className="projects-stat-pill-value">{Math.round((activeDays / 365) * 100)}%</span>
        </div>
      </div>

      {/* Bloco 1: Heatmap Anual Completo (Largura Total 100%) */}
      <div className="projects-dashboard-card" style={{ marginBottom: '12px', padding: '14px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 className="projects-card-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Activity size={15} color="var(--color-primary)" />
              <span>Matriz Anual de Contribuições (52 Semanas)</span>
            </h2>
            {hoveredDay ? (
              <span style={{ fontSize: '11px', background: 'rgba(99, 102, 241, 0.12)', border: '1px solid rgba(99, 102, 241, 0.25)', color: 'var(--text-primary)', padding: '2px 8px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ fontWeight: 600 }}>{fmtDateFull(hoveredDay.date)}:</span>
                <strong style={{ color: hoveredDay.count > 0 ? '#22c55e' : 'var(--text-muted)' }}>
                  {hoveredDay.count > 0 ? `${hoveredDay.count} commits` : 'Sem commits'}
                </strong>
              </span>
            ) : selectedDay ? (
              <span style={{ fontSize: '11px', background: 'rgba(34, 197, 94, 0.12)', border: '1px solid rgba(34, 197, 94, 0.25)', color: '#22c55e', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                {fmtDate(selectedDay)} selecionado
              </span>
            ) : (
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {totalCommits} commits nos últimos 365 dias
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10.5px', color: 'var(--text-muted)' }}>
            <span>Menos</span>
            {[0, 0.25, 0.5, 0.75, 1].map((v, i) => (
              <div key={i} style={{ width: '11px', height: '11px', borderRadius: '2px', background: getColor(v * maxCount) }} />
            ))}
            <span>Mais</span>
            <span style={{ opacity: 0.7 }}>(máx: {maxCount})</span>
          </div>
        </div>

        <div style={{ display: 'flex', width: '100%', alignItems: 'flex-start' }}>
          {/* Rótulos dos dias da semana (Gutter esquerdo) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', width: '26px', flexShrink: 0, paddingTop: '18px' }}>
            {dayLabels.map((l, i) => (
              <span
                key={i}
                style={{
                  fontSize: '9.5px',
                  color: 'var(--text-muted)',
                  height: 'clamp(10px, 1.35vw, 15px)',
                  lineHeight: 'clamp(10px, 1.35vw, 15px)',
                  textAlign: 'right',
                  paddingRight: '6px',
                  fontWeight: 600,
                }}
              >
                {i % 2 === 1 ? l : ''}
              </span>
            ))}
          </div>

          {/* Grid 52 semanas em 100% de largura */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            {/* Rótulos dos meses proporcionais */}
            <div style={{ position: 'relative', width: '100%', height: '16px', marginBottom: '3px' }}>
              {monthLabels.map((m, i) => (
                <span
                  key={i}
                  style={{
                    position: 'absolute',
                    left: `${(m.col / weeks.length) * 100}%`,
                    fontSize: '10px',
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {m.label}
                </span>
              ))}
            </div>

            {/* Grid dinâmico que ocupa 100% da largura do card */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))`,
                gap: '3px',
                width: '100%',
              }}
            >
              {weeks.map((week, wi) => (
                <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: '3px', width: '100%' }}>
                  {week.map(day => {
                    const isSelected = selectedDay === day.date
                    const isHovered = hoveredDay?.date === day.date
                    return (
                      <div
                        key={day.date}
                        onMouseEnter={() => setHoveredDay(day)}
                        onMouseLeave={() => setHoveredDay(null)}
                        onClick={() => day.count > 0 && setSelectedDay(isSelected ? null : day.date)}
                        title={`${fmtDate(day.date)}: ${day.count} commits`}
                        style={{
                          width: '100%',
                          height: 'clamp(10px, 1.35vw, 15px)',
                          borderRadius: '3px',
                          cursor: day.count > 0 ? 'pointer' : 'default',
                          background: getColor(day.count),
                          border: isSelected
                            ? '2px solid var(--text-primary)'
                            : isHovered
                            ? '1px solid rgba(255, 255, 255, 0.7)'
                            : '1px solid rgba(255, 255, 255, 0.04)',
                          transition: 'all 0.12s ease',
                          transform: isSelected ? 'scale(1.25)' : isHovered ? 'scale(1.2)' : 'scale(1)',
                          zIndex: isSelected ? 5 : isHovered ? 4 : 1,
                          boxShadow: isSelected
                            ? '0 0 10px rgba(34, 197, 94, 0.5)'
                            : isHovered && day.count > 0
                            ? '0 0 8px rgba(34, 197, 94, 0.3)'
                            : 'none',
                        }}
                      />
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Detalhe do dia selecionado */}
        {selectedDay && (
          <div style={{ marginTop: '12px', background: 'color-mix(in srgb, var(--color-surface) 60%, black)', borderRadius: '6px', padding: '10px 14px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={14} color="var(--color-primary)" />
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{fmtDate(selectedDay)}</span>
                <span style={{ fontSize: '11px', color: 'var(--color-primary)', background: 'color-mix(in srgb, var(--color-primary) 15%, transparent)', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>
                  {selectedDayCommits.length} commits
                </span>
              </div>
              <button
                type="button"
                className="projects-btn"
                style={{ padding: '2px 6px', border: 'none', background: 'transparent' }}
                onClick={() => setSelectedDay(null)}
                aria-label="Fechar detalhe"
              >
                <X size={13} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '180px', overflowY: 'auto' }}>
              {selectedDayCommits.sort((a, b) => (b.time ?? '').localeCompare(a.time ?? '')).map((c, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '55px 120px 1fr 60px', gap: '8px', alignItems: 'center', background: 'var(--bg-primary)', padding: '4px 10px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                  <CommitTypeBadge type={c.type} size="xs" />
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>{c.repo}</span>
                  <span style={{ fontSize: '11.5px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.msg}</span>
                  {c.time && <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', textAlign: 'right', fontFamily: 'monospace' }}>{c.time}</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bloco 2: 3 Colunas Analíticas Preenchendo 1920x1080 */}
      <div className="projects-dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '12px', alignItems: 'stretch' }}>
        
        {/* Coluna 1: Resumo Mensal & Dias Mais Produtivos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="projects-dashboard-card" style={{ flex: 1, padding: '12px 14px' }}>
            <h2 className="projects-card-title" style={{ margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={14} color="var(--color-primary)" />
              <span>Resumo Mensal</span>
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', maxHeight: '240px', overflowY: 'auto', paddingRight: '4px' }}>
              {monthlyData.map(m => {
                const maxMonth = Math.max(1, ...monthlyData.map(x => x.commits))
                const barWidth = Math.min(100, Math.round((m.commits / maxMonth) * 100))
                return (
                  <div key={m.month} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{m.month}</span>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'baseline' }}>
                        <span style={{ color: 'var(--color-primary)', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{m.commits}</span>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{m.days}d atv</span>
                      </div>
                    </div>
                    <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ width: `${barWidth}%`, height: '100%', backgroundColor: 'var(--color-primary)', borderRadius: '2px' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {topDays.length > 0 && (
            <div className="projects-dashboard-card" style={{ padding: '12px 14px' }}>
              <h2 className="projects-card-title" style={{ margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Trophy size={14} color="#eab308" />
                <span>Dias Mais Produtivos</span>
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {topDays.map((d, i) => (
                  <div key={d.date} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-primary)', padding: '5px 8px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '10.5px', width: '18px', fontWeight: 700 }}>#{i + 1}</span>
                      <span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-primary)' }}>{fmtDate(d.date)}</span>
                    </div>
                    <span style={{ color: '#eab308', fontWeight: 700, fontSize: '11.5px', fontVariantNumeric: 'tabular-nums' }}>{d.count} commits</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Coluna 2: Distribuição por Dia da Semana (Seg-Dom) */}
        <div className="projects-dashboard-card" style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column' }}>
          <h2 className="projects-card-title" style={{ margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={14} color="var(--color-primary)" />
            <span>Distribuição por Dia da Semana</span>
          </h2>
          <p style={{ margin: '0 0 14px 0', fontSize: '11px', color: 'var(--text-muted)' }}>
            Volume acumulado de commits ao longo dos 365 dias
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, justifyContent: 'space-around' }}>
            {weekdayTotals.map(w => (
              <div key={w.label} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)', width: '35px' }}>{w.label}</span>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ color: 'var(--color-primary)', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                      {w.count.toLocaleString('pt-BR')}
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '10.5px', width: '28px', textAlign: 'right' }}>
                      {w.sharePct}%
                    </span>
                  </div>
                </div>
                <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${w.barPct}%`, height: '100%', background: 'linear-gradient(90deg, var(--color-primary), #38bdf8)', borderRadius: '3px' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Coluna 3: Ranking de Repositórios Mais Trabalhados */}
        <div className="projects-dashboard-card" style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column' }}>
          <h2 className="projects-card-title" style={{ margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FolderGit2 size={14} color="var(--color-primary)" />
            <span>Top Projetos no Período</span>
          </h2>
          <p style={{ margin: '0 0 12px 0', fontSize: '11px', color: 'var(--text-muted)' }}>
            Repositórios que mais receberam entregas no ano
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflowY: 'auto' }}>
            {topReposInPeriod.map((r, i) => (
              <div
                key={`${r.group}/${r.repo}`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  padding: '7px 10px',
                  background: 'color-mix(in srgb, var(--color-surface) 60%, black)',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1 }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '10.5px', fontWeight: 700, width: '16px' }}>#{i + 1}</span>
                    <span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.repo}
                    </span>
                    <span style={{ fontSize: '9.5px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: '4px' }}>
                      {r.group}
                    </span>
                  </div>
                  <span style={{ color: 'var(--color-primary)', fontWeight: 700, fontSize: '11.5px', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                    {r.count} commits
                  </span>
                </div>
                <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ width: `${r.pct}%`, height: '100%', backgroundColor: 'var(--color-primary)', borderRadius: '2px' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
