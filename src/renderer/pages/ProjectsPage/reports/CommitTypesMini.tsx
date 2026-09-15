import React from 'react'
import { ResponsivePie } from '@nivo/pie'

export interface CommitTypesMiniProps {
  data: Array<{ id: string; label: string; value: number; color: string }>
}

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

export const CommitTypesMini: React.FC<CommitTypesMiniProps> = ({ data }) => {
  if (!data || data.length === 0) return null

  // Pegar os top 6 para a legenda não ficar gigante
  const legendData = data.slice(0, 6)

  return (
    <div className="projects-dashboard-card">
      <h3 className="projects-card-title">Tipos de Commit</h3>
      <div className="projects-pie-container">
        <div className="projects-pie-chart">
          <ResponsivePie
            data={data}
            theme={NIVO_THEME}
            margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
            innerRadius={0.6}
            padAngle={1.5}
            cornerRadius={3}
            colors={d => d.data.color}
            borderWidth={0}
            enableArcLabels={false}
            enableArcLinkLabels={false}
            activeOuterRadiusOffset={4}
            tooltip={({ datum }) => (
              <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 6, padding: '6px 10px', fontSize: 11, color: '#f1f5f9' }}>
                <strong style={{ color: datum.color }}>{datum.id}</strong>: {datum.value}
              </div>
            )}
          />
        </div>
        <div className="projects-pie-legend">
          {legendData.map(d => (
            <div key={d.id} className="projects-pie-legend-item">
              <span className="projects-pie-legend-label">
                <div className="projects-pie-legend-dot" style={{ backgroundColor: d.color }} />
                {d.id}
              </span>
              <span className="projects-pie-legend-value">{d.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
