import React, { useMemo, useState } from 'react'
import type { RepoReport } from '@types'

interface CommitsBarChartProps {
  repos: RepoReport[]
  onSelect: (repo: RepoReport) => void
}

const PALETTE = [
  '#818cf8', '#22c55e', '#f59e0b', '#ec4899', '#38bdf8',
  '#fb923c', '#a855f7', '#14b8a6', '#f43f5e', '#6366f1',
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
      <h3 className="projects-card-title">
        Commits por projeto
        <span style={{ color: 'var(--text-muted)', fontSize: '11px', marginLeft: '6px', fontWeight: 500 }}>
          {sorted.length}
        </span>
      </h3>
      <div className="projects-top-list" style={{ flex: 1, overflowY: 'auto', paddingRight: '4px', gap: '8px' }}>
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
                display: 'flex', flexDirection: 'column', gap: '4px', 
                background: 'transparent', border: 'none', padding: 0, 
                cursor: 'pointer', textAlign: 'left', width: '100%'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '12px' }}>
                <span className="projects-top-name" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)', fontWeight: 500 }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                  {label}
                </span>
                <span className="projects-top-value" style={{ fontWeight: 600, fontSize: '11.5px', fontFamily: 'monospace' }}>{repo.commitCount}</span>
              </div>
              <div className="projects-top-track">
                <div className="projects-top-fill" style={{ width: `${pct}%`, backgroundColor: color }} />
              </div>
            </button>
          )
        })}
      </div>
      {maxPages > 1 && (
        <div className="projects-pagination-bar">
          <button type="button" className="projects-btn" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Anterior</button>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{page + 1} de {maxPages}</span>
          <button type="button" className="projects-btn" disabled={page >= maxPages - 1} onClick={() => setPage(p => p + 1)}>Próxima</button>
        </div>
      )}
    </div>
  )
}
