import React, { useState, useMemo } from 'react'
import { AlertTriangle, Zap } from 'lucide-react'
import type { WeekReport, GeneralReport } from '@types'

interface GoalsViewProps {
  reports: WeekReport[]
  general: GeneralReport | null
}

interface RepoGoal {
  group: string
  name: string
  weeklyTarget: number
}

export const GoalsView: React.FC<GoalsViewProps> = ({ reports, general }) => {
  const [goals] = useState<RepoGoal[]>([])
  const [globalTarget, setGlobalTarget] = useState(10)

  const repoStatus = useMemo(() => {
    if (!reports.length) return []
    const latest = reports[0]
    const repos = (general?.repos ?? (latest.repos || []).map((r: any) => ({
      group: r.group, name: r.name, status: r.status,
      weeklyAverage: r.commitCount, daysAgo: r.daysAgo,
      streak: 0, velocity: 0, lastCommitMsg: r.lastCommitMsg,
      lastCommitDate: r.lastCommitDate, commitsByWeek: [], totalCommits: r.commitCount,
    }))) as any[]

    return repos.map((r: any) => {
      const goal = goals.find((g: any) => g.group === r.group && g.name === r.name)
      const target = goal?.weeklyTarget ?? globalTarget
      const current = (latest.repos || []).find((lr: any) => lr.group === r.group && lr.name === r.name)?.commitCount ?? 0
      const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0
      const status = pct >= 100 ? 'achieved' : pct >= 50 ? 'progress' : 'behind'
      return { group: r.group, name: r.name, current, target, pct, status, daysAgo: r.daysAgo }
    }).sort((a: any, b: any) => b.pct - a.pct)
  }, [reports, general, goals, globalTarget])

  const achieved = repoStatus.filter((r: any) => r.status === 'achieved').length
  const inProgress = repoStatus.filter((r: any) => r.status === 'progress').length
  const behind = repoStatus.filter((r: any) => r.status === 'behind').length

  const alerts = useMemo(() => {
    const list: { type: 'danger' | 'warning'; msg: string }[] = []
    for (const r of repoStatus) {
      if (r.daysAgo > 14 && r.status !== 'achieved') {
        list.push({ type: 'danger', msg: `${r.group}/${r.name} sem commits há ${r.daysAgo} dias` })
      }
      if (r.pct < 25 && r.target > 0) {
        list.push({ type: 'warning', msg: `${r.name} está em ${r.pct}% da meta (${r.current}/${r.target})` })
      }
    }
    return list.slice(0, 10)
  }, [repoStatus])

  return (
    <div className="projects-content-scroll">
      <div className="projects-header">
        <div>
          <h1 className="projects-title">Metas & Alertas</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Meta global (commits/sem):</label>
          <input
            type="number"
            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text-primary)', padding: '2px 6px', width: '60px', fontSize: '11px', outline: 'none' }}
            value={globalTarget}
            min={1}
            onChange={e => setGlobalTarget(Math.max(1, parseInt(e.target.value) || 1))}
          />
        </div>
      </div>

      <div className="projects-stats-compact-bar" style={{ marginBottom: 6 }}>
        <div className="projects-stat-pill pill-green">
          <span className="projects-stat-pill-label">Meta atingida:</span>
          <span className="projects-stat-pill-value">{achieved}</span>
        </div>
        <div className="projects-stat-pill pill-amber">
          <span className="projects-stat-pill-label">Em progresso:</span>
          <span className="projects-stat-pill-value">{inProgress}</span>
        </div>
        <div className="projects-stat-pill pill-red">
          <span className="projects-stat-pill-label">Abaixo da meta:</span>
          <span className="projects-stat-pill-value">{behind}</span>
        </div>
        <div className="projects-stat-pill pill-blue">
          <span className="projects-stat-pill-label">Alvo:</span>
          <span className="projects-stat-pill-value">{globalTarget}c/sem</span>
        </div>
      </div>

      <div className="projects-dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '12px', alignItems: 'start' }}>
        {alerts.length > 0 && (
          <div className="projects-dashboard-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h2 className="projects-card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertTriangle size={15} color="var(--accent-red)" />
              Alertas de Metas ({alerts.length})
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '480px', overflowY: 'auto', paddingRight: '2px' }}>
              {alerts.map((a, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', background: a.type === 'danger' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(234, 179, 8, 0.1)', border: `1px solid ${a.type === 'danger' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(234, 179, 8, 0.25)'}`, borderRadius: '6px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', color: a.type === 'danger' ? 'var(--accent-red)' : 'var(--accent-yellow)', flexShrink: 0 }}>
                    {a.type === 'danger' ? <AlertTriangle size={14} /> : <Zap size={14} />}
                  </span>
                  <span style={{ fontSize: '11.5px', color: 'var(--text-primary)', fontWeight: 500 }}>{a.msg}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="projects-dashboard-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="projects-card-title" style={{ margin: 0 }}>Progresso por Repositório</h2>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
              {repoStatus.length} projetos
            </span>
          </div>
          <div className="projects-top-list" style={{ gap: '6px', maxHeight: '480px', overflowY: 'auto', paddingRight: '4px' }}>
            {repoStatus.map((r: any) => {
              const barColor = r.status === 'achieved' ? 'var(--accent-green)' : r.status === 'progress' ? 'var(--accent-yellow)' : 'var(--accent-red)'
              return (
                <div key={`${r.group}/${r.name}`} style={{ display: 'grid', gridTemplateColumns: '140px 80px 1fr 45px 55px', gap: '8px', alignItems: 'center', padding: '4px 6px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.02)' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.name}>{r.name}</span>
                  <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.group}</span>
                  <div className="projects-top-track" style={{ height: '4px' }}>
                    <div className="projects-top-fill" style={{ width: `${r.pct}%`, background: barColor }} />
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: barColor, textAlign: 'right', fontFamily: 'monospace' }}>{r.pct}%</span>
                  <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)', textAlign: 'right', fontFamily: 'monospace' }}>{r.current}/{r.target}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
