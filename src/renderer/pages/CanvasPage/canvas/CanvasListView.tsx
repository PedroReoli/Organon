import { useState } from 'react'
import type { CanvasItem } from '@api/canvas'

interface CanvasListViewProps {
  canvases:     CanvasItem[]
  loading:      boolean
  error:        string | null
  userLoggedIn: boolean
  onCreate:     (name: string) => void
  onOpen:       (id: string)   => void
  onDelete:     (id: string)   => void
  onRename:     (id: string, name: string) => void
}

const formatDate = (iso: string) => {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export const CanvasListView = ({
  canvases, loading, error, userLoggedIn,
  onCreate, onOpen, onDelete, onRename,
}: CanvasListViewProps) => {
  const [newName,       setNewName]       = useState('')
  const [showNewForm,   setShowNewForm]   = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [renameId,      setRenameId]      = useState<string | null>(null)
  const [renameValue,   setRenameValue]   = useState('')

  const handleCreate = () => {
    if (!newName.trim()) return
    onCreate(newName.trim())
    setNewName('')
    setShowNewForm(false)
  }

  const handleRenameSubmit = (id: string) => {
    if (!renameValue.trim()) { setRenameId(null); return }
    onRename(id, renameValue.trim())
    setRenameId(null)
  }

  if (!userLoggedIn) {
    return (
      <div className="cvl-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="40" height="40">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 9h18M9 21V9" />
        </svg>
        <p>Faça login para acessar seus canvases.</p>
      </div>
    )
  }

  return (
    <div className="cvl-layout">
      <div className="cvl-header">
        <h2 className="cvl-title">Canvas</h2>
        <div className="cvl-header-actions">
          {showNewForm ? (
            <div className="cvl-new-form">
              <input
                autoFocus
                className="cvl-new-input"
                placeholder="Nome do canvas..."
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleCreate()
                  if (e.key === 'Escape') { setShowNewForm(false); setNewName('') }
                }}
              />
              <button type="button" className="cvl-btn-primary" onClick={handleCreate}>Criar</button>
              <button type="button" className="cvl-btn-ghost" onClick={() => { setShowNewForm(false); setNewName('') }}>✕</button>
            </div>
          ) : (
            <button type="button" className="cvl-btn-primary" onClick={() => setShowNewForm(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                <path d="M12 5v14M5 12h14" strokeLinecap="round" />
              </svg>
              Novo canvas
            </button>
          )}
        </div>
      </div>

      {error && <div className="cvl-error">{error}</div>}

      {loading ? (
        <div className="cvl-empty">
          <p>Carregando...</p>
        </div>
      ) : canvases.length === 0 ? (
        <div className="cvl-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="40" height="40">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M8 12h8M12 8v8" strokeLinecap="round" />
          </svg>
          <p>Nenhum canvas ainda.</p>
          <button type="button" className="cvl-btn-primary" onClick={() => setShowNewForm(true)}>
            Criar primeiro canvas
          </button>
        </div>
      ) : (
        <div className="cvl-grid">
          {canvases.map(canvas => (
            <div key={canvas.id} className="cvl-card" onClick={() => onOpen(canvas.id)}>
              <div className="cvl-card-preview">
                {canvas.thumbnail ? (
                  <img src={canvas.thumbnail} alt={canvas.name} className="cvl-card-thumbnail" />
                ) : (
                  <div className="cvl-card-preview-empty">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="28" height="28">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="cvl-card-footer">
                {renameId === canvas.id ? (
                  <input
                    autoFocus
                    className="cvl-rename-input"
                    value={renameValue}
                    onChange={e => setRenameValue(e.target.value)}
                    onClick={e => e.stopPropagation()}
                    onKeyDown={e => {
                      e.stopPropagation()
                      if (e.key === 'Enter') handleRenameSubmit(canvas.id)
                      if (e.key === 'Escape') setRenameId(null)
                    }}
                    onBlur={() => handleRenameSubmit(canvas.id)}
                  />
                ) : (
                  <span className="cvl-card-name">{canvas.name}</span>
                )}
                <span className="cvl-card-date">{formatDate(canvas.updatedAt)}</span>
                <div className="cvl-card-actions" onClick={e => e.stopPropagation()}>
                  <button
                    type="button"
                    className="cvl-card-action-btn"
                    title="Renomear"
                    onClick={() => { setRenameId(canvas.id); setRenameValue(canvas.name) }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z" />
                    </svg>
                  </button>
                  {deleteConfirm === canvas.id ? (
                    <>
                      <button type="button" className="cvl-card-action-btn cvl-danger" onClick={() => { onDelete(canvas.id); setDeleteConfirm(null) }}>
                        Confirmar
                      </button>
                      <button type="button" className="cvl-card-action-btn" onClick={() => setDeleteConfirm(null)}>
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="cvl-card-action-btn"
                      title="Excluir"
                      onClick={() => setDeleteConfirm(canvas.id)}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                        <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" strokeLinecap="round" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
