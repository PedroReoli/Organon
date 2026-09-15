import React from 'react'
import { Message } from './chatbot.types'

interface ChatMessageItemProps {
  message: Message
  onCopy: (text: string) => void
  onSpeak?: (text: string) => void
  isSpeaking?: boolean
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({
  message,
  onCopy,
  onSpeak,
  isSpeaking,
}) => {
  const isUser = message.role === 'user'

  return (
    <div
      className={`chat-message ${isUser ? 'user' : 'assistant'}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isUser ? 'flex-end' : 'flex-start',
        marginBottom: '12px',
      }}
    >
      <div
        style={{
          maxWidth: '85%',
          padding: '10px 14px',
          borderRadius: isUser ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
          background: isUser ? 'var(--color-primary)' : 'var(--color-surface-hover)',
          color: isUser ? '#ffffff' : 'var(--color-text)',
          fontSize: '13.5px',
          lineHeight: '1.5',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {message.content}
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        marginTop: '4px',
        fontSize: '11px',
        color: 'var(--color-text-muted)',
      }}>
        <span>{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        {!isUser && (
          <>
            <button
              onClick={() => onCopy(message.content)}
              title="Copiar mensagem"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0 }}
            >
              📋
            </button>
            {onSpeak && (
              <button
                onClick={() => onSpeak(message.content)}
                title={isSpeaking ? 'Parar leitura' : 'Ouvir mensagem'}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: isSpeaking ? 'var(--color-primary)' : 'inherit', padding: 0 }}
              >
                🔊
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
