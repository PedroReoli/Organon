import React from 'react'
import { Flame } from 'lucide-react'
import type { RepoReport } from '@types'

interface StreakPanelProps {
  repos: RepoReport[]
  onSelect: (repo: RepoReport) => void
}

export const StreakPanel: React.FC<StreakPanelProps> = ({ repos, onSelect }) => {
  const ranked = repos
    .filter(r => (r.streak ?? 0) > 0)
    .sort((a, b) => (b.streak ?? 0) - (a.streak ?? 0))
    .slice(0, 8)

  const max = ranked[0]?.streak ?? 1

  if (ranked.length === 0) return (
    <div className="projects-dashboard-card">
      <h3 className="projects-card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Flame size={16} style={{ color: 'var(--accent-yellow)' }} /> Streak
      </h3>
      <span style={{ color: 'var(--text-muted)' }}>Sem streaks ativos</span>
    </div>
  )

  return (
    <div className="projects-dashboard-card">
      <h3 className="projects-card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Flame size={16} style={{ color: 'var(--accent-yellow)' }} /> Streak
      </h3>
      <div className="projects-top-list" style={{ gap: '12px' }}>
        {ranked.map((r, i) => {
          const s = r.streak ?? 0
          const pct = Math.max(4, (s / max) * 100)
          const color = s >= 7 ? 'var(--accent-yellow)' : s >= 3 ? 'var(--accent-primary)' : 'var(--text-secondary)'
          return (
            <button key={`${r.group}/${r.name}`} type="button"
              onClick={() => onSelect(r)}
              style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '13px' }}>
                <span className="projects-top-name" style={{ display: 'flex', alignItems: 'center', gap: '6px' }} title={`${r.group}/${r.name}`}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '11px', width: '16px' }}>#{i + 1}</span>
                  {r.name}
                </span>
                <span style={{ color, fontWeight: 500 }}>{s}d</span>
              </div>
              <div className="projects-top-track">
                <div className="projects-top-fill" style={{ width: `${pct}%`, backgroundColor: color }} />
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
