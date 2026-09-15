import React from 'react'
import type { RepoReport } from '@types'
import { VelocityBar } from './VelocityBar'
import { CommitTimeline } from './CommitTimeline'
import { TopFilesChart } from './TopFilesChart'
import { TodoSection } from './TodoSection'
import { BranchList } from './BranchList'

interface ProjectViewProps {
  repo: RepoReport
  onBack: () => void
}

export const ProjectView: React.FC<ProjectViewProps> = ({ repo, onBack }) => (
  <div className="projects-content-scroll">
    <div className="projects-header">
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <button type="button" className="projects-btn" onClick={onBack} style={{ alignSelf: 'flex-start', marginBottom: '16px', padding: '4px 8px', border: 'none', background: 'transparent', paddingLeft: 0 }}>
          ← Voltar
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span className="projects-title">{repo.group} / {repo.name}</span>
          <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '12px', background: repo.status === 'ativo' ? 'var(--accent-green)' : 'var(--text-secondary)', color: '#000', fontWeight: 600, textTransform: 'uppercase' }}>{repo.status}</span>
        </div>
      </div>
    </div>

    <div className="projects-dashboard-grid" style={{ gridTemplateColumns: '1fr 2fr', gap: '24px', alignItems: 'start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <VelocityBar commitCount={repo.commitCount} weeklyAverage={repo.weeklyAverage} />
        <TopFilesChart topFiles={repo.topFiles ?? []} />
        <BranchList branches={repo.branches ?? []} />
        <TodoSection todos={repo.todos ?? []} commits={repo.commits ?? []} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <CommitTimeline commits={repo.commits ?? []} />
      </div>
    </div>
  </div>
)
