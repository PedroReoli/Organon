import React from 'react'
import type { CommitEntry } from '@types'
import { CommitTypeBadge } from '../components/CommitTypeBadge'

interface CommitTimelineProps {
  commits: CommitEntry[]
}

export const CommitTimeline: React.FC<CommitTimelineProps> = ({ commits }) => (
  <div className="projects-dashboard-card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
    <h3 className="projects-card-title">Histórico de Commits</h3>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '600px', overflowY: 'auto', paddingRight: '8px' }}>
      {commits.map((c, i) => (
        <div key={`${c.hash}-${i}`} style={{ display: 'grid', gridTemplateColumns: '60px 1fr 100px', gap: '16px', alignItems: 'center', background: 'var(--bg-primary)', padding: '12px 16px', borderRadius: '6px', border: '1px solid var(--border)' }}>
          <CommitTypeBadge type={c.type} size="md" />
          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{c.msg}</span>
            <code style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{c.hash}</code>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'right' }}>{c.date} {c.time}</span>
        </div>
      ))}
      {commits.length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Nenhum commit listado.</span>}
    </div>
  </div>
)
