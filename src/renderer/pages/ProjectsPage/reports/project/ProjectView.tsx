import React from 'react'
import type { RepoReport } from '@types'
import {
  ArrowLeft,
  GitCommit,
  TrendingUp,
  GitBranch,
  CheckSquare,
  Clock,
  Flame,
  Activity,
  FolderGit2,
} from 'lucide-react'
import { VelocityBar } from './VelocityBar'
import { CommitTimeline } from './CommitTimeline'
import { TopFilesChart } from './TopFilesChart'
import { TodoSection } from './TodoSection'
import { BranchList } from './BranchList'

interface ProjectViewProps {
  repo: RepoReport
  onBack: () => void
}

export const ProjectView: React.FC<ProjectViewProps> = ({ repo, onBack }) => {
  const statusColor =
    repo.status === 'ativo'
      ? 'var(--accent-green, #22c55e)'
      : repo.status === 'reativado'
        ? 'var(--color-primary, #818cf8)'
        : 'var(--text-muted, #94a3b8)'

  return (
    <div className="projects-content-scroll">
      {/* Header do Projeto */}
      <div className="projects-header" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            type="button"
            className="projects-btn"
            onClick={onBack}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            <ArrowLeft size={14} /> Voltar
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FolderGit2 size={20} color="var(--color-primary, #818cf8)" />
            <span className="projects-title" style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>
              {repo.group ? `${repo.group} / ` : ''}{repo.name}
            </span>
            <span
              style={{
                fontSize: '11px',
                padding: '2px 8px',
                borderRadius: '12px',
                background: repo.status === 'ativo' ? 'rgba(34, 197, 94, 0.15)' : repo.status === 'reativado' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                border: `1px solid ${statusColor}`,
                color: statusColor,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              {repo.status}
            </span>
          </div>
        </div>
      </div>

      {/* Metrics Ribbon (High-craft KPI strip for 1920x1080) */}
      <div className="projects-metrics-ribbon" style={{ marginBottom: 14 }}>
        <div className="projects-metric-item">
          <div className="projects-metric-icon" style={{ background: 'rgba(99, 102, 241, 0.12)', color: 'var(--color-primary, #818cf8)' }}>
            <GitCommit size={15} />
          </div>
          <div className="projects-metric-body">
            <span className="projects-metric-val">{repo.commitCount}</span>
            <span className="projects-metric-lbl">Commits Esta Semana</span>
          </div>
        </div>

        <div className="projects-metric-item">
          <div className="projects-metric-icon" style={{ background: 'rgba(34, 197, 94, 0.12)', color: 'var(--accent-green, #22c55e)' }}>
            <TrendingUp size={15} />
          </div>
          <div className="projects-metric-body">
            <span className="projects-metric-val">{repo.weeklyAverage}c/sem</span>
            <span className="projects-metric-lbl">Média Semanal</span>
          </div>
        </div>

        <div className="projects-metric-item">
          <div className="projects-metric-icon" style={{ background: 'rgba(56, 189, 248, 0.12)', color: 'var(--accent-blue, #38bdf8)' }}>
            <Activity size={15} />
          </div>
          <div className="projects-metric-body">
            <span className="projects-metric-val">
              {repo.velocity ? `×${repo.velocity.toFixed(1)}` : '1.0×'}
            </span>
            <span className="projects-metric-lbl">Velocidade</span>
          </div>
        </div>

        <div className="projects-metric-item">
          <div className="projects-metric-icon" style={{ background: 'rgba(245, 158, 11, 0.12)', color: 'var(--accent-yellow, #f59e0b)' }}>
            <Flame size={15} />
          </div>
          <div className="projects-metric-body">
            <span className="projects-metric-val">
              {repo.streak ? `${repo.streak}d` : '0d'}
            </span>
            <span className="projects-metric-lbl">Streak Atual</span>
          </div>
        </div>

        <div className="projects-metric-item">
          <div className="projects-metric-icon" style={{ background: 'rgba(168, 85, 247, 0.12)', color: '#c084fc' }}>
            <GitBranch size={15} />
          </div>
          <div className="projects-metric-body">
            <span className="projects-metric-val">{repo.branches?.length ?? repo.branchCount ?? 0}</span>
            <span className="projects-metric-lbl">Branches</span>
          </div>
        </div>

        <div className="projects-metric-item">
          <div className="projects-metric-icon" style={{ background: 'rgba(239, 68, 68, 0.12)', color: 'var(--accent-red, #ef4444)' }}>
            <CheckSquare size={15} />
          </div>
          <div className="projects-metric-body">
            <span className="projects-metric-val">{repo.todos?.length ?? repo.todoCount ?? 0}</span>
            <span className="projects-metric-lbl">TODOs / Tarefas</span>
          </div>
        </div>

        <div className="projects-metric-item">
          <div className="projects-metric-icon" style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-muted, #94a3b8)' }}>
            <Clock size={15} />
          </div>
          <div className="projects-metric-body">
            <span className="projects-metric-val">
              {repo.daysAgo === 0 ? 'Hoje' : `${repo.daysAgo}d`}
            </span>
            <span className="projects-metric-lbl">Último Commit</span>
          </div>
        </div>
      </div>

      {/* 3 Balanced Columns (or 2 columns on intermediate screens) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '14px',
          alignItems: 'start',
          width: '100%',
        }}
      >
        {/* Coluna 1: Velocidade & Arquivos Mais Alterados */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <VelocityBar commitCount={repo.commitCount} weeklyAverage={repo.weeklyAverage} />
          <TopFilesChart topFiles={repo.topFiles ?? []} />
        </div>

        {/* Coluna 2: Branches & TODOs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <BranchList branches={repo.branches ?? []} />
          <TodoSection todos={repo.todos ?? []} commits={repo.commits ?? []} />
        </div>

        {/* Coluna 3: Linha do Tempo de Commits */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <CommitTimeline commits={repo.commits ?? []} />
        </div>
      </div>
    </div>
  )
}
