import React from 'react'

export interface SelectionAnalysis {
  intent: 'question' | 'decision' | 'action_item' | 'note' | 'prompt'
  summary: string
  suggestions: Array<{
    id: string
    label: string
    description: string
  }>
}

interface Props {
  selectedText: string
  analysis: SelectionAnalysis | null
  isAnalyzing: boolean
  onClose: () => void
  onPinHighlight: (text: string) => void
  onAddToNote: (text: string) => void
  onMarkAction: (text: string) => void
  onMarkDecision: (text: string) => void
  onSearchProject: (query: string) => void
  onSearchWeb: (query: string) => void
}

export const SelectionActionBar: React.FC<Props> = ({
  selectedText,
  analysis,
  isAnalyzing,
  onClose,
  onPinHighlight,
  onAddToNote,
  onMarkAction,
  onMarkDecision,
  onSearchProject,
  onSearchWeb,
}) => {
  if (!selectedText.trim()) return null

  const intentTheme = {
    question: { label: 'Pergunta', color: '#3b82f6', bg: 'rgba(59,130,246,0.14)' },
    decision: { label: 'Decisão', color: '#8b5cf6', bg: 'rgba(139,92,246,0.14)' },
    action_item: { label: 'Ação', color: '#22c55e', bg: 'rgba(34,197,94,0.14)' },
    prompt: { label: 'Comando', color: '#f59e0b', bg: 'rgba(245,158,11,0.14)' },
    note: { label: 'Trecho', color: 'var(--color-primary)', bg: 'color-mix(in srgb, var(--color-primary) 14%, transparent)' },
  }[analysis?.intent || 'note']

  return (
    <div
      style={{
        padding: '10px 14px',
        borderRadius: '10px',
        border: '1px solid var(--color-border)',
        background: 'var(--color-surface)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px',
        fontSize: '12px',
        userSelect: 'none',
      }}
    >
      {/* Lado Esquerdo: Trecho e Intent Badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
        <span
          style={{
            fontSize: '9.5px',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            padding: '2px 8px',
            borderRadius: '12px',
            color: intentTheme.color,
            background: intentTheme.bg,
            border: `1px solid ${intentTheme.color}33`,
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {isAnalyzing ? 'Analisando...' : intentTheme.label}
        </span>

        <span
          style={{
            fontWeight: 600,
            color: 'var(--color-text)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            minWidth: 0,
          }}
        >
          "{selectedText}"
        </span>
      </div>

      {/* Lado Direito: Ações Contextuais em 1 clique */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
        <button
          type="button"
          onClick={() => onPinHighlight(selectedText)}
          title="Destacar este trecho"
          style={{
            padding: '4px 8px',
            height: '26px',
            borderRadius: '5px',
            border: '1px solid var(--color-border)',
            background: 'var(--color-background)',
            color: 'var(--color-text)',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            whiteSpace: 'nowrap',
            lineHeight: 1,
          }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
          <span>Destacar</span>
        </button>

        <button
          type="button"
          onClick={() => onAddToNote(selectedText)}
          title="Adicionar à nota organizada"
          style={{
            padding: '4px 8px',
            height: '26px',
            borderRadius: '5px',
            border: '1px solid var(--color-border)',
            background: 'var(--color-background)',
            color: 'var(--color-text)',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            whiteSpace: 'nowrap',
            lineHeight: 1,
          }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          <span>Adicionar Nota</span>
        </button>

        <button
          type="button"
          onClick={() => onMarkAction(selectedText)}
          title="Transformar em Tarefa"
          style={{
            padding: '4px 8px',
            height: '26px',
            borderRadius: '5px',
            border: '1px solid var(--color-border)',
            background: 'var(--color-background)',
            color: '#22c55e',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            whiteSpace: 'nowrap',
            lineHeight: 1,
          }}
        >
          <span>+ Tarefa</span>
        </button>

        <button
          type="button"
          onClick={() => onMarkDecision(selectedText)}
          title="Marcar como Decisão"
          style={{
            padding: '4px 8px',
            height: '26px',
            borderRadius: '5px',
            border: '1px solid var(--color-border)',
            background: 'var(--color-background)',
            color: '#8b5cf6',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            whiteSpace: 'nowrap',
            lineHeight: 1,
          }}
        >
          <span>+ Decisão</span>
        </button>

        <button
          type="button"
          onClick={() => onSearchProject(selectedText)}
          title="Pesquisar no Projeto Local"
          style={{
            padding: '4px 8px',
            height: '26px',
            borderRadius: '5px',
            border: '1px solid var(--color-border)',
            background: 'var(--color-background)',
            color: 'var(--color-text)',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            whiteSpace: 'nowrap',
            lineHeight: 1,
          }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span>Projeto</span>
        </button>

        <button
          type="button"
          onClick={() => onSearchWeb(selectedText)}
          title="Pesquisar na Web"
          style={{
            padding: '4px 8px',
            height: '26px',
            borderRadius: '5px',
            border: '1px solid var(--color-border)',
            background: 'var(--color-background)',
            color: 'var(--color-text)',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            whiteSpace: 'nowrap',
            lineHeight: 1,
          }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="2" y1="12" x2="22" y2="12" />
          </svg>
          <span>Web</span>
        </button>

        <button
          type="button"
          onClick={onClose}
          style={{
            padding: '4px 6px',
            height: '26px',
            borderRadius: '5px',
            border: '1px solid var(--color-border)',
            background: 'var(--color-background)',
            color: 'var(--color-text-muted)',
            fontSize: '11px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          ✕
        </button>
      </div>
    </div>
  )
}
