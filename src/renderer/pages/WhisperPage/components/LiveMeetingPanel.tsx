import React from 'react'
import { LiveReport } from '../types/whisper.types'
import type { MeetingIntelligenceData } from '../../../services/meetingIntelligence/types'

interface Props {
  liveReport: LiveReport
  isLiveRecording: boolean
  intelligenceData: MeetingIntelligenceData
  onSuggestion: (id: string, action: 'accept' | 'dismiss') => void
}

export const LiveMeetingPanel: React.FC<Props> = ({ liveReport, isLiveRecording, intelligenceData, onSuggestion }) => {
  const openQuestions = (intelligenceData.openQuestions || []).filter(item => item.status === 'open')
  const currentQuestion = openQuestions[0]?.text || liveReport.currentQuestion
  const discussedConcepts = intelligenceData.topics?.length
    ? intelligenceData.topics.slice(0, 12).map(item => item.label)
    : liveReport.discussedConcepts
  const forgottenPoints = [
    ...(intelligenceData.risks || []).filter(item => item.status === 'open').map(item => `Risco ${item.severity}: ${item.text}`),
    ...(intelligenceData.contradictions || []).filter(item => item.status === 'review').map(item => `Revisar possível contradição: ${item.currentStatement}`),
    ...liveReport.forgottenPoints,
  ].slice(0, 12)
  const actionItems = intelligenceData.actionItems.length
    ? intelligenceData.actionItems.filter(item => item.status === 'pending').map(item => `${item.task}${item.assignee ? ` — ${item.assignee}` : ''}${item.dueDate ? ` — prazo ${item.dueDate}` : ''}`)
    : liveReport.actionItems
  const suggestions = (intelligenceData.suggestions || []).filter(item => item.status === 'pending').slice(0, 4)
  const memory = intelligenceData.memory
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--color-background)',
        overflowY: 'auto',
        padding: '14px',
        userSelect: 'none',
        fontSize: '12px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', paddingBottom: '8px', borderBottom: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: 'var(--color-text)' }}>
            Relatório de Ata ao Vivo
          </h4>
        </div>
        {isLiveRecording && (
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '10.5px',
              color: '#ef4444',
              fontWeight: 800,
              background: 'rgba(239,68,68,0.12)',
              padding: '2px 7px',
              borderRadius: '99px',
            }}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444', animation: 'pulse 1s infinite' }} />
            AO VIVO
          </span>
        )}
      </div>

      {memory && memory.sourceMeetingIds.length > 0 && (
        <div style={{ marginBottom: '12px', padding: '9px', borderRadius: '6px', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>
          <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#3b82f6', textTransform: 'uppercase' }}>Preparação com memória · {memory.contextLabel}</div>
          <div style={{ marginTop: '4px', color: 'var(--color-text)', lineHeight: 1.4 }}>
            {memory.pendingActions.length} pendência(s), {memory.openQuestions.length} pergunta(s) aberta(s), {memory.risks.length} risco(s) em {memory.sourceMeetingIds.length} reunião(ões).
          </div>
        </div>
      )}

      {suggestions.length > 0 && (
        <div style={{ marginBottom: '14px' }}>
          <div style={{ fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase', color: '#8b5cf6', marginBottom: '6px' }}>Sugestões do copiloto</div>
          {suggestions.map(item => (
            <div key={item.id} style={{ padding: '8px', marginBottom: '5px', borderRadius: '6px', border: '1px solid rgba(139,92,246,0.25)', background: 'rgba(139,92,246,0.07)' }}>
              <strong style={{ color: 'var(--color-text)' }}>{item.title}</strong>
              <div style={{ color: 'var(--color-text-muted)', margin: '3px 0 6px' }}>{item.detail}</div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button type="button" className="whisper-btn-outline" onClick={() => onSuggestion(item.id, 'accept')}>Aplicar</button>
                <button type="button" className="whisper-btn-outline" onClick={() => onSuggestion(item.id, 'dismiss')}>Ignorar</button>
                <span style={{ marginLeft: 'auto', color: 'var(--color-text-muted)', fontSize: '10px' }}>{Math.round(item.confidence * 100)}%</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pergunta / Tópico Atual */}
      <div style={{ marginBottom: '14px', padding: '10px', borderRadius: '6px', background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <div style={{ fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-primary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span>Pergunta / Dúvida Atual</span>
        </div>
        <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text)', lineHeight: '1.4' }}>
          {currentQuestion || 'Aguardando início da fala...'}
        </p>
      </div>

      {/* Conceitos Discutidos */}
      <div style={{ marginBottom: '14px' }}>
        <div style={{ fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          <span>Conceitos Abordados</span>
        </div>
        {discussedConcepts.length === 0 ? (
          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Nenhum conceito registrado ainda.</span>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
            {discussedConcepts.map((item, idx) => (
              <span
                key={idx}
                style={{
                  fontSize: '10.5px',
                  padding: '2px 7px',
                  borderRadius: '5px',
                  background: 'color-mix(in srgb, var(--color-primary) 12%, transparent)',
                  color: 'var(--color-primary)',
                  fontWeight: 600,
                }}
              >
                {item}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Pontos Esquecidos / Alertas */}
      <div style={{ marginBottom: '14px' }}>
        <div style={{ fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase', color: '#f97316', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span>Pontos a Mencionar</span>
        </div>
        {forgottenPoints.length === 0 ? (
          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Tudo coberto até o momento.</span>
        ) : (
          <ul style={{ margin: 0, paddingLeft: '14px', fontSize: '11.5px', color: 'var(--color-text)' }}>
            {forgottenPoints.map((pt, idx) => (
              <li key={idx} style={{ marginBottom: '3px' }}>{pt}</li>
            ))}
          </ul>
        )}
      </div>

      {/* Compromissos e Ações */}
      <div>
        <div style={{ fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase', color: '#22c55e', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 11 12 14 22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
          <span>Próximos Passos & Ações</span>
        </div>
        {actionItems.length === 0 ? (
          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Nenhuma ação anotada.</span>
        ) : (
          <ul style={{ margin: 0, paddingLeft: '14px', fontSize: '11.5px', color: 'var(--color-text)' }}>
            {actionItems.map((act, idx) => (
              <li key={idx} style={{ marginBottom: '3px' }}>{act}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
