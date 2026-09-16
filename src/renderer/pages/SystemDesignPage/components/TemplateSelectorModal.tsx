import React from 'react'
import { BUILTIN_TEMPLATES, ArchitectureTemplate } from '../types/systemDesign.types'
import { LayoutTemplate, X } from 'lucide-react'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSelectTemplate: (template: ArchitectureTemplate) => void
}

export const TemplateSelectorModal: React.FC<Props> = ({ isOpen, onClose, onSelectTemplate }) => {
  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        style={{
          width: '600px',
          maxWidth: '90vw',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          padding: '24px',
          color: 'var(--color-text)',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <LayoutTemplate size={18} style={{ color: 'var(--color-primary)' }} />
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 600 }}>Templates de Arquitetura de Referência</h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '4px',
              borderRadius: '4px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        <p style={{ margin: '0 0 20px', fontSize: '13px', color: 'var(--color-text-muted)' }}>
          Selecione um template pronto para carregar no canvas de System Design.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {BUILTIN_TEMPLATES.map(tpl => (
            <div
              key={tpl.id}
              onClick={() => {
                onSelectTemplate(tpl)
                onClose()
              }}
              style={{
                padding: '14px',
                borderRadius: '8px',
                border: '1px solid var(--color-border)',
                background: 'var(--color-background)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--color-primary)'
                e.currentTarget.style.background = 'color-mix(in srgb, var(--color-primary) 8%, transparent)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--color-border)'
                e.currentTarget.style.background = 'var(--color-background)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--color-text)' }}>{tpl.name}</span>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '10px',
                    background: 'color-mix(in srgb, var(--color-primary) 15%, transparent)',
                    color: 'var(--color-primary)',
                  }}
                >
                  {tpl.category}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: '1.4' }}>
                {tpl.description}
              </p>
              <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--color-text-muted)' }}>
                <span>Nós: {tpl.nodes.length}</span> · <span>Conexões: {tpl.edges.length}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
