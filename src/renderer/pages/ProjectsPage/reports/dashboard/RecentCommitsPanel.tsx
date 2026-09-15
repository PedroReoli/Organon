import React, { useMemo, useState } from 'react'
import type { RepoReport } from '@types'

const TYPE_COLORS: Record<string, string> = {
  feat: 'var(--color-primary)', fix: '#22c55e', refactor: '#f97316', chore: '#6b7280',
  docs: 'var(--color-primary)', style: 'var(--color-primary)', test: 'var(--color-primary)', perf: '#f59e0b',
  revert: '#ef4444', other: '#6b7280',
}

const REPO_PALETTE = [
  'var(--color-primary)', '#22c55e', '#f59e0b', '#ef4444', 'var(--color-primary)',
  'var(--color-primary)', '#fb923c', '#60a5fa', '#f472b6', '#34d399',
  '#e879f9', '#38bdf8', '#facc15', '#4ade80', '#f87171',
]

interface RecentCommitsPanelProps {
  repos: RepoReport[]
  onSelect: (repo: RepoReport) => void
}

export const RecentCommitsPanel: React.FC<RecentCommitsPanelProps> = ({ repos, onSelect }) => {
  const [page, setPage] = useState(0)
  const ITEMS_PER_PAGE = 8

  const repoColorMap = useMemo(() => {
    const map = new Map<string, string>()
    const active = repos.filter(r => (r.commits?.length ?? 0) > 0)
    active.forEach((r, i) => {
      map.set(`${r.group}/${r.name}`, REPO_PALETTE[i % REPO_PALETTE.length])
    })
    return map
  }, [repos])

  const allCommits = useMemo(() =>
    repos
      .flatMap(r => (r.commits ?? []).map(c => ({ ...c, repo: r })))
      .sort((a, b) => {
        const da = `${a.date}${String(a.hour ?? 0).padStart(2, '0')}`
        const db = `${b.date}${String(b.hour ?? 0).padStart(2, '0')}`
        return db.localeCompare(da)
      }),
    [repos]
  )

  const maxPages = Math.ceil(allCommits.length / ITEMS_PER_PAGE)
  const commits = allCommits.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE)

  const legendRepos = useMemo(() =>
    repos.filter(r => (r.commits?.length ?? 0) > 0),
    [repos]
  )

  return (
    <div className="projects-dashboard-card" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <h3 className="projects-card-title">Commits recentes <span style={{ color: 'var(--text-muted)', fontSize: '11px', marginLeft: '6px' }}>{allCommits.length}</span></h3>
      {allCommits.length === 0 ? (
        <span style={{ color: 'var(--text-muted)' }}>Nenhum commit esta semana</span>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
          <div className="projects-commits-list" style={{ flex: 1, overflowY: 'auto', paddingRight: '8px' }}>
            {commits.map((c, i) => {
              const repoKey = `${c.repo.group}/${c.repo.name}`
              const repoColor = repoColorMap.get(repoKey) ?? '#6b7280'
              return (
                <button
                  key={`${c.hash}-${i}`}
                  type="button"
                  className="projects-commit-row"
                  onClick={() => onSelect(c.repo)}
                  title={repoKey}
                  style={{ 
                    cursor: 'pointer', textAlign: 'left', borderLeft: `3px solid ${repoColor}`,
                    background: 'var(--bg-primary)', padding: '10px 14px', marginBottom: '8px',
                    display: 'grid', gridTemplateColumns: '70px 1fr 80px', gap: '12px'
                  }}
                >
                  <span className="projects-commit-type" style={{ background: TYPE_COLORS[c.type] ?? '#6b7280' }}>
                    {c.type}
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <span className="projects-commit-msg">{c.msg}</span>
                    <span className="projects-commit-repo" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{c.repo.name}</span>
                  </div>
                  <span className="projects-commit-time" style={{ textAlign: 'right' }}>{c.date}</span>
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
      )}
    </div>
  )
}
