import React, { useEffect, useState } from 'react'
import type { KeyboardShortcut } from '@types'
import { Kbd } from '@shared/components/display'

interface KeyboardShortcutCaptureProps {
  shortcut: KeyboardShortcut
  onSave: (keys: string[]) => void
  onCancel: () => void
}

export const KeyboardShortcutCapture: React.FC<KeyboardShortcutCaptureProps> = ({
  shortcut,
  onSave,
  onCancel,
}) => {
  const [recordedKeys, setRecordedKeys] = useState<string[]>(Array.isArray(shortcut.keys) ? shortcut.keys : (shortcut.keys?.key ? [shortcut.keys.key] : []))

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()

      if (e.key === 'Escape') {
        onCancel()
        return
      }

      const keys: string[] = []
      if (e.ctrlKey || e.metaKey) keys.push('Control')
      if (e.altKey) keys.push('Alt')
      if (e.shiftKey) keys.push('Shift')

      const primaryKey = e.key.toUpperCase()
      if (!['CONTROL', 'ALT', 'SHIFT', 'META'].includes(primaryKey)) {
        keys.push(primaryKey)
      }

      if (keys.length > 0) {
        setRecordedKeys(keys)
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [onCancel])

  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        padding: '20px',
        maxWidth: '400px',
        margin: '20px auto',
        boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
        textAlign: 'center',
      }}
    >
      <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', color: 'var(--color-text)' }}>
        Pressione a nova combinação de teclas
      </h4>
      <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: 'var(--color-text-muted)' }}>
        Para: <strong>{shortcut.action}</strong>
      </p>

      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '6px',
          padding: '12px',
          background: 'var(--color-background)',
          borderRadius: '8px',
          border: '1px dashed var(--color-primary)',
          marginBottom: '16px',
        }}
      >
        {recordedKeys.length > 0 ? (
          recordedKeys.map((k, idx) => (
            <React.Fragment key={idx}>
              <Kbd>{k}</Kbd>
              {idx < recordedKeys.length - 1 && <span>+</span>}
            </React.Fragment>
          ))
        ) : (
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Pressione as teclas desejadas...</span>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: '6px 14px',
            borderRadius: '6px',
            border: '1px solid var(--color-border)',
            background: 'transparent',
            color: 'var(--color-text-muted)',
            cursor: 'pointer',
          }}
        >
          Cancelar (Esc)
        </button>
        <button
          type="button"
          onClick={() => onSave(recordedKeys)}
          style={{
            padding: '6px 14px',
            borderRadius: '6px',
            border: 'none',
            background: 'var(--color-primary)',
            color: '#fff',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Salvar Atalho
        </button>
      </div>
    </div>
  )
}
