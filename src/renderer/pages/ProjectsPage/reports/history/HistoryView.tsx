import React from 'react'
import type { WeekReport } from '@types'
import { WeekCard } from './WeekCard'
import { TotalCommitsLine } from './TotalCommitsLine'

interface HistoryViewProps {
  reports: WeekReport[]
  onBack: () => void
  onSelectReport: (index: number) => void
}

export const HistoryView: React.FC<HistoryViewProps> = ({ reports, onBack, onSelectReport }) => (
  <div className="projects-content-scroll">
    <div className="projects-header">
      <div>
        <button type="button" className="projects-btn" onClick={onBack} style={{ marginBottom: '8px', padding: '4px 8px', border: 'none', background: 'transparent', paddingLeft: 0 }}>← Voltar</button>
        <h1 className="projects-title">Histórico</h1>
      </div>
    </div>

    <TotalCommitsLine reports={reports} />

    <div className="projects-dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
      {reports.map((r, i) => (
        <WeekCard key={r.date} report={r} onSelect={() => onSelectReport(i)} />
      ))}
    </div>
  </div>
)
