import React from 'react'
import type { WeekSummary } from '@types'

interface SummaryCardsProps {
  summary: WeekSummary
}

const cards: { key: keyof WeekSummary; label: string; pillClass?: string }[] = [
  { key: 'totalRepos', label: 'Repositórios' },
  { key: 'activeThisWeek', label: 'Ativos', pillClass: 'pill-green' },
  { key: 'stoppedRepos', label: 'Parados', pillClass: 'pill-red' },
  { key: 'totalCommits', label: 'Commits', pillClass: 'pill-blue' },
  { key: 'totalTodos', label: 'TODOs' },
  { key: 'totalBadCommits', label: 'Bad Commits', pillClass: 'pill-red' },
]

export const SummaryCards: React.FC<SummaryCardsProps> = ({ summary }) => (
  <div className="projects-metrics-ribbon">
    {cards.map(c => {
      const val = summary[c.key] ?? 0
      if (c.key === 'totalBadCommits' && val === 0) return null
      return (
        <div key={c.key} className={`projects-metric-chip ${c.pillClass || ''}`}>
          <span className="projects-metric-label">{c.label}</span>
          <span className="projects-metric-value">{val}</span>
        </div>
      )
    })}
  </div>
)
