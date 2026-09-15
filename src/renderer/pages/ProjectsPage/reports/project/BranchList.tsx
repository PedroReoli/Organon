import React from 'react'

interface BranchListProps {
  branches: string[]
}

export const BranchList: React.FC<BranchListProps> = ({ branches }) => {
  if (branches.length === 0) return null
  return (
    <div className="projects-dashboard-card">
      <h3 className="projects-card-title">Branches ativas</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {branches.map(b => (
          <span key={b} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', padding: '4px 12px', borderRadius: '16px', fontSize: '12px', color: 'var(--text-primary)' }}>{b}</span>
        ))}
      </div>
    </div>
  )
}
