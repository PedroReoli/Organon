import React, { useState, useMemo } from 'react'
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
  const [goals, setGoals] = useState<RepoGoal[]>([])
  const [globalTarget, setGlobalTarget] = useState(10)

  const repoStatus = useMemo(() => {
    if (!reports.length) return []
    const latest = reports[0]
    const repos = general?.repos ?? latest.repos.map(r => ({
      group: r.group, name: r.name, status: r.status,
      weeklyAverage: r.commitCount, daysAgo: r.daysAgo,
      streak: 0, velocity: 0, lastCommitMsg: r.lastCommitMsg,
      lastCommitDate: r.lastCommitDate, commitsByWeek: [], totalCommits: r.commitCount,
    }))

    return repos.map(r => {
      const goal = goals.find(g => g.group === r.group && g.name === r.name)
      const target = goal?.weeklyTarget ?? globalTarget
      const current = latest.repos.find(lr => lr.group === r.group && lr.name === r.name)?.commitCount ?? 0
      const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0
      const status = pct >= 100 ? 'achieved' : pct >= 50 ? 'progress' : 'behind'
      return { group: r.group, name: r.name, current, target, pct, status, daysAgo: r.daysAgo }
    }).sort((a, b) => b.pct - a.pct)
  }, [reports, general, goals, globalTarget])

  const achieved = repoStatus.filter(r => r.status === 'achieved').length
  const inProgress = repoStatus.filter(r => r.status === 'progress').length
  const behind = repoStatus.filter(r => r.status === 'behind').length

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Meta global (commits/sem):</label>
          <input
            type="number"
            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-primary)', padding: '6px 12px', width: '80px', outline: 'none' }}
            value={globalTarget}
            min={1}
            onChange={e => setGlobalTarget(Math.max(1, parseInt(e.target.value) || 1))}
          />
        </div>
      </div>

      <div className="projects-stats-bar" style={{ marginBottom: '32px' }}>
        <div className="projects-stat-card">
          <span className="projects-stat-value" style={{ color: 'var(--accent-green)' }}>{achieved}</span>
          <span className="projects-stat-label">Meta atingida</span>
        </div>
        <div className="projects-stat-card">
          <span className="projects-stat-value" style={{ color: 'var(--accent-yellow)' }}>{inProgress}</span>
          <span className="projects-stat-label">Em progresso</span>
        </div>
        <div className="projects-stat-card">
          <span className="projects-stat-value" style={{ color: 'var(--accent-red)' }}>{behind}</span>
          <span className="projects-stat-label">Abaixo</span>
        </div>
      </div>

      <div className="projects-dashboard-grid" style={{ gridTemplateColumns: '1fr', gap: '24px' }}>
        {alerts.length > 0 && (
          <div className="projects-dashboard-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 className="projects-card-title">Alertas</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {alerts.map((a, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: a.type === 'danger' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(234, 179, 8, 0.1)', border: `1px solid ${a.type === 'danger' ? 'var(--accent-red)' : 'var(--accent-yellow)'}`, borderRadius: '6px' }}>
                  <span style={{ fontSize: '16px', color: a.type === 'danger' ? 'var(--accent-red)' : 'var(--accent-yellow)' }}>{a.type === 'danger' ? '⚠' : '⚡'}</span>
                  <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>{a.msg}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="projects-dashboard-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h2 className="projects-card-title">Progresso por repositório</h2>
          <div className="projects-top-list" style={{ gap: '16px' }}>
            {repoStatus.map(r => {
              const barColor = r.status === 'achieved' ? 'var(--accent-green)' : r.status === 'progress' ? 'var(--accent-yellow)' : 'var(--accent-red)'
              return (
                <div key={`${r.group}/${r.name}`} style={{ display: 'grid', gridTemplateColumns: '140px 100px 1fr 60px 80px', gap: '16px', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.group}</span>
                  <div className="projects-top-track">
                    <div className="projects-top-fill" style={{ width: `${r.pct}%`, background: barColor }} />
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: barColor, textAlign: 'right' }}>{r.pct}%</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'right' }}>{r.current}/{r.target}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
