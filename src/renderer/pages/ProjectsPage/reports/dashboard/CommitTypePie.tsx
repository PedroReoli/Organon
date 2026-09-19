import React from 'react'
import { ResponsivePie } from '@nivo/pie'
import { X } from 'lucide-react'
import { getCommitTypeColor } from '../constants/commitTypes'

const FALLBACK_COLORS = ['var(--color-primary)', '#38bdf8', '#eab308', '#ec4899']

const NIVO_THEME = {
  background: 'transparent',
  text: { fill: '#94a3b8', fontSize: 11 },
  tooltip: {
    container: {
      background: '#1e293b',
      color: '#f1f5f9',
      fontSize: 11,
      borderRadius: 6,
      border: '1px solid #334155',
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
    color: getCommitTypeColor(id, FALLBACK_COLORS[i % FALLBACK_COLORS.length]),
  }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header do Card com Título e Filtro Ativo */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <h3 className="projects-card-title" style={{ margin: 0 }}>Tipos de commit</h3>
        {activeType && (
          <button
            type="button"
            onClick={() => onSelectType?.(activeType)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              fontSize: '10.5px',
              fontWeight: 600,
              borderRadius: '999px',
              background: 'color-mix(in srgb, var(--color-primary) 15%, transparent)',
              color: 'var(--color-primary)',
              border: '1px solid color-mix(in srgb, var(--color-primary) 30%, transparent)',
              cursor: 'pointer',
            }}
            title="Limpar filtro"
          >
            <span>Filtro: {activeType}</span>
            <X size={11} />
          </button>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
        {/* Gráfico Donut */}
        <div style={{ width: '150px', height: '150px', flexShrink: 0 }}>
          <ResponsivePie
            data={data}
            theme={NIVO_THEME}
            margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
            innerRadius={0.58}
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
              <text
                x={centerX}
                y={centerY}
                textAnchor="middle"
                dominantBaseline="central"
                style={{ fontSize: 15, fontWeight: 800, fill: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}
              >
                {total}
              </text>
            )]}
          />
        </div>

        {/* Tabela Estruturada de Filtros / Legenda à Direita */}
        <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', maxHeight: '160px', paddingRight: '2px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <th style={{ textAlign: 'left', padding: '4px 6px', fontWeight: 600 }}>Tipo</th>
                <th style={{ textAlign: 'right', padding: '4px 6px', fontWeight: 600 }}>Qtd</th>
                <th style={{ textAlign: 'right', padding: '4px 6px', fontWeight: 600 }}>% Total</th>
              </tr>
            </thead>
            <tbody>
              {data.map(d => {
                const pct = Math.round((d.value / total) * 100)
                const isActive = activeType === d.id
                return (
                  <tr
                    key={d.id}
                    onClick={() => onSelectType?.(d.id)}
                    style={{
                      cursor: 'pointer',
                      background: isActive ? 'color-mix(in srgb, var(--color-primary) 15%, transparent)' : 'transparent',
                      borderLeft: isActive ? '2px solid var(--color-primary)' : '2px solid transparent',
                      transition: 'background 0.15s ease',
                    }}
                    className="projects-table-row-hover"
                  >
                    {/* Tipo com Bolinha de Cor */}
                    <td style={{ padding: '4px 6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span
                          style={{
                            width: '7px',
                            height: '7px',
                            borderRadius: '50%',
                            backgroundColor: d.color,
                            flexShrink: 0,
                          }}
                        />
                        <span style={{ fontWeight: isActive ? 700 : 500, color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                          {d.id}
                        </span>
                      </div>
                    </td>

                    {/* Qtd em Numeral Tabular */}
                    <td style={{ textAlign: 'right', padding: '4px 6px', fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {d.value}
                    </td>

                    {/* Barra de Progresso + % */}
                    <td style={{ textAlign: 'right', padding: '4px 6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                        <div
                          style={{
                            width: '38px',
                            height: '4px',
                            borderRadius: '2px',
                            background: 'color-mix(in srgb, var(--color-surface) 80%, white)',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              width: `${pct}%`,
                              height: '100%',
                              backgroundColor: d.color,
                              borderRadius: '2px',
                            }}
                          />
                        </div>
                        <span style={{ width: '28px', textAlign: 'right', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums', fontSize: '10.5px' }}>
                          {pct}%
                        </span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
