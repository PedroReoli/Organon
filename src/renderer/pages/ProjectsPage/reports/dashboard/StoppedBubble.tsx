import React, { useMemo, useState } from 'react'
import type { RepoReport } from '@types'

interface StoppedBubbleProps {
  repos: RepoReport[]
}

export const StoppedBubble: React.FC<StoppedBubbleProps> = ({ repos }) => {
  const [page, setPage] = useState(0)
  const ITEMS_PER_PAGE = 8

  const allStopped = useMemo(() =>
    repos.filter(r => r.status === 'parado' && r.daysAgo > 30)
      .sort((a, b) => b.daysAgo - a.daysAgo),
    [repos]
  )

  const maxPages = Math.ceil(allStopped.length / ITEMS_PER_PAGE)
  const stopped = allStopped.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE)

  if (allStopped.length === 0) return (
    <div className="projects-dashboard-card">
      <h3 className="projects-card-title">Parados</h3>
      <span style={{ color: 'var(--accent-green)' }}>✓ Nenhum parado há mais de 30 dias</span>
    </div>
  )

  const maxDays = allStopped[0].daysAgo

  return (
    <div className="projects-dashboard-card" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <h3 className="projects-card-title">
        Parados <span style={{ color: 'var(--text-muted)', fontSize: '11px', marginLeft: '6px' }}>{allStopped.length}</span>
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <div className="projects-top-list" style={{ gap: '12px', flex: 1, overflowY: 'auto', paddingRight: '8px' }}>
          {stopped.map(r => {
            const color = r.daysAgo > 180 ? 'var(--accent-red)' : r.daysAgo > 90 ? 'var(--accent-yellow)' : 'var(--text-secondary)'
            const pct = Math.max(4, (r.daysAgo / maxDays) * 100)
            return (
              <div key={`${r.group}/${r.name}`} title={`${r.group}/${r.name}`} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '13px' }}>
                  <span className="projects-top-name" style={{ color: 'var(--text-primary)' }}>{r.name}</span>
                  <span style={{ color, fontWeight: 500 }}>{r.daysAgo}d</span>
                </div>
                <div className="projects-top-track">
                  <div className="projects-top-fill" style={{ width: `${pct}%`, backgroundColor: color }} />
                </div>
              </div>
            )
          })}
        </div>
        {maxPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
            <button type="button" className="projects-btn" style={{ padding: '4px 8px' }} disabled={page === 0} onClick={() => setPage(p => p - 1)}>Anterior</button>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{page + 1} de {maxPages}</span>
            <button type="button" className="projects-btn" style={{ padding: '4px 8px' }} disabled={page >= maxPages - 1} onClick={() => setPage(p => p + 1)}>Próxima</button>
          </div>
        )}
      </div>
    </div>
  )
}
