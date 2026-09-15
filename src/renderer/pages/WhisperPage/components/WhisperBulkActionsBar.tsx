import React from 'react'

interface WhisperBulkActionsBarProps {
  selectedCount: number
  totalCount: number
  onSelectAll: () => void
  onBulkCopy: () => void
  onBulkHighlight: () => void
  onDeleteSelected: () => void
  onClearSelection: () => void
}

export const WhisperBulkActionsBar: React.FC<WhisperBulkActionsBarProps> = ({
  selectedCount,
  totalCount,
  onSelectAll,
  onBulkCopy,
  onBulkHighlight,
  onDeleteSelected,
  onClearSelection,
}) => {
  if (selectedCount === 0) return null

  return (
    <div
      style={{
        padding: '8px 12px',
        borderRadius: '8px',
        border: '1px solid var(--color-primary)',
        background: 'color-mix(in srgb, var(--color-primary) 10%, var(--color-surface))',
        boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '10px',
        fontSize: '12px',
        marginBottom: '8px',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          type="button"
          onClick={onSelectAll}
          style={{
            padding: '3px 8px',
            borderRadius: '4px',
            border: '1px solid var(--color-border)',
            background: 'var(--color-surface)',
            color: 'var(--color-text)',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {selectedCount === totalCount ? 'Desmarcar Todos' : 'Selecionar Todos'}
        </button>
        <span style={{ fontWeight: 800, color: 'var(--color-primary)' }}>
          {selectedCount} trecho(s) selecionado(s)
        </span>
        <span style={{ fontSize: '10.5px', color: 'var(--color-text-muted)' }}>
          (Use Ctrl + Clique para alternar)
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <button
          type="button"
          onClick={onBulkCopy}
          style={{
            padding: '4px 10px',
            borderRadius: '5px',
            border: '1px solid var(--color-border)',
            background: 'var(--color-surface)',
            color: 'var(--color-text)',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          <span>Copiar</span>
        </button>

        <button
          type="button"
          onClick={onBulkHighlight}
          style={{
            padding: '4px 10px',
            borderRadius: '5px',
            border: '1px solid var(--color-border)',
            background: 'var(--color-surface)',
            color: 'var(--color-text)',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <span>Destacar</span>
        </button>

        <button
          type="button"
          onClick={onDeleteSelected}
          style={{
            padding: '4px 12px',
            borderRadius: '5px',
            border: 'none',
            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            color: '#ffffff',
            fontSize: '11px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            boxShadow: '0 2px 6px rgba(239, 68, 68, 0.25)',
          }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M3 6h18" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
          <span>Excluir Selecionados ({selectedCount})</span>
        </button>

        <button
          type="button"
          onClick={onClearSelection}
          style={{
            padding: '4px 8px',
            borderRadius: '5px',
            border: '1px solid var(--color-border)',
            background: 'var(--color-surface)',
            color: 'var(--color-text-muted)',
            fontSize: '11px',
            cursor: 'pointer',
          }}
        >
          ✕
        </button>
      </div>
    </div>
  )
}
