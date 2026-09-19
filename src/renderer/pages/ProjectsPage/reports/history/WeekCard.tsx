import React from 'react'
import { Trophy } from 'lucide-react'
import type { WeekReport } from '@types'

interface WeekCardProps {
  report: WeekReport
  onSelect: () => void
}

export const WeekCard: React.FC<WeekCardProps> = ({ report, onSelect }) => {
  const topRepo = [...report.repos].sort((a, b) => b.commitCount - a.commitCount)[0]

  return (
    <button type="button" className="projects-dashboard-card projects-commit-row" onClick={onSelect} style={{ display: 'flex', flexDirection: 'column', gap: '6px', border: '1px solid var(--border)', background: 'var(--bg-primary)', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', textAlign: 'left', transition: 'border-color 0.2s', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-primary)' }}>{report.weekLabel}</span>
        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{report.date}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
          <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>{report.summary.totalCommits}</span>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>commits</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>{report.summary.activeThisWeek}</span>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>ativos</span>
        </div>
      </div>
      {topRepo && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: '4px' }}>
          <Trophy size={11} style={{ color: 'var(--accent-yellow)' }} />
          <span>{topRepo.name} ({topRepo.commitCount})</span>
        </div>
      )}
    </button>
  )
}
