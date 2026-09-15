import React from 'react'
import { FolderGit2, Activity, Clock, Play } from 'lucide-react'
import type { GeneralRepoEntry } from '@types'

export interface RepoCardProps {
  repo: GeneralRepoEntry
  onClick: () => void
}

function fmtDaysAgo(d: number): string {
  if (d === 0) return 'hoje'
  if (d === 1) return 'ontem'
  if (d < 7) return `${d} dias atrás`
  if (d < 30) return `${Math.floor(d / 7)} sem atrás`
  return `${Math.floor(d / 30)} meses atrás`
}

export const RepoCard: React.FC<RepoCardProps> = ({ repo, onClick }) => {
  const isStopped = repo.status === 'parado'
  const maxVelocity = 2.0
  const velocityColor = repo.velocity > 1.5 ? 'var(--accent-green)' : repo.velocity < 0.5 ? 'var(--accent-red)' : 'var(--text-secondary)'

  return (
    <div className="projects-repo-card" onClick={onClick} style={{ cursor: 'pointer' }}>
      <div className="projects-repo-header">
        <div className="projects-repo-info">
          <span className="projects-repo-name">
            <FolderGit2 size={16} className="projects-repo-stat-icon" />
            {repo.name}
          </span>
          <span className="projects-repo-group">{repo.group}</span>
        </div>
        <div className="projects-repo-actions">
          <button type="button" className="projects-repo-btn" title="Abrir Dashboard do Projeto">
            <Play size={14} />
          </button>
        </div>
      </div>

      <div className="projects-repo-stats">
        <div className="projects-repo-stat" title="Commits por semana (média)">
          <Activity size={14} className="projects-repo-stat-icon" />
          <span>{repo.weeklyAverage} /sem</span>
        </div>
        <div className="projects-repo-stat" title="Último commit">
          <Clock size={14} className="projects-repo-stat-icon" />
          <span style={{ color: isStopped ? 'var(--accent-red)' : 'inherit' }}>
            {fmtDaysAgo(repo.daysAgo)}
          </span>
        </div>
      </div>

      {repo.commitsByWeek && repo.commitsByWeek.length > 1 && (
        <div style={{ display: 'flex', gap: '2px', height: '16px', alignItems: 'flex-end', marginTop: '8px' }}>
          {(() => {
            const max = Math.max(1, ...repo.commitsByWeek)
            return repo.commitsByWeek.slice(0, 12).reverse().map((v, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: `${Math.max(10, (v / max) * 100)}%`,
                  background: i === repo.commitsByWeek.slice(0, 12).length - 1 ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                  borderRadius: '1px'
                }}
              />
            ))
          })()}
        </div>
      )}
    </div>
  )
}