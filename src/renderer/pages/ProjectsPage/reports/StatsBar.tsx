import React from 'react'
import { Flame } from 'lucide-react'
import type { GeneralRepoEntry } from '@types'
import '../../../styles/features/reports/projects-compact.css'

export interface StatsData {
  totalRepos: number
  activeRepos: number
  stoppedRepos: number
  totalCommits: number
  topStreak: Pick<GeneralRepoEntry, 'name' | 'streak'> | null
}

export interface StatsBarProps {
  stats: StatsData
  compact?: boolean
}

export const StatsBar: React.FC<StatsBarProps> = ({ stats, compact = true }) => {
  if (compact) {
    return (
      <div className="projects-stats-compact-bar">
        <div className="projects-stat-pill">
          <span className="projects-stat-pill-value">{stats.totalRepos}</span>
          <span className="projects-stat-pill-label">Repositórios</span>
        </div>

        <div className="projects-stat-pill pill-green">
          <span className="projects-stat-pill-value">{stats.activeRepos}</span>
          <span className="projects-stat-pill-label">Ativos (30d)</span>
        </div>

        <div className="projects-stat-pill pill-red">
          <span className="projects-stat-pill-value">{stats.stoppedRepos}</span>
          <span className="projects-stat-pill-label">Parados</span>
        </div>

        <div className="projects-stat-pill pill-blue">
          <span className="projects-stat-pill-value">
            {stats.totalCommits.toLocaleString('pt-BR')}
          </span>
          <span className="projects-stat-pill-label">Commits</span>
        </div>

        {stats.topStreak &&
          typeof stats.topStreak.streak === 'number' &&
          stats.topStreak.streak > 0 && (
            <div className="projects-stat-pill pill-amber">
              <Flame size={12} color="#f59e0b" />
              <span className="projects-stat-pill-value">{stats.topStreak.streak}d</span>
              <span className="projects-stat-pill-label">
                Streak ({stats.topStreak.name})
              </span>
            </div>
          )}
      </div>
    )
  }

  return (
    <div className="projects-stats-bar">
      <div className="projects-stat-card">
        <span className="projects-stat-value">{stats.totalRepos}</span>
        <span className="projects-stat-label">Repositórios</span>
      </div>

      <div className="projects-stat-card stat-green">
        <span className="projects-stat-value">{stats.activeRepos}</span>
        <span className="projects-stat-label">Ativos (30d)</span>
      </div>

      <div className="projects-stat-card stat-red">
        <span className="projects-stat-value">{stats.stoppedRepos}</span>
        <span className="projects-stat-label">Parados</span>
      </div>

      <div className="projects-stat-card stat-blue">
        <span className="projects-stat-value">
          {stats.totalCommits.toLocaleString('pt-BR')}
        </span>
        <span className="projects-stat-label">Commits Totais</span>
      </div>

      {stats.topStreak &&
        typeof stats.topStreak.streak === 'number' &&
        stats.topStreak.streak > 0 && (
          <div className="projects-stat-card stat-yellow">
            <span className="projects-stat-value">{stats.topStreak.streak}d</span>
            <span className="projects-stat-label">
              Maior Streak ({stats.topStreak.name})
            </span>
          </div>
        )}
    </div>
  )
}