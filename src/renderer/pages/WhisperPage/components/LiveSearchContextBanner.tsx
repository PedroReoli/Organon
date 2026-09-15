import React from 'react'
import { MeetingIntelligenceData } from '../../../services/meetingIntelligence/types'

interface Props {
  data: MeetingIntelligenceData
  isRecording: boolean
}

export const LiveSearchContextBanner: React.FC<Props> = ({ data, isRecording }) => {
  const latestQuestion = data.questions[0]
  const latestFinding = data.findings[0]

  if (!isRecording && !latestQuestion && !latestFinding && !data.currentTopic) {
    return null
  }

  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        padding: '12px 16px',
        margin: '0 0 16px 0',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontSize: '10.5px',
              fontWeight: 800,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              color: 'var(--color-primary)',
              background: 'color-mix(in srgb, var(--color-primary) 12%, transparent)',
              padding: '3px 8px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            Pesquisa em Tempo Real
          </span>

          {data.currentTopic && (
            <span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--color-text)' }}>
              Tópico: <strong>{data.currentTopic}</strong>
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--color-text-muted)' }}>
          <span>Orquestração:</span>
          <span style={{ fontWeight: 700, color: 'var(--color-text)' }}>Agentes Codex CLI</span>
        </div>
      </div>

      {latestQuestion ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            background: 'color-mix(in srgb, var(--color-primary) 5%, var(--color-background))',
            padding: '10px 12px',
            borderRadius: '8px',
            border: '1px solid color-mix(in srgb, var(--color-primary) 15%, transparent)',
          }}
        >
          <div
            style={{
              width: '22px',
              height: '22px',
              borderRadius: '50%',
              background: 'var(--color-primary)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              fontWeight: 800,
              flexShrink: 0,
            }}
          >
            ?
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase' }}>
              Pergunta Detectada
            </div>
            <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--color-text)', marginTop: '2px' }}>
              "{latestQuestion.text}"
            </div>
          </div>
        </div>
      ) : (
        isRecording && (
          <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
            Escutando a conversa... Perguntas e dúvidas de código/arquitetura serão analisadas automaticamente.
          </div>
        )
      )}

      {latestFinding && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            background: 'var(--color-background)',
            padding: '10px 12px',
            borderRadius: '8px',
            border: '1px solid var(--color-border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#22c55e', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Achado Recente
            </span>
            <span style={{ fontSize: '10.5px', color: 'var(--color-text-muted)' }}>
              {latestFinding.sources.length} fonte(s) consultada(s)
            </span>
          </div>

          <div style={{ fontSize: '12px', color: 'var(--color-text)', lineHeight: 1.45 }}>
            {latestFinding.summary}
          </div>

          {latestFinding.sources.length > 0 && (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '2px' }}>
              {latestFinding.sources.map((src, idx) => (
                <span
                  key={idx}
                  style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: src.type === 'project' ? 'rgba(59, 130, 246, 0.12)' : 'rgba(168, 85, 247, 0.12)',
                    color: src.type === 'project' ? '#2563eb' : '#7c3aed',
                    border: '1px solid',
                    borderColor: src.type === 'project' ? 'rgba(59, 130, 246, 0.25)' : 'rgba(168, 85, 247, 0.25)',
                  }}
                >
                  {src.type === 'project' ? 'Código: ' : 'Web: '}
                  {src.title}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
