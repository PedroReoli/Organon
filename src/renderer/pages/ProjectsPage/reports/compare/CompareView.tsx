import React, { useMemo } from 'react'
import type { WeekReport } from '@types'

interface CompareViewProps {
  reports: WeekReport[]
  onSelectRepo: (group: string, name: string) => void
}

export const CompareView: React.FC<CompareViewProps> = ({ reports, onSelectRepo }) => {
  const comparison = useMemo(() => {
    if (reports.length < 2) return null
    const current = reports[0]
    const previous = reports[1]

    const currentMap = new Map(current.repos.map(r => [`${r.group}/${r.name}`, r]))
    const previousMap = new Map(previous.repos.map(r => [`${r.group}/${r.name}`, r]))

    const accelerated: { key: string; group: string; name: string; current: number; previous: number; diff: number }[] = []
    const decelerated: { key: string; group: string; name: string; current: number; previous: number; diff: number }[] = []
    const newRepos: { key: string; group: string; name: string; commits: number }[] = []
    const stoppedRepos: { key: string; group: string; name: string; lastWeek: number }[] = []

    for (const [key, repo] of currentMap) {
      const prev = previousMap.get(key)
      if (!prev) {
        if (repo.commitCount > 0) newRepos.push({ key, group: repo.group, name: repo.name, commits: repo.commitCount })
        continue
      }
      const diff = repo.commitCount - prev.commitCount
      if (diff > 0) accelerated.push({ key, group: repo.group, name: repo.name, current: repo.commitCount, previous: prev.commitCount, diff })
      else if (diff < 0) decelerated.push({ key, group: repo.group, name: repo.name, current: repo.commitCount, previous: prev.commitCount, diff })
    }

    for (const [key, repo] of previousMap) {
      if (!currentMap.has(key) || (currentMap.get(key)!.commitCount === 0 && repo.commitCount > 0)) {
        stoppedRepos.push({ key, group: repo.group, name: repo.name, lastWeek: repo.commitCount })
      }
    }

    accelerated.sort((a, b) => b.diff - a.diff)
    decelerated.sort((a, b) => a.diff - b.diff)

    return {
      current, previous, accelerated, decelerated, newRepos, stoppedRepos,
      totalDiff: current.summary.totalCommits - previous.summary.totalCommits,
    }
  }, [reports])

  if (!comparison) {
    return (
      <div className="projects-content-scroll" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: 'var(--text-muted)' }}>Necessário pelo menos 2 semanas de dados para comparar</span>
      </div>
    )
  }

  const { current, previous, accelerated, decelerated, newRepos, stoppedRepos, totalDiff } = comparison
  const diffColor = totalDiff > 0 ? 'var(--accent-green)' : totalDiff < 0 ? 'var(--accent-red)' : 'var(--text-secondary)'
  const diffSign = totalDiff > 0 ? '+' : ''

  const renderRow = (r: any, diffRender: React.ReactNode) => (
    <button key={r.key} type="button" onClick={() => onSelectRepo(r.group, r.name)}
      style={{ display: 'grid', gridTemplateColumns: '1fr 100px 100px', gap: '16px', alignItems: 'center', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '6px', padding: '12px 16px', cursor: 'pointer', textAlign: 'left', transition: 'border-color 0.2s', width: '100%' }}
      className="projects-commit-row">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{r.name}</span>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{r.group}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '12px', justifyContent: 'center' }}>
        {r.previous !== undefined ? (
          <>
            <span>{r.previous}</span>
            <span>→</span>
            <span style={{ color: 'var(--text-primary)' }}>{r.current}</span>
          </>
        ) : <span />}
      </div>
      <div style={{ textAlign: 'right', fontSize: '13px', fontWeight: 600 }}>
        {diffRender}
      </div>
    </button>
  )

  return (
    <div className="projects-content-scroll">
      <div className="projects-header">
        <div>
          <h1 className="projects-title">Comparativo Semanal</h1>
          <p className="projects-subtitle">
            {previous.period?.from}–{previous.period?.to} → {current.period?.from}–{current.period?.to}
          </p>
        </div>
      </div>

      <div className="projects-stats-bar" style={{ marginBottom: '32px' }}>
        <div className="projects-stat-card">
          <span className="projects-stat-value">{previous.summary.totalCommits}</span>
          <span className="projects-stat-label">Semana anterior</span>
        </div>
        <div className="projects-stat-card">
          <span className="projects-stat-value">{current.summary.totalCommits}</span>
          <span className="projects-stat-label">Semana atual</span>
        </div>
        <div className="projects-stat-card">
          <span className="projects-stat-value" style={{ color: diffColor }}>{diffSign}{totalDiff}</span>
          <span className="projects-stat-label">Diferença</span>
        </div>
      </div>

      <div className="projects-dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        {accelerated.length > 0 && (
          <div className="projects-dashboard-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 className="projects-card-title" style={{ color: 'var(--accent-green)' }}>▲ Aceleraram ({accelerated.length})</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {accelerated.slice(0, 15).map(r => renderRow(r, <span style={{ color: 'var(--accent-green)' }}>+{r.diff}</span>))}
            </div>
          </div>
        )}

        {decelerated.length > 0 && (
          <div className="projects-dashboard-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 className="projects-card-title" style={{ color: 'var(--accent-red)' }}>▼ Desaceleraram ({decelerated.length})</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {decelerated.slice(0, 15).map(r => renderRow(r, <span style={{ color: 'var(--accent-red)' }}>{r.diff}</span>))}
            </div>
          </div>
        )}

        {newRepos.length > 0 && (
          <div className="projects-dashboard-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 className="projects-card-title" style={{ color: 'var(--accent-primary)' }}>★ Novos esta semana ({newRepos.length})</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {newRepos.map(r => renderRow(r, <span style={{ color: 'var(--accent-primary)' }}>{r.commits} commits</span>))}
            </div>
          </div>
        )}

        {stoppedRepos.length > 0 && (
          <div className="projects-dashboard-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 className="projects-card-title" style={{ color: 'var(--accent-yellow)' }}>⏸ Pararam esta semana ({stoppedRepos.length})</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {stoppedRepos.map(r => renderRow(r, <span style={{ color: 'var(--accent-yellow)' }}>era {r.lastWeek}/sem</span>))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
