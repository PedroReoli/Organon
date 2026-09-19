import React, { useMemo, useState } from 'react'
import { CheckCircle2, PauseCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import type { RepoReport } from '@types'

interface StoppedBubbleProps {
  repos: RepoReport[]
}

export const StoppedBubble: React.FC<StoppedBubbleProps> = ({ repos }) => {
  const [page, setPage] = useState(0)
  const ITEMS_PER_PAGE = 5

  const allStopped = useMemo(() =>
    repos.filter(r => r.status === 'parado' && r.daysAgo > 30)
      .sort((a, b) => b.daysAgo - a.daysAgo),
    [repos]
  )

  const maxPages = Math.ceil(allStopped.length / ITEMS_PER_PAGE)
  const stopped = allStopped.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE)

  if (allStopped.length === 0) return (
    <div className="projects-dashboard-card" style={{ height: 'fit-content' }}>
      <h3 className="projects-card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <PauseCircle size={15} color="var(--accent-red, #ef4444)" />
        <span>Repositórios Parados</span>
      </h3>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', background: 'rgba(34, 197, 94, 0.08)', borderRadius: '6px', border: '1px solid rgba(34, 197, 94, 0.2)', color: 'var(--accent-green)', fontSize: '12px' }}>
        <CheckCircle2 size={15} />
        <span>Nenhum repositório parado há mais de 30 dias</span>
      </div>
    </div>
  )

  const maxDays = allStopped[0]?.daysAgo || 365

  return (
    <div className="projects-dashboard-card" style={{ height: 'fit-content', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <h3 className="projects-card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
          <PauseCircle size={15} color="var(--accent-red, #ef4444)" />
          <span>Repositórios Parados</span>
        </h3>
        <span style={{ color: 'var(--accent-red, #ef4444)', fontSize: '11px', fontWeight: 700, fontFamily: 'monospace', background: 'rgba(239, 68, 68, 0.12)', padding: '1px 6px', borderRadius: '10px', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
          {allStopped.length} parados
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {stopped.map(r => {
          const isExtreme = r.daysAgo > 180
          const isModerate = r.daysAgo > 90
          const color = isExtreme ? '#ef4444' : isModerate ? '#f59e0b' : '#94a3b8'
          const bgBadge = isExtreme ? 'rgba(239, 68, 68, 0.12)' : isModerate ? 'rgba(245, 158, 11, 0.12)' : 'rgba(148, 163, 184, 0.1)'
          const pct = Math.min(100, Math.max(8, (r.daysAgo / maxDays) * 100))

          return (
            <div
              key={`${r.group}/${r.name}`}
              title={`${r.group}/${r.name} — Parado há ${r.daysAgo} dias`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                padding: '6px 8px',
                background: 'rgba(255, 255, 255, 0.02)',
                borderRadius: '6px',
                border: '1px solid rgba(255, 255, 255, 0.04)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '8px' }}>
                <span
                  style={{
                    color: 'var(--text-primary)',
                    fontWeight: 500,
                    fontSize: '12px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    minWidth: 0,
                    flex: 1,
                  }}
                >
                  {r.name}
                </span>
                
                <span
                  style={{
                    color,
                    background: bgBadge,
                    padding: '1px 6px',
                    borderRadius: '4px',
                    fontWeight: 700,
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    flexShrink: 0,
                  }}
                >
                  {r.daysAgo}d
                </span>
              </div>

              <div className="projects-top-track" style={{ height: '3px', borderRadius: '2px', background: 'rgba(255, 255, 255, 0.06)' }}>
                <div
                  className="projects-top-fill"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: color,
                    height: '100%',
                    borderRadius: '2px',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            </div>
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
  )
}
