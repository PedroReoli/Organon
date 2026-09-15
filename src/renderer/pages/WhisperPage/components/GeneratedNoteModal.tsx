import React, { useState } from 'react'

export interface TranscriptNoteData {
  title: string
  markdown: string
  summary: string
  highlights: string[]
  questions: string[]
  decisions: string[]
  actionItems: string[]
  words: number
  segments: number
}

interface Props {
  isOpen: boolean
  noteData: TranscriptNoteData | null
  onClose: () => void
  onExportToNotes?: (markdown: string, title: string) => void
}

export const GeneratedNoteModal: React.FC<Props> = ({
  isOpen,
  noteData,
  onClose,
  onExportToNotes,
}) => {
  const [copied, setCopied] = useState(false)
  const [activeView, setActiveView] = useState<'structured' | 'markdown'>('structured')

  if (!isOpen || !noteData) return null

  const handleCopy = () => {
    navigator.clipboard.writeText(noteData.markdown)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleExport = () => {
    if (onExportToNotes) {
      onExportToNotes(noteData.markdown, noteData.title)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.72)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        backdropFilter: 'blur(6px)',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '760px',
          maxWidth: '94vw',
          maxHeight: '88vh',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '16px',
          display: 'flex',
          flexDirection: 'column',
          color: 'var(--color-text)',
          boxShadow: '0 24px 48px rgba(0,0,0,0.4)',
          overflow: 'hidden',
        }}
      >
        {/* Header do Modal */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            background: 'var(--color-surface)',
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.6px',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  background: 'color-mix(in srgb, var(--color-primary) 14%, transparent)',
                  color: 'var(--color-primary)',
                  border: '1px solid color-mix(in srgb, var(--color-primary) 25%, transparent)',
                }}
              >
                Nota Gerada com Sucesso
              </span>
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                {noteData.words} palavras · {noteData.segments} trechos
              </span>
            </div>

            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {noteData.title}
            </h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <button
              onClick={handleCopy}
              style={{
                padding: '6px 12px',
                height: '30px',
                borderRadius: '6px',
                border: '1px solid var(--color-border)',
                background: copied ? 'rgba(34,197,94,0.12)' : 'var(--color-background)',
                color: copied ? '#22c55e' : 'var(--color-text)',
                fontSize: '11.5px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
                lineHeight: 1,
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              <span>{copied ? 'Copiado!' : 'Copiar Nota'}</span>
            </button>

            {onExportToNotes && (
              <button
                onClick={handleExport}
                style={{
                  padding: '6px 14px',
                  height: '30px',
                  borderRadius: '6px',
                  border: 'none',
                  background: 'var(--color-primary)',
                  color: '#ffffff',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap',
                  lineHeight: 1,
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <span>Exportar para Notas</span>
              </button>
            )}

            <button
              onClick={onClose}
              title="Fechar"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-text-muted)',
                fontSize: '16px',
                cursor: 'pointer',
                padding: '4px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Seletor de Modo de Visualização (Estruturada vs Markdown Bruto) */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)', padding: '0 20px' }}>
          <button
            onClick={() => setActiveView('structured')}
            style={{
              padding: '10px 16px',
              fontSize: '12px',
              fontWeight: 700,
              border: 'none',
              background: 'transparent',
              color: activeView === 'structured' ? 'var(--color-primary)' : 'var(--color-text-muted)',
              borderBottom: activeView === 'structured' ? '2px solid var(--color-primary)' : '2px solid transparent',
              cursor: 'pointer',
            }}
          >
            Visualização Estruturada
          </button>
          <button
            onClick={() => setActiveView('markdown')}
            style={{
              padding: '10px 16px',
              fontSize: '12px',
              fontWeight: 700,
              border: 'none',
              background: 'transparent',
              color: activeView === 'markdown' ? 'var(--color-primary)' : 'var(--color-text-muted)',
              borderBottom: activeView === 'markdown' ? '2px solid var(--color-primary)' : '2px solid transparent',
              cursor: 'pointer',
            }}
          >
            Markdown Bruto
          </button>
        </div>

        {/* Conteúdo da Nota */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {activeView === 'structured' ? (
            <>
              {/* Card Resumo */}
              <div style={{ padding: '14px 16px', borderRadius: '10px', border: '1px solid var(--color-border)', background: 'var(--color-background)' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-primary)', marginBottom: '6px' }}>
                  Resumo Executivo
                </div>
                <div style={{ fontSize: '13px', lineHeight: 1.5, color: 'var(--color-text)' }}>
                  {noteData.summary}
                </div>
              </div>

              {/* Seção 1: Perguntas Detectadas */}
              {noteData.questions.length > 0 && (
                <div style={{ padding: '14px 16px', borderRadius: '10px', border: '1px solid var(--color-border)', background: 'var(--color-background)' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#3b82f6', marginBottom: '8px' }}>
                    Perguntas Identificadas ({noteData.questions.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {noteData.questions.map((q, idx) => (
                      <div key={idx} style={{ fontSize: '12.5px', color: 'var(--color-text)', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                        <span style={{ color: '#3b82f6', fontWeight: 700 }}>?</span>
                        <span>{q}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Seção 2: Decisões */}
              {noteData.decisions.length > 0 && (
                <div style={{ padding: '14px 16px', borderRadius: '10px', border: '1px solid var(--color-border)', background: 'var(--color-background)' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#8b5cf6', marginBottom: '8px' }}>
                    Decisões Tomadas ({noteData.decisions.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {noteData.decisions.map((d, idx) => (
                      <div key={idx} style={{ fontSize: '12.5px', color: 'var(--color-text)', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                        <span style={{ color: '#8b5cf6', fontWeight: 700 }}>✓</span>
                        <span>{d}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Seção 3: Ações Pendentes */}
              {noteData.actionItems.length > 0 && (
                <div style={{ padding: '14px 16px', borderRadius: '10px', border: '1px solid var(--color-border)', background: 'var(--color-background)' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#22c55e', marginBottom: '8px' }}>
                    Tarefas e Ações ({noteData.actionItems.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {noteData.actionItems.map((a, idx) => (
                      <div key={idx} style={{ fontSize: '12.5px', color: 'var(--color-text)', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                        <span style={{ color: '#22c55e', fontWeight: 700 }}>▶</span>
                        <span>{a}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Seção 4: Trechos Selecionados / Destaques */}
              {noteData.highlights.length > 0 && (
                <div style={{ padding: '14px 16px', borderRadius: '10px', border: '1px solid var(--color-border)', background: 'var(--color-background)' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-muted)', marginBottom: '8px' }}>
                    Destaques Principais ({noteData.highlights.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {noteData.highlights.map((h, idx) => (
                      <div key={idx} style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontStyle: 'italic', borderLeft: '2px solid var(--color-primary)', paddingLeft: '8px' }}>
                        "{h}"
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <textarea
              readOnly
              value={noteData.markdown}
              rows={18}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid var(--color-border)',
                background: 'var(--color-background)',
                color: 'var(--color-text)',
                fontSize: '12.5px',
                fontFamily: 'monospace',
                lineHeight: 1.5,
                resize: 'none',
                outline: 'none',
              }}
            />
          )}
        </div>

        {/* Rodapé Fixo */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', background: 'var(--color-surface)' }}>
          <button
            onClick={onClose}
            style={{
              padding: '6px 16px',
              height: '30px',
              borderRadius: '6px',
              border: '1px solid var(--color-border)',
              background: 'var(--color-background)',
              color: 'var(--color-text)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Concluído
          </button>
        </div>
      </div>
    </div>
  )
}
