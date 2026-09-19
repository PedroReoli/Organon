import React from 'react'
import { X, Trophy } from 'lucide-react'
import type { WeekReport } from '@types'
import { getCommitTypeColor } from '../constants/commitTypes'

interface AllWeeksPanelProps {
  reports: WeekReport[]
  onSelectWeek: (index: number) => void
  onClose: () => void
}

export const AllWeeksPanel: React.FC<AllWeeksPanelProps> = ({ reports, onSelectWeek, onClose }) => {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div className="projects-dashboard-card" style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 className="projects-title" style={{ margin: 0, fontSize: '20px' }}>Todas as Semanas</h2>
          <button type="button" className="projects-btn" onClick={onClose} style={{ border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', gap: '6px' }}><X size={14} /> Fechar</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px', overflowY: 'auto', paddingRight: '8px' }}>
          {reports.map((report, idx) => {
            const totalCommits = report.summary.totalCommits
            const activeRepos = report.summary.activeThisWeek
            const topRepo = [...report.repos].sort((a, b) => b.commitCount - a.commitCount)[0]
            const types = report.repos.reduce<Record<string, number>>((acc, r) => {
              for (const [t, c] of Object.entries(r.commitTypes ?? {})) {
                acc[t] = (acc[t] ?? 0) + (c as number)
              }
              return acc
            }, {})
            const topTypes = Object.entries(types).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 4)
            const maxType = topTypes[0]?.[1] ?? 1

            return (
              <button
                key={report.date}
                type="button"
                onClick={() => { onSelectWeek(idx); onClose() }}
                style={{ 
                  background: idx === 0 ? 'var(--color-primary-light)' : 'var(--bg-primary)', 
                  border: idx === 0 ? '1px solid var(--accent-primary)' : '1px solid var(--border)', 
                  borderRadius: '8px', padding: '16px', cursor: 'pointer', textAlign: 'left', 
                  display: 'flex', flexDirection: 'column', gap: '12px', transition: 'border-color 0.2s' 
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {report.period ? `${report.period.from} – ${report.period.to}` : report.date}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    <span style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>{totalCommits}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>commits</span>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{activeRepos} repos</span>
                </div>
                {topRepo && topRepo.commitCount > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '4px 8px', borderRadius: '4px' }}>
                    <Trophy size={13} style={{ color: 'var(--accent-yellow)' }} />
                    <span>{topRepo.name} ({topRepo.commitCount})</span>
                  </div>
                )}
                {topTypes.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                    {topTypes.map(([t, v]) => (
                      <div key={t} style={{ position: 'relative', height: '14px', background: 'var(--bg-secondary)', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: `${(v / maxType) * 100}%`, backgroundColor: getCommitTypeColor(t), opacity: 0.6 }} />
                        <span style={{ position: 'absolute', top: 0, left: '4px', bottom: 0, display: 'flex', alignItems: 'center', fontSize: '9px', fontWeight: 600, color: 'var(--text-primary)' }}>{t}</span>
                      </div>
                    ))}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
