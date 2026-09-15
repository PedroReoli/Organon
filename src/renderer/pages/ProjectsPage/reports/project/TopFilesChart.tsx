import React from 'react'
import type { TopFile } from '@types'

interface TopFilesChartProps {
  topFiles: TopFile[]
}

export const TopFilesChart: React.FC<TopFilesChartProps> = ({ topFiles }) => {
  const top = topFiles.slice(0, 10)
  const max = top[0]?.count || 1

  if (top.length === 0) return null

  return (
    <div className="projects-dashboard-card">
      <h3 className="projects-card-title">Arquivos mais modificados</h3>
      <div className="projects-top-list" style={{ gap: '12px' }}>
        {top.map(f => {
          const pct = Math.max(4, (f.count / max) * 100)
          const name = f.file.split('/').pop() ?? f.file
          return (
            <div key={f.file} title={f.file} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span className="projects-top-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{f.count}</span>
              </div>
              <div className="projects-top-track">
                <div className="projects-top-fill" style={{ width: `${pct}%`, backgroundColor: 'var(--accent-yellow)' }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
