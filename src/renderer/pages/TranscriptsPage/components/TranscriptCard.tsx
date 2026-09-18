import React from 'react'
import type { Transcript } from '../types'

export interface TranscriptCardProps {
  transcript: Transcript
  isExpanded: boolean
  onToggleExpand: (id: string) => void
  onCopy: (text: string) => void
  onSendToAI: (text: string) => void
  onDelete: (id: string) => void
  formatDate: (iso: string) => string
}

export const TranscriptCard: React.FC<TranscriptCardProps> = ({
  transcript,
  isExpanded,
  onToggleExpand,
  onCopy,
  onSendToAI,
  onDelete,
  formatDate,
}) => {
  const wordCount = transcript.text.split(/\s+/).filter(Boolean).length
  const isLong = transcript.text.length > 220

  return (
    <div className={`transcripts-card ${isExpanded ? 'is-expanded' : ''}`}>
      <div className="transcripts-card-header">
        <div className="transcripts-card-meta">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transcripts-card-icon"
          >
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          </svg>
          <span className="transcripts-card-time">{formatDate(transcript.timestamp)}</span>
          <span className="transcripts-badge">{wordCount} palavras</span>
        </div>

        <div className="transcripts-card-actions">
          <button
            className="transcripts-card-action"
            onClick={() => onCopy(transcript.text)}
            title="Copiar texto"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          </button>
          <button
            className="transcripts-card-action"
            onClick={() => onSendToAI(transcript.text)}
            title="Enviar para IA"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
          </button>
          <button
            className="transcripts-card-action transcripts-card-action-danger"
            onClick={() => onDelete(transcript.id)}
            title="Excluir"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
      </div>

      <div className={`transcripts-card-content ${isExpanded ? 'is-open' : ''}`}>
        {transcript.text}
      </div>

      {isLong && (
        <button className="transcripts-expand-btn" onClick={() => onToggleExpand(transcript.id)}>
          {isExpanded ? 'Ver menos ↑' : 'Ver tudo ↓'}
        </button>
      )}
    </div>
  )
}
