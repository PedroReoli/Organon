import React from 'react'

export interface WhisperRecordDialogsProps {
  renamingRecord: { id: string; title: string } | null
  onRenamingChange: (record: { id: string; title: string } | null) => void
  onConfirmRename: () => void
  deletingRecord: { id: string; title: string } | null
  onCancelDelete: () => void
  onConfirmDelete: () => void
}

export const WhisperRecordDialogs: React.FC<WhisperRecordDialogsProps> = ({
  renamingRecord,
  onRenamingChange,
  onConfirmRename,
  deletingRecord,
  onCancelDelete,
  onConfirmDelete,
}) => {
  return (
    <>
      {/* Modal/Overlay Inline para Renomear */}
      {renamingRecord && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(2px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '12px',
              padding: '16px',
              width: '100%',
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            }}
          >
            <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: 700, color: 'var(--color-text)' }}>
              Renomear Gravação
            </h4>
            <input
              type="text"
              value={renamingRecord.title}
              onChange={e => onRenamingChange({ ...renamingRecord, title: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && onConfirmRename()}
              style={{
                width: '100%',
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid var(--color-border)',
                background: 'var(--color-background)',
                color: 'var(--color-text)',
                fontSize: '12px',
                outline: 'none',
                boxSizing: 'border-box',
                marginBottom: '12px',
              }}
              autoFocus
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => onRenamingChange(null)}
                style={{
                  padding: '5px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-background)',
                  color: 'var(--color-text)',
                  fontSize: '11.5px',
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={onConfirmRename}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  background: 'var(--color-primary)',
                  color: '#fff',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal/Overlay Inline para Deletar */}
      {deletingRecord && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(2px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '12px',
              padding: '16px',
              width: '100%',
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            }}
          >
            <h4 style={{ margin: '0 0 6px 0', fontSize: '13px', fontWeight: 700, color: 'var(--color-text)' }}>
              Excluir Gravação?
            </h4>
            <p style={{ margin: '0 0 14px 0', fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
              Tem certeza que deseja excluir "{deletingRecord.title}"? Esta ação não pode ser desfeita.
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={onCancelDelete}
                style={{
                  padding: '5px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-background)',
                  color: 'var(--color-text)',
                  fontSize: '11.5px',
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={onConfirmDelete}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#ef4444',
                  color: '#fff',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
