import React, { useState } from 'react'
import { MeetingIntelligenceData } from '../../../services/meetingIntelligence/types'
import { MeetingAuditLogModal } from './MeetingAuditLogModal'

interface Props {
  data: MeetingIntelligenceData
  agentProviderName?: string
}

export const MeetingIntelligencePanel: React.FC<Props> = ({ data, agentProviderName = 'Codex AI Orchestrator' }) => {
  const [isAuditOpen, setIsAuditOpen] = useState(false)
  const [filterMode, setFilterMode] = useState<'all' | 'findings' | 'decisions' | 'actions'>('all')
  const [copyFeedback, setCopyFeedback] = useState(false)

  const openSource = async (pathOrUrl: string) => {
    if (pathOrUrl.startsWith('file://')) {
      const withoutHash = pathOrUrl.split('#', 1)[0]
      const decoded = decodeURIComponent(withoutHash.replace(/^file:\/\/+/, ''))
      const normalized = decoded.replace(/^\/([A-Za-z]:)/, '$1')
      if (window.electronAPI?.openPath) {
        await window.electronAPI.openPath(normalized)
        return
      }
    }

    if (window.electronAPI?.openExternal) {
      await window.electronAPI.openExternal(pathOrUrl)
    }
  }

  const handleCopySummary = () => {
    const textLines: string[] = []
    textLines.push(`=== RELATÓRIO DE INTELIGÊNCIA DA REUNIÃO ===`)
    if (data.currentTopic) textLines.push(`Tópico Atual: ${data.currentTopic}`)
    textLines.push('')

    if (data.findings.length > 0) {
      textLines.push(`--- RESPOSTAS E PESQUISAS (${data.findings.length}) ---`)
      data.findings.forEach(f => {
        textLines.push(`• Perguntas: ${f.question}`)
        textLines.push(`  Resumo: ${f.summary}`)
        f.sources.forEach(s => textLines.push(`  Fonte: ${s.title} — ${s.pathOrUrl} ${s.lineRange || ''}`))
      })
      textLines.push('')
    }

    if (data.decisions.length > 0) {
      textLines.push(`--- DECISÕES TOMADAS (${data.decisions.length}) ---`)
      data.decisions.forEach(d => textLines.push(`✓ ${d.text}`))
      textLines.push('')
    }

    if (data.actionItems.length > 0) {
      textLines.push(`--- TAREFAS E AÇÕES (${data.actionItems.length}) ---`)
      data.actionItems.forEach(a => textLines.push(`[ ] ${a.task}`))
      textLines.push('')
    }

    navigator.clipboard.writeText(textLines.join('\n'))
    setCopyFeedback(true)
    setTimeout(() => setCopyFeedback(false), 2000)
  }

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--color-background)',
        borderLeft: '1px solid var(--color-border)',
        overflowY: 'auto',
        padding: '14px',
        fontSize: '12px',
      }}
    >
      {isAuditOpen && (
        <MeetingAuditLogModal
          logs={data.auditLog}
          onClose={() => setIsAuditOpen(false)}
        />
      )}

      {/* Header do Painel */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid var(--color-border)', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '10.5px', fontWeight: 800, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <span>Respostas dos agentes</span>
          </div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {agentProviderName}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          <button
            onClick={handleCopySummary}
            style={{
              padding: '4px 10px',
              height: '28px',
              borderRadius: '6px',
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface)',
              color: copyFeedback ? '#22c55e' : 'var(--color-text)',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px',
              whiteSpace: 'nowrap',
              lineHeight: '1',
              flexShrink: 0,
            }}
            title="Copiar relatório formatado para a área de transferência"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            <span>{copyFeedback ? 'Copiado!' : 'Copiar'}</span>
          </button>

          <button
            onClick={() => setIsAuditOpen(true)}
            style={{
              padding: '4px 10px',
              height: '28px',
              borderRadius: '6px',
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface)',
              color: 'var(--color-text)',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px',
              whiteSpace: 'nowrap',
              lineHeight: '1',
              flexShrink: 0,
            }}
            title="Ver registro completo de auditoria de chamadas dos agentes"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <span>Auditoria ({data.auditLog.length})</span>
          </button>
        </div>
      </div>

      {/* Barra de Filtros Rápidos */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
        {[
          { id: 'all', label: 'Tudo' },
          { id: 'findings', label: `Respostas (${data.findings.length})` },
          { id: 'decisions', label: `Decisões (${data.decisions.length})` },
          { id: 'actions', label: `Tarefas (${data.actionItems.length})` },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilterMode(tab.id as any)}
            style={{
              padding: '3px 8px',
              borderRadius: '4px',
              border: '1px solid',
              borderColor: filterMode === tab.id ? 'var(--color-primary)' : 'var(--color-border)',
              background: filterMode === tab.id ? 'color-mix(in srgb, var(--color-primary) 12%, transparent)' : 'var(--color-surface)',
              color: filterMode === tab.id ? 'var(--color-primary)' : 'var(--color-text-muted)',
              fontSize: '10.5px',
              fontWeight: filterMode === tab.id ? 700 : 500,
              cursor: 'pointer',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tópico Atual */}
      {data.currentTopic && (
        <div style={{ padding: '8px 10px', background: 'color-mix(in srgb, var(--color-primary) 10%, var(--color-surface))', borderRadius: '6px', border: '1px solid color-mix(in srgb, var(--color-primary) 25%, transparent)', marginBottom: '12px' }}>
          <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--color-primary)', textTransform: 'uppercase', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span>Tópico em Análise</span>
          </div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text)' }}>
            {data.currentTopic}
          </div>
        </div>
      )}

      {/* Perguntas Detectadas */}
      <div style={{ marginBottom: '14px' }}>
        <div style={{ fontSize: '10.5px', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <circle cx="12" cy="18" r="1" />
            <circle cx="12" cy="12" r="10" />
          </svg>
          <span>Perguntas Detectadas ({data.questions.length})</span>
        </div>
        {data.questions.length === 0 ? (
          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontStyle: 'italic', padding: '6px 8px', background: 'var(--color-surface)', borderRadius: '6px' }}>
            Nenhuma pergunta capturada ainda.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {data.questions.slice(0, 5).map(question => (
              <div
                key={question.id}
                style={{
                  padding: '6px 8px',
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '5px',
                  fontSize: '11.5px',
                  color: 'var(--color-text)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '6px',
                }}
              >
                <span style={{ color: 'var(--color-primary)', fontWeight: 800 }}>?</span>
                <div>
                  <div>{question.text}</div>
                  <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                    {question.timestamp}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Achados no Projeto & Fontes */}
      {(filterMode === 'all' || filterMode === 'findings') && (
        <div style={{ marginBottom: '14px' }}>
          <div style={{ fontSize: '10.5px', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
            <span>Respostas e relatórios ({data.findings.length})</span>
          </div>

          {data.findings.length === 0 ? (
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontStyle: 'italic', padding: '6px 8px', background: 'var(--color-surface)', borderRadius: '6px' }}>
              Faça uma pergunta ou inicie a reunião para receber respostas com fontes.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {data.findings.map(finding => (
                <div
                  key={finding.id}
                  style={{
                    padding: '8px 10px',
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '6px',
                  }}
                >
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '3px' }}>
                    "{finding.question}"
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--color-text)', whiteSpace: 'pre-wrap', marginBottom: '6px', lineHeight: '1.4' }}>
                    {finding.summary}
                  </div>

                  {finding.sources && finding.sources.length > 0 && (
                    <div style={{ marginTop: '4px', paddingTop: '4px', borderTop: '1px dashed var(--color-border)' }}>
                      <div style={{ fontSize: '9.5px', fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: '3px', textTransform: 'uppercase' }}>
                        Fontes consultadas:
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        {finding.sources.map((src, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => { void openSource(src.pathOrUrl) }}
                            style={{
                              fontSize: '10.5px',
                              color: 'var(--color-primary)',
                              textDecoration: 'none',
                              fontFamily: 'monospace',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              background: 'none',
                              border: 'none',
                              padding: 0,
                              cursor: 'pointer',
                              textAlign: 'left',
                            }}
                          >
                            {src.type === 'project' ? (
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                              </svg>
                            ) : (
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="2" y1="12" x2="22" y2="12" />
                              </svg>
                            )}
                            <span>{src.title} {src.lineRange || ''}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Decisões Tomadas */}
      {(filterMode === 'all' || filterMode === 'decisions') && (
        <div style={{ marginBottom: '14px' }}>
          <div style={{ fontSize: '10.5px', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <span>Decisões Tomadas ({data.decisions.length})</span>
          </div>
          {data.decisions.length === 0 ? (
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontStyle: 'italic', padding: '6px 8px', background: 'var(--color-surface)', borderRadius: '6px' }}>
              Nenhuma decisão registrada.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {data.decisions.map(d => (
                <div key={d.id} style={{ padding: '6px 8px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '5px', fontSize: '11.5px', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>{d.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Ações e Próximos Passos */}
      {(filterMode === 'all' || filterMode === 'actions') && (
        <div>
          <div style={{ fontSize: '10.5px', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 11 12 14 22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
            <span>Ações e Próximos Passos ({data.actionItems.length})</span>
          </div>
          {data.actionItems.length === 0 ? (
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontStyle: 'italic', padding: '6px 8px', background: 'var(--color-surface)', borderRadius: '6px' }}>
              Nenhuma tarefa atribuída ainda.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {data.actionItems.map(a => (
                <div key={a.id} style={{ padding: '6px 8px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '5px', fontSize: '11.5px', color: 'var(--color-text)' }}>
                  <span>• {a.task}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
