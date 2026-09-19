import React from 'react'
import type { RepoReport } from '@types'

interface VelocityPanelProps {
  repos: RepoReport[]
  onSelect: (repo: RepoReport) => void
}

export const VelocityPanel: React.FC<VelocityPanelProps> = ({ repos, onSelect }) => {
  const active = repos
    .filter(r => r.commitCount > 0 && r.weeklyAverage > 0 && r.velocity != null)
    .sort((a, b) => (b.velocity ?? 0) - (a.velocity ?? 0))
    .slice(0, 4)

  if (active.length === 0) return (
    <div className="projects-dashboard-card">
      <h3 className="projects-card-title">Velocity</h3>
      <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Sem dados de velocidade</span>
    </div>
  )

  return (
    <div className="projects-dashboard-card">
      <h3 className="projects-card-title">Velocity</h3>
      <div className="projects-top-list" style={{ gap: '6px' }}>
        {active.map(r => {
          const v = r.velocity ?? 1
          const color = v >= 1.5 ? '#22c55e' : v >= 0.8 ? '#818cf8' : v >= 0.5 ? '#f59e0b' : '#ef4444'
          const pct = Math.min(100, (v / 2) * 100)
          return (
            <button
              key={`${r.group}/${r.name}`}
              type="button"
              onClick={() => onSelect(r)}
              style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', width: '100%' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '12px' }}>
                <span className="projects-top-name" title={`${r.group}/${r.name}`} style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{r.name}</span>
                <span style={{ color, fontWeight: 600, fontSize: '11.5px', fontFamily: 'monospace' }}>×{v.toFixed(1)}</span>
              </div>
              <div className="projects-top-track" style={{ position: 'relative' }}>
                <div className="projects-top-fill" style={{ width: `${pct}%`, backgroundColor: color }} />
                <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: '1px', background: 'rgba(255,255,255,0.15)' }} />
              </div>
            </button>
          )
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', marginTop: '8px', opacity: 0.9 }}>
        <span style={{ color: '#ef4444' }}>×0.5 lento</span>
        <span style={{ color: '#818cf8' }}>×1.0 normal</span>
        <span style={{ color: '#22c55e' }}>×1.5+ rápido</span>
      </div>
    </div>
  )
}
