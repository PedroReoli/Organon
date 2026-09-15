import React from 'react'
import { ResponsiveLine } from '@nivo/line'

export interface CompactLineChartProps {
  data: Array<{
    id: string
    color: string
    data: Array<{ x: string; y: number; activeRepos?: number; fullDate?: string }>
  }>
  monthMarkers: Array<{ label: string; x: string }>
}

const NIVO_THEME = {
  background: 'transparent',
  text: { fill: '#94a3b8', fontSize: 11 },
  axis: {
    ticks: { text: { fill: '#64748b', fontSize: 10 } },
    legend: { text: { fill: '#64748b', fontSize: 11 } },
  },
  grid: { line: { stroke: '#1e293b', strokeWidth: 1 } },
  tooltip: {
    container: {
      background: '#1e293b', color: '#f1f5f9', fontSize: 11,
      borderRadius: 6, border: '1px solid #334155',
      boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
    },
  },
}

export const CompactLineChart: React.FC<CompactLineChartProps> = ({ data, monthMarkers }) => {
  if (!data || !data[0] || data[0].data.length < 2) return null

  return (
    <div className="projects-dashboard-card" style={{ gridColumn: '1 / -1' }}>
      <h3 className="projects-card-title">Evolução de Commits</h3>
      <div style={{ height: 180 }}>
        <ResponsiveLine
          data={data}
          theme={NIVO_THEME}
          margin={{ top: 10, right: 10, bottom: 30, left: 30 }}
          xScale={{ type: 'point' }}
          yScale={{ type: 'linear', min: 0, stacked: false }}
          curve="monotoneX"
          colors={['var(--color-primary)']}
          lineWidth={2.5}
          pointSize={6}
          pointColor="var(--color-primary)"
          pointBorderWidth={2}
          pointBorderColor="#0f172a"
          enableArea
          areaOpacity={0.15}
          crosshairType="bottom"
          axisBottom={{
            tickSize: 0,
            tickPadding: 8,
            renderTick: (tick) => {
              const marker = monthMarkers.find(m => m.x === tick.value)
              // Mostrar apenas os marcadores de mês ou ticks muito esparsos para visual limpo
              return (
                <g transform={`translate(${tick.x},${tick.y})`}>
                  {marker && (
                    <line x1={0} y1={-180} x2={0} y2={0} stroke="#334155" strokeWidth={1} strokeDasharray="3,3" />
                  )}
                  <text
                    textAnchor="middle"
                    dominantBaseline="middle"
                    transform="translate(0, 10)"
                    style={{ fontSize: 10, fill: marker ? '#94a3b8' : '#64748b', fontWeight: marker ? 700 : 400 }}
                  >
                    {marker ? marker.label : ''}
                  </text>
                </g>
              )
            },
          }}
          axisLeft={{ tickSize: 0, tickPadding: 6, tickValues: 4 }}
          enableGridX={false}
          gridYValues={4}
          useMesh
          tooltip={({ point }) => {
            const d = point.data as any
            return (
              <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 6, padding: '8px 12px', fontSize: 11, color: '#f1f5f9' }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>Semana {String(point.data.x)}</div>
                <div><span style={{ color: 'var(--color-primary)' }}>{String(point.data.y)}</span> commits</div>
                {d.activeRepos !== undefined && <div style={{ color: '#94a3b8', marginTop: 2 }}>{d.activeRepos} repos ativos</div>}
              </div>
            )
          }}
        />
      </div>
    </div>
  )
}
