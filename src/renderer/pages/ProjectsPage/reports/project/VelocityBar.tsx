import React from 'react'

interface VelocityBarProps {
  commitCount: number
  weeklyAverage: number
}

export const VelocityBar: React.FC<VelocityBarProps> = ({ commitCount, weeklyAverage }) => {
  const max = Math.max(commitCount, weeklyAverage, 1)
  const thisPct = (commitCount / max) * 100
  const avgPct = (weeklyAverage / max) * 100
  const delta = weeklyAverage > 0 ? Math.round(((commitCount - weeklyAverage) / weeklyAverage) * 100) : null

  return (
    <div className="projects-dashboard-card">
      <h3 className="projects-card-title" style={{ display: 'flex', justifyContent: 'space-between' }}>
        Velocidade
        {delta !== null && (
          <span style={{ color: delta >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
            {delta >= 0 ? '+' : ''}{delta}%
          </span>
        )}
      </h3>
      <div className="projects-top-list">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span className="projects-top-name" style={{ width: '100px' }}>Esta semana</span>
          <div className="projects-top-track">
            <div className="projects-top-fill" style={{ width: `${Math.max(4, thisPct)}%`, backgroundColor: 'var(--accent-primary)' }} />
          </div>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', width: '32px', textAlign: 'right' }}>{commitCount}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span className="projects-top-name" style={{ width: '100px' }}>Média</span>
          <div className="projects-top-track">
            <div className="projects-top-fill" style={{ width: `${Math.max(4, avgPct)}%`, backgroundColor: 'var(--text-secondary)' }} />
          </div>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', width: '32px', textAlign: 'right' }}>{weeklyAverage}</span>
        </div>
      </div>
    </div>
  )
}
