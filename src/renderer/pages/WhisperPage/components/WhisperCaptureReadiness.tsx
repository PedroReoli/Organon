import React from 'react'
import { WhisperCaptureReadiness } from '../types/whisper.types'

interface Props {
  readiness: WhisperCaptureReadiness
}

export const WhisperCaptureReadinessCard: React.FC<Props> = ({ readiness }) => {
  return (
    <div
      style={{
        margin: '0 20px 12px 20px',
        padding: '12px 14px',
        borderRadius: '10px',
        border: '1px solid var(--color-border)',
        background: 'linear-gradient(180deg, color-mix(in srgb, var(--color-primary) 8%, var(--color-surface)), var(--color-surface))',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '8px' }}>
        <div>
          <div style={{ fontSize: '10.5px', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-primary)' }}>
            Base de Diarização
          </div>
          <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--color-text)' }}>
            {readiness.summary}
          </div>
        </div>
        <span
          style={{
            fontSize: '10px',
            fontWeight: 700,
            color: readiness.diarizationBaseReady ? '#22c55e' : '#f59e0b',
            background: readiness.diarizationBaseReady ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)',
            borderRadius: '999px',
            padding: '4px 8px',
            whiteSpace: 'nowrap',
          }}
        >
          {readiness.diarizationBaseReady ? 'Preparada' : 'Em evolução'}
        </span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {readiness.capabilities.map(cap => (
          <span
            key={cap.kind}
            title={cap.detail}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 8px',
              borderRadius: '999px',
              border: '1px solid',
              borderColor: cap.available ? 'rgba(34,197,94,0.25)' : 'var(--color-border)',
              background: cap.available ? 'rgba(34,197,94,0.1)' : 'var(--color-background)',
              color: cap.available ? '#15803d' : 'var(--color-text-muted)',
              fontSize: '10.5px',
              fontWeight: 700,
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: cap.available ? '#22c55e' : '#94a3b8',
              }}
            />
            {cap.label}
          </span>
        ))}
      </div>
    </div>
  )
}
