import { useState } from 'react'
import type { ClipboardCategory, ClipboardContentType } from '@types'
import { CONTENT_TYPE_LABELS, CONTENT_TYPE_ORDER } from './clipboardClassifier'

export type ClipboardFolderSelection =
  | { kind: 'all' }
  | { kind: 'auto'; contentType: ClipboardContentType }
  | { kind: 'manual'; categoryId: string }

interface ClipboardSidebarProps {
  categories:        ClipboardCategory[]
  selectedFolder:    ClipboardFolderSelection
  onSelect:          (folder: ClipboardFolderSelection) => void
  onAddCategory:     (name: string) => void
  onRenameCategory:  (id: string, name: string) => void
  onRemoveCategory:  (id: string) => void
  itemCountByCategory: Record<string, number>
  itemCountByType:   Record<ClipboardContentType, number>
  totalCount: number
}

export const ClipboardSidebar = ({
  categories,
  selectedFolder,
  onSelect,
  onAddCategory,
  onRenameCategory,
  onRemoveCategory,
  itemCountByCategory,
  itemCountByType,
  totalCount,
}: ClipboardSidebarProps) => {
  const [showForm,    setShowForm]    = useState(false)
  const [newName,     setNewName]     = useState('')
  const [editingId,   setEditingId]   = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')

  const handleAdd = () => {
    if (!newName.trim()) return
    onAddCategory(newName.trim())
    setNewName('')
    setShowForm(false)
  }

  const handleSaveEdit = (id: string) => {
    if (editingName.trim()) onRenameCategory(id, editingName.trim())
    setEditingId(null)
  }

  const sorted = [...categories].sort((a, b) => a.order - b.order)

  return (
    <aside className="cb-sidebar">
      <div className="cb-sidebar-header">
        <span className="cb-sidebar-title">Pastas</span>
        <button
          type="button"
          className="cb-sidebar-add-btn"
          onClick={() => setShowForm(v => !v)}
          title="Nova pasta"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>

      {showForm && (
        <div className="cb-sidebar-form">
          <input
            autoFocus
            className="cb-input"
            placeholder="Nome da pasta"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setShowForm(false) }}
          />
          <button type="button" className="cb-btn-primary cb-btn-sm" onClick={handleAdd}>Criar</button>
        </div>
      )}

      <nav className="cb-sidebar-nav">
        <button
          type="button"
          className={`cb-sidebar-item ${selectedFolder.kind === 'all' ? 'is-active' : ''}`}
          onClick={() => onSelect({ kind: 'all' })}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
            <rect x="3" y="7" width="14" height="4" rx="1" />
            <rect x="3" y="13" width="18" height="4" rx="1" />
          </svg>
          <span>Todos</span>
          <span className="cb-sidebar-count">{totalCount}</span>
        </button>

        <div className="cb-sidebar-section">
          <span className="cb-sidebar-section-title">Automático</span>
          {CONTENT_TYPE_ORDER.map(contentType => {
            const isActive = selectedFolder.kind === 'auto' && selectedFolder.contentType === contentType
            return (
              <button
                key={contentType}
                type="button"
                className={`cb-sidebar-item ${isActive ? 'is-active' : ''}`}
                onClick={() => onSelect({ kind: 'auto', contentType })}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                  <path d="M4 7h16M7 4v16M17 4v16" />
                </svg>
                <span className="cb-sidebar-label">{CONTENT_TYPE_LABELS[contentType]}</span>
                <span className="cb-sidebar-count">{itemCountByType[contentType] ?? 0}</span>
              </button>
            )
          })}
        </div>

        <div className="cb-sidebar-section">
          <span className="cb-sidebar-section-title">Pastas manuais</span>
        </div>

        {sorted.map(cat => (
          <div
            key={cat.id}
            className={`cb-sidebar-item-wrap ${selectedFolder.kind === 'manual' && selectedFolder.categoryId === cat.id ? 'is-active' : ''}`}
          >
            {editingId === cat.id ? (
              <div className="cb-sidebar-form">
                <input
                  autoFocus
                  className="cb-input cb-input-sm"
                  value={editingName}
                  onChange={e => setEditingName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(cat.id); if (e.key === 'Escape') setEditingId(null) }}
                />
              </div>
            ) : (
              <button
                type="button"
                className={`cb-sidebar-item ${selectedFolder.kind === 'manual' && selectedFolder.categoryId === cat.id ? 'is-active' : ''}`}
                onClick={() => onSelect({ kind: 'manual', categoryId: cat.id })}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                  <path d="M3 7h4l2-2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
                </svg>
                <span className="cb-sidebar-label">{cat.name}</span>
                <span className="cb-sidebar-count">{itemCountByCategory[cat.id] ?? 0}</span>
              </button>
            )}

            <div className="cb-sidebar-actions">
              <button
                type="button"
                className="cb-icon-btn"
                title="Renomear"
                onClick={() => { setEditingId(cat.id); setEditingName(cat.name) }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z" />
                </svg>
              </button>
              <button
                type="button"
                className="cb-icon-btn cb-icon-btn-danger"
                title="Remover pasta"
                onClick={() => onRemoveCategory(cat.id)}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                  <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </nav>
    </aside>
  )
}
