import React from 'react'
import { ResponsivePie } from '@nivo/pie'

const TYPE_COLORS: Record<string, string> = {
  feat: '#22c55e', fix: '#ef4444', refactor: 'var(--color-primary)', chore: '#94a3b8',
  docs: '#60a5fa', perf: '#f59e0b', other: '#6b7280', revert: '#f97316', test: 'var(--color-primary)',
}
const FALLBACK_COLORS = ['var(--color-primary)', 'var(--color-primary)', '#eab308', 'var(--color-primary)']

const NIVO_THEME = {
  background: 'transparent',
  text: { fill: '#94a3b8', fontSize: 11 },
  tooltip: {
    container: {
      background: '#1e293b', color: '#f1f5f9', fontSize: 11,
      borderRadius: 6, border: '1px solid #334155',
      boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
    },
  },
}

interface CommitTypePieProps {
  commitTypes: Record<string, number>
  activeType?: string | null
  onSelectType?: (type: string) => void
}

export const CommitTypePie: React.FC<CommitTypePieProps> = ({ commitTypes, activeType, onSelectType }) => {
  const entries = Object.entries(commitTypes).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])
  const total = entries.reduce((s, [, v]) => s + v, 0)

  if (entries.length === 0) return null

  const data = entries.map(([id, value], i) => ({
    id,
    label: id,
    value,
    color: TYPE_COLORS[id] ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length],
  }))

  return (
    <div>
      <h3 className="projects-card-title" style={{ margin: '0 0 16px 0' }}>Tipos de commit</h3>
      <div className="projects-pie-container">
        <div className="projects-pie-chart" style={{ width: '180px', height: '180px' }}>
          <ResponsivePie
            data={data}
            theme={NIVO_THEME}
            margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
            innerRadius={0.55}
            padAngle={1.5}
            cornerRadius={3}
            colors={d => d.data.color as string}
            borderWidth={0}
            enableArcLabels={false}
            enableArcLinkLabels={false}
            activeOuterRadiusOffset={4}
            onClick={d => onSelectType?.(d.id as string)}
            tooltip={({ datum }) => (
              <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 6, padding: '6px 10px', fontSize: 11, color: '#f1f5f9' }}>
                <strong style={{ color: datum.color }}>{datum.id}</strong>: {datum.value} ({Math.round((datum.value / total) * 100)}%)
              </div>
            )}
            layers={['arcs', 'arcLabels', 'arcLinkLabels', ({ centerX, centerY }) => (
              <text x={centerX} y={centerY} textAnchor="middle" dominantBaseline="central"
                style={{ fontSize: 14, fontWeight: 700, fill: '#f1f5f9', fontVariantNumeric: 'tabular-nums' }}>
                {total}
              </text>
            )]}
          />
        </div>
        <div className="projects-pie-legend" style={{ maxHeight: '160px', overflowY: 'auto' }}>
          {data.map(d => {
            const pct = Math.round((d.value / total) * 100)
            const isActive = activeType === d.id
            return (
              <button
                key={d.id}
                type="button"
                style={{ 
                  background: isActive ? 'var(--color-primary-light)' : 'transparent',
                  border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', textAlign: 'left'
                }}
                className="projects-pie-legend-item"
                onClick={() => onSelectType?.(d.id)}
                title={`${d.id}: ${d.value} (${pct}%)`}
              >
                <span className="projects-pie-legend-label">
                  <span className="projects-pie-legend-dot" style={{ backgroundColor: d.color }} />
                  {d.id}
                </span>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span className="projects-pie-legend-value">{d.value}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{pct}%</span>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
