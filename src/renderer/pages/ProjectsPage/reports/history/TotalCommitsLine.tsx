import React, { useMemo } from 'react'
import { ResponsiveLine } from '@nivo/line'
import type { WeekReport } from '@types'

interface TotalCommitsLineProps {
  reports: WeekReport[]
}

const NIVO_THEME = {
  background: 'transparent',
  text: { fill: '#94a3b8', fontSize: 11 },
  axis: { ticks: { text: { fill: '#64748b', fontSize: 10 } } },
  grid: { line: { stroke: '#1e293b', strokeWidth: 1 } },
  tooltip: {
    container: {
      background: '#1e293b', color: '#f1f5f9', fontSize: 11,
      borderRadius: 6, border: '1px solid #334155',
      boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
    },
  },
}

export const TotalCommitsLine: React.FC<TotalCommitsLineProps> = ({ reports }) => {
  const data = useMemo(() => {
    const sorted = [...reports].reverse()
    return [{
      id: 'commits',
      color: 'var(--color-primary)',
      data: sorted.map(r => ({
        x: r.period ? `${r.period.from}` : r.date.slice(5),
        y: r.summary.totalCommits,
      })),
    }]
  }, [reports])

  if (data[0].data.length < 2) return null

  return (
    <div className="projects-dashboard-card" style={{ marginBottom: '24px' }}>
      <h3 className="projects-card-title">Evolução de commits</h3>
      <div style={{ height: 160 }}>
        <ResponsiveLine
          data={data}
          theme={NIVO_THEME}
          margin={{ top: 8, right: 16, bottom: 28, left: 32 }}
          xScale={{ type: 'point' }}
          yScale={{ type: 'linear', min: 0 }}
          curve="monotoneX"
          colors={['var(--accent-primary, var(--color-primary))']}
          lineWidth={2}
          pointSize={4}
          pointColor="var(--accent-primary, var(--color-primary))"
          pointBorderWidth={2}
          pointBorderColor="var(--bg-primary, #0f172a)"
          enableArea
          areaOpacity={0.1}
          axisBottom={{ 
            tickSize: 0, 
            tickPadding: 8, 
            tickRotation: -45,
            tickValues: data[0]?.data.length > 10 ? Math.floor(data[0].data.length / 5) : 'every 1',
          }}
          axisLeft={{ tickSize: 0, tickPadding: 8, tickValues: 4 }}
          enableGridX={false}
          gridYValues={4}
          useMesh
          tooltip={({ point }) => (
            <div style={{ background: 'var(--bg-secondary, #1e293b)', border: '1px solid var(--border, #334155)', borderRadius: 6, padding: '5px 9px', fontSize: 11, color: 'var(--text-primary, #f1f5f9)' }}>
              <strong>{String(point.data.x)}</strong>: {String(point.data.y)} commits
            </div>
          )}
        />
      </div>
    </div>
  )
}
