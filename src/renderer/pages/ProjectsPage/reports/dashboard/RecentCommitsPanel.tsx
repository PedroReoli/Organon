import React, { useMemo, useState } from 'react'
import { GitCommit, ChevronLeft, ChevronRight } from 'lucide-react'
import type { RepoReport } from '@types'

import { CommitTypeBadge } from '../components/CommitTypeBadge'

interface RecentCommitsPanelProps {
  repos: RepoReport[]
  onSelect: (repo: RepoReport) => void
}

export const RecentCommitsPanel: React.FC<RecentCommitsPanelProps> = ({ repos, onSelect }) => {
  const [page, setPage] = useState(0)
  const ITEMS_PER_PAGE = 5

  const allCommits = useMemo(() =>
    repos
      .flatMap(r => (r.commits ?? []).map((c: any) => ({ ...c, repo: r })))
      .sort((a: any, b: any) => {
        const da = `${a.date}${String(a.hour ?? 0).padStart(2, '0')}`
        const db = `${b.date}${String(b.hour ?? 0).padStart(2, '0')}`
        return db.localeCompare(da)
      }),
    [repos]
  )

  const maxPages = Math.ceil(allCommits.length / ITEMS_PER_PAGE)
  const commits = allCommits.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE)

  return (
    <div className="projects-dashboard-card" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
        <h3 className="projects-card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
          <GitCommit size={15} color="var(--color-primary, #818cf8)" />
          <span>Commits Recentes</span>
        </h3>
        <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 600, fontFamily: 'monospace' }}>
          {allCommits.length} commits
        </span>
      </div>

      {allCommits.length === 0 ? (
        <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
          Nenhum commit encontrado nesta semana.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
          <div className="projects-commits-list" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', paddingRight: '2px' }}>
            {commits.map((c, i) => {
              const repoKey = `${c.repo.group}/${c.repo.name}`
              return (
                <button
                  key={`${c.hash}-${i}`}
                  type="button"
                  className="projects-commit-row"
                  onClick={() => onSelect(c.repo)}
                  title={repoKey}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '7px 10px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderLeft: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                    boxSizing: 'border-box',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(255, 255, 255, 0.05)';
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255, 255, 255, 0.1)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(255, 255, 255, 0.02)';
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255, 255, 255, 0.05)';
                  }}
                >
                  <CommitTypeBadge type={c.type} style={{ width: 46 }} />

                  <div className="projects-commit-info" style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                    <div
                      className="projects-commit-msg"
                      style={{
                        fontSize: '12px',
                        fontWeight: 500,
                        color: 'var(--text-primary, #f1f5f9)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={c.msg}
                    >
                      {c.msg}
                    </div>
                    <div
                      className="projects-commit-repo"
                      style={{
                        fontSize: '10.5px',
                        color: 'var(--text-muted, #94a3b8)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        marginTop: '1px',
                      }}
                    >
                      {c.repo.name}
                    </div>
                  </div>

                  <span
                    className="projects-commit-time"
                    style={{
                      fontSize: '10.5px',
                      fontFamily: 'monospace',
                      color: 'var(--text-muted, #94a3b8)',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                      textAlign: 'right',
                    }}
                  >
                    {c.date}
                  </span>
                </button>
              )
            })}
          </div>

          {maxPages > 1 && (
            <div className="projects-pagination-bar" style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px solid var(--border, rgba(255,255,255,0.07))', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                className="projects-btn"
                disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
                style={{ padding: '3px 8px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
              >
                <ChevronLeft size={13} /> Anterior
              </button>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                {page + 1} de {maxPages}
              </span>
              <button
                type="button"
                className="projects-btn"
                disabled={page >= maxPages - 1}
                onClick={() => setPage(p => p + 1)}
                style={{ padding: '3px 8px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
              >
                Próxima <ChevronRight size={13} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
