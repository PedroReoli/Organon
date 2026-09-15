import React from 'react'
import type { WeekSummary } from '@types'

interface SummaryCardsProps {
  summary: WeekSummary
}

const cards: { key: keyof WeekSummary; label: string; danger?: boolean }[] = [
  { key: 'totalRepos',      label: 'Repositórios' },
  { key: 'activeThisWeek', label: 'Ativos' },
  { key: 'stoppedRepos',   label: 'Parados' },
  { key: 'totalCommits',   label: 'Commits' },
  { key: 'totalTodos',     label: 'TODOs' },
  { key: 'totalBadCommits', label: 'Bad commits', danger: true },
]

export const SummaryCards: React.FC<SummaryCardsProps> = ({ summary }) => (
  <div className="projects-stats-bar" style={{ marginTop: '24px' }}>
    {cards.map(c => {
      const val = summary[c.key] ?? 0
      if (c.danger && val === 0) return null
      const isDanger = c.danger && val > 0
      return (
        <div key={c.key} className={`projects-stat-card ${isDanger ? 'stat-red' : ''}`}>
          <span className="projects-stat-value" style={{ color: isDanger ? 'var(--accent-red)' : 'inherit' }}>{val}</span>
          <span className="projects-stat-label">{c.label}</span>
        </div>
      )
    })}
  </div>
)
