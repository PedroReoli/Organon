import React from 'react'
import { COMPONENT_PALETTE, SystemComponentDefinition } from '../types/systemDesign.types'

interface Props {
  onAddComponent: (component: SystemComponentDefinition) => void
}

export const PaletteSidebar: React.FC<Props> = ({ onAddComponent }) => {
  const categories: Array<{ id: string; label: string }> = [
    { id: 'client', label: 'Clientes & Frontend' },
    { id: 'gateway', label: 'Gateways & Balancers' },
    { id: 'compute', label: 'Serviços & Computação' },
    { id: 'database', label: 'Bancos de Dados' },
    { id: 'cache', label: 'Cache & Sessão' },
    { id: 'queue', label: 'Filas & Mensageria' },
    { id: 'storage', label: 'Armazenamento S3' },
    { id: 'security', label: 'Segurança & Auth' },
  ]

  return (
    <div
      style={{
        width: '260px',
        background: 'var(--color-surface)',
        borderRight: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflowY: 'auto',
        userSelect: 'none',
      }}
    >
      <div style={{ padding: '16px', borderBottom: '1px solid var(--color-border)' }}>
        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--color-text)' }}>
          🧩 Componentes de Arquitetura
        </h4>
        <p style={{ margin: '4px 0 0', fontSize: '11px', color: 'var(--color-text-muted)' }}>
          Clique para adicionar ao canvas
        </p>
      </div>

      <div style={{ padding: '12px', flex: 1 }}>
        {categories.map(cat => {
          const items = COMPONENT_PALETTE.filter(c => c.category === cat.id)
          if (items.length === 0) return null

          return (
            <div key={cat.id} style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '8px' }}>
                {cat.label}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {items.map(item => (
                  <button
                    key={item.type}
                    onClick={() => onAddComponent(item)}
                    title={item.description}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-background)',
                      color: 'var(--color-text)',
                      fontSize: '12.5px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = 'var(--color-primary)'
                      e.currentTarget.style.background = 'color-mix(in srgb, var(--color-primary) 10%, transparent)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = 'var(--color-border)'
                      e.currentTarget.style.background = 'var(--color-background)'
                    }}
                  >
                    <span style={{ fontSize: '16px' }}>{item.icon}</span>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.label}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.description}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
