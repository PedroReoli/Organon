import React from 'react'
import { Flame, Award, Zap } from 'lucide-react'
import type { RepoReport } from '@types'

interface StreakPanelProps {
  repos: RepoReport[]
  onSelect: (repo: RepoReport) => void
}

export const StreakPanel: React.FC<StreakPanelProps> = ({ repos, onSelect }) => {
  const ranked = repos
    .filter(r => (r.streak ?? 0) > 0)
    .sort((a, b) => (b.streak ?? 0) - (a.streak ?? 0))
    .slice(0, 4)

  const max = ranked[0]?.streak ?? 1

  if (ranked.length === 0) {
    return (
      <div className="projects-dashboard-card" style={{ height: 'fit-content' }}>
        <h3 className="projects-card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Flame size={15} style={{ color: '#f59e0b' }} /> Streak de Commits
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '6px', border: '1px dashed var(--border)' }}>
          <Zap size={14} style={{ color: 'var(--text-muted)' }} />
          <span style={{ color: 'var(--text-muted)', fontSize: '11.5px' }}>Nenhum repositório com streak ativo esta semana</span>
        </div>
      </div>
    )
  }

  return (
    <div className="projects-dashboard-card" style={{ height: 'fit-content' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
        <h3 className="projects-card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
          <Flame size={15} style={{ color: '#f59e0b' }} />
          <span>Streak de Commits</span>
        </h3>
        <span style={{ fontSize: '10.5px', fontWeight: 600, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
          {ranked.length} ativo{ranked.length > 1 ? 's' : ''}
        </span>
      </div>

      <div className="projects-top-list" style={{ gap: '8px' }}>
        {ranked.map((r, i) => {
          const s = r.streak ?? 0
          const pct = Math.max(8, (s / max) * 100)
          const color = s >= 7 ? '#f59e0b' : s >= 3 ? 'var(--color-primary, #818cf8)' : 'var(--text-secondary, #94a3b8)'
          const bgGlow = s >= 7 ? 'rgba(245, 158, 11, 0.15)' : s >= 3 ? 'rgba(99, 102, 241, 0.12)' : 'rgba(255, 255, 255, 0.04)'

          return (
            <button
              key={`${r.group}/${r.name}`}
              type="button"
              onClick={() => onSelect(r)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '5px',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.04)',
                borderRadius: '6px',
                padding: '6px 8px',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255, 255, 255, 0.05)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255, 255, 255, 0.02)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '8px' }}>
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    minWidth: 0,
                    flex: 1,
                    overflow: 'hidden',
                  }}
                  title={`${r.group}/${r.name}`}
                >
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      color: i === 0 ? '#f59e0b' : 'var(--text-muted)',
                      fontFamily: 'monospace',
                      width: '16px',
                    }}
                  >
                    #{i + 1}
                  </span>
                  <span
                    style={{
                      color: 'var(--text-primary)',
                      fontWeight: 600,
                      fontSize: '12px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {r.name}
                  </span>
                </span>
                
                <span
                  style={{
                    color,
                    background: bgGlow,
                    padding: '1px 6px',
                    borderRadius: '4px',
                    fontWeight: 700,
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    flexShrink: 0,
                  }}
                >
                  {s}d
                </span>
              </div>

              <div className="projects-top-track" style={{ height: '4px', borderRadius: '2px', background: 'rgba(255, 255, 255, 0.06)' }}>
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
            </button>
          )
        })}
      </div>

      {ranked.length <= 2 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', padding: '6px 8px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '4px', border: '1px solid rgba(255, 255, 255, 0.04)', fontSize: '10.5px', color: 'var(--text-muted)' }}>
          <Award size={12} color="var(--color-primary, #818cf8)" />
          <span>Faça commits consecutivos diários para elevar o streak dos projetos.</span>
        </div>
      )}
    </div>
  )
}
