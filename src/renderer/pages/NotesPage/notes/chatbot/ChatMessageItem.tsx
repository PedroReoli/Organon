import React from 'react'
import { Copy, Check, FileText } from 'lucide-react'
import { Message, NoteContext } from './chatbot.types'

interface ChatMessageItemProps {
  message: Message
  notes?: Array<{ id: string; title: string; content: string; folderId?: string | null }>
  copiedId: string | null
  onCopy: (text: string, msgId: string) => void
  onNavigateToNote?: (noteId: string) => void
  onApplyNote?: (noteId: string | undefined, content: string) => void
  onCreateNote?: (title: string, content: string, folderId?: string | null) => void
}

const NoteReference: React.FC<{ note: NoteContext; onClick?: () => void }> = ({ note, onClick }) => (
  <button
    type="button"
    className="chatbot-note-ref"
    onClick={onClick}
    title={`Similaridade: ${Math.round(note.similarity * 100)}%`}
  >
    <span className="chatbot-note-ref-icon" style={{ display: 'inline-flex', alignItems: 'center' }}>
      <FileText size={13} />
    </span>
    <span className="chatbot-note-ref-title">{note.title}</span>
    <span className="chatbot-note-ref-score">{Math.round(note.similarity * 100)}%</span>
  </button>
)

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({
  message: msg,
  notes = [],
  copiedId,
  onCopy,
  onNavigateToNote,
  onApplyNote,
  onCreateNote,
}) => {
  const isAssistant = msg.role === 'assistant'

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  const cleanContent = msg.content
    .replace(/\[ACTION:CREATE_NOTE\].*?\[\/ACTION\]/s, '')
    .replace(/\[ACTION:UPDATE_NOTE\].*?\[\/ACTION\]/s, '')
    .replace(/\[ACTION:MOVE_NOTE\].*?\[\/ACTION\]/s, '')
    .replace(/\[ACTION:CREATE_FOLDER\].*?\[\/ACTION\]/s, '')
    .replace(/\[ACTION:TOGGLE_HUB\].*?\[\/ACTION\]/s, '')
    .replace(/\[ACTION:RENAME_FOLDER\].*?\[\/ACTION\]/s, '')
    .trim()

  return (
    <div className={`chatbot-message chatbot-message-${msg.role}`}>
      <div className="chatbot-message-avatar">
        {isAssistant ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <rect x="3" y="11" width="18" height="10" rx="2" />
            <circle cx="12" cy="5" r="2" />
            <path d="M12 7v4" />
            <line x1="8" y1="16" x2="8" y2="16" />
            <line x1="16" y1="16" x2="16" y2="16" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        )}
      </div>

      <div className="chatbot-message-content">
        {msg.notes && msg.notes.length > 0 && (
          <div className="chatbot-message-notes">
            {msg.notes.map(note => (
              <NoteReference key={note.id} note={note} onClick={() => onNavigateToNote?.(note.id)} />
            ))}
          </div>
        )}

        <div className="chatbot-message-bubble">
          {cleanContent}

          {msg.actionPayload?.type === 'view_note' && (
            <div style={{ marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => {
                  const found = notes.find(n => n.title.toLowerCase() === msg.actionPayload?.title?.toLowerCase()) || notes[notes.length - 1]
                  if (found && onNavigateToNote) {
                    onNavigateToNote(found.id)
                  }
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  background: 'var(--color-primary)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  marginTop: '6px',
                }}
              >
                Ver Nota
              </button>
            </div>
          )}

          {isAssistant && msg.content && (
            <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => {
                  if (onApplyNote) {
                    onApplyNote(undefined, cleanContent)
                  }
                  const evt = new CustomEvent('organon:apply-note', { detail: { content: cleanContent } })
                  window.dispatchEvent(evt)
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '5px 10px',
                  background: 'rgba(99, 102, 241, 0.15)',
                  color: 'var(--color-primary)',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Escrever nesta Nota
              </button>

              <button
                type="button"
                onClick={() => {
                  const firstLine = cleanContent.split('\n')[0].replace(/^#+\s*/, '').slice(0, 40).trim() || 'Nova Nota do Assistente'
                  if (onCreateNote) {
                    onCreateNote(firstLine, cleanContent)
                  }
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '5px 10px',
                  background: 'var(--color-surface)',
                  color: 'var(--color-text)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Salvar como Nova Nota
              </button>
            </div>
          )}

          {msg.content && (
            <div className="chatbot-message-actions">
              <button
                className="chatbot-copy-btn"
                onClick={() => onCopy(cleanContent, msg.id)}
                title="Copiar"
                aria-label="Copiar"
              >
                {copiedId === msg.id ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
          )}
        </div>

        <div className="chatbot-message-time">{formatTime(msg.timestamp)}</div>
      </div>
    </div>
  )
}
