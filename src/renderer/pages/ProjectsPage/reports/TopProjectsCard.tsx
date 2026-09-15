import React from 'react'

export interface TopProjectsCardProps {
  projects: Array<{ repo: string; commits: number; color: string }>
}

export const TopProjectsCard: React.FC<TopProjectsCardProps> = ({ projects }) => {
  if (!projects || projects.length === 0) return null

  const maxCommits = Math.max(...projects.map(p => p.commits), 1)

  return (
    <div className="projects-dashboard-card">
      <h3 className="projects-card-title">Top 5 Projetos (Média/Semana)</h3>
      <div className="projects-top-list">
        {projects.slice(0, 5).map(p => {
          const pct = (p.commits / maxCommits) * 100
          return (
            <div key={p.repo} className="projects-top-item">
              <div className="projects-top-header">
                <span className="projects-top-name" title={p.repo}>{p.repo}</span>
                <span className="projects-top-value">{p.commits}</span>
              </div>
              <div className="projects-top-track">
                <div className="projects-top-fill" style={{ width: `${pct}%`, backgroundColor: p.color }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
