import React, { useMemo, useState } from 'react'
import type { RepoReport } from '@types'

interface CommitsBarChartProps {
  repos: RepoReport[]
  onSelect: (repo: RepoReport) => void
}

const PALETTE = [
  'var(--color-primary)', '#22c55e', '#f59e0b', '#ef4444', 'var(--color-primary)',
  'var(--color-primary)', '#fb923c', '#60a5fa', '#f472b6', '#34d399',
]

export const CommitsBarChart: React.FC<CommitsBarChartProps> = ({ repos, onSelect }) => {
  const [page, setPage] = useState(0)
  const ITEMS_PER_PAGE = 4

  const sorted = useMemo(() =>
    [...repos].filter(r => r.commitCount > 0).sort((a, b) => b.commitCount - a.commitCount),
    [repos]
  )

  if (sorted.length === 0) return null

  const maxPages = Math.ceil(sorted.length / ITEMS_PER_PAGE)
  const pagedRepos = sorted.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE)
  const max = sorted[0].commitCount

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <h3 className="projects-card-title">Commits por projeto <span style={{ color: 'var(--text-muted)', fontSize: '11px', marginLeft: '6px' }}>{sorted.length}</span></h3>
      <div className="projects-top-list" style={{ flex: 1, overflowY: 'auto', paddingRight: '8px' }}>
        {pagedRepos.map((repo, i) => {
          const color = PALETTE[i % PALETTE.length]
          const pct = Math.max(3, (repo.commitCount / max) * 100)
          const label = `${repo.group}/${repo.name}`
          return (
            <button
              key={label}
              type="button"
              onClick={() => onSelect(repo)}
              title={label}
              style={{
                display: 'flex', flexDirection: 'column', gap: '6px', 
                background: 'transparent', border: 'none', padding: 0, 
                cursor: 'pointer', textAlign: 'left', width: '100%'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '13px' }}>
                <span className="projects-top-name" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color }} />
                  {label}
                </span>
                <span className="projects-top-value">{repo.commitCount}</span>
              </div>
              <div className="projects-top-track">
                <div className="projects-top-fill" style={{ width: `${pct}%`, backgroundColor: color }} />
              </div>
            </button>
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
  )
}
