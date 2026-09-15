/**
 * CanvasFolderSidebar — sidebar lateral com pastas de canvas (Upgrade 18).
 *
 * Permite criar/renomear/excluir pastas e filtrar a lista de canvas.
 * Atribuicao canvas -> pasta vive em store.canvasFolderAssignments.
 */

import React, { useState } from 'react'
import type { CanvasFolder } from '@types'

interface CanvasFolderSidebarProps {
  folders: CanvasFolder[]
  selectedFolderId: string | null
  countByFolder: Record<string, number>
  totalCount: number
  unassignedCount: number
  onSelectFolder: (folderId: string | null) => void
  onAddFolder: (name: string) => void
  onRenameFolder: (folderId: string, name: string) => void
  onRemoveFolder: (folderId: string) => void
}

export const CanvasFolderSidebar: React.FC<CanvasFolderSidebarProps> = ({
  folders,
  selectedFolderId,
  countByFolder,
  totalCount,
  unassignedCount,
  onSelectFolder,
  onAddFolder,
  onRenameFolder,
  onRemoveFolder,
}) => {
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [renameId, setRenameId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  const handleAdd = () => {
    if (!newName.trim()) return
    onAddFolder(newName.trim())
    setNewName('')
    setAdding(false)
  }

  const handleRename = (folderId: string) => {
    if (renameValue.trim()) onRenameFolder(folderId, renameValue.trim())
    setRenameId(null)
  }

  return (
    <aside className="canvas-folder-sidebar">
      <div className="canvas-folder-sidebar-header">
        <span>Pastas</span>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          title="Nova pasta"
          className="canvas-folder-sidebar-add"
        >
          +
        </button>
      </div>

      {adding && (
        <div className="canvas-folder-sidebar-form">
          <input
            type="text"
            className="form-input"
            placeholder="Nome da pasta"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd()
              if (e.key === 'Escape') { setAdding(false); setNewName('') }
            }}
            autoFocus
          />
        </div>
      )}

      <ul className="canvas-folder-sidebar-list">
        <li>
          <button
            type="button"
            className={`canvas-folder-sidebar-item ${selectedFolderId === null ? 'is-active' : ''}`}
            onClick={() => onSelectFolder(null)}
          >
            <span className="canvas-folder-sidebar-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg></span>
            <span className="canvas-folder-sidebar-name">Todos</span>
            <span className="canvas-folder-sidebar-count">{totalCount}</span>
          </button>
        </li>
        {unassignedCount > 0 && (
          <li>
            <button
              type="button"
              className={`canvas-folder-sidebar-item ${selectedFolderId === '__unassigned__' ? 'is-active' : ''}`}
              onClick={() => onSelectFolder('__unassigned__')}
            >
              <span className="canvas-folder-sidebar-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg></span>
              <span className="canvas-folder-sidebar-name">Sem pasta</span>
              <span className="canvas-folder-sidebar-count">{unassignedCount}</span>
            </button>
          </li>
        )}
        {folders.map((folder) => {
          const count = countByFolder[folder.id] ?? 0
          const isRenaming = renameId === folder.id
          const isActive = selectedFolderId === folder.id
          return (
            <li key={folder.id} className={`canvas-folder-sidebar-row ${isActive ? 'is-active' : ''}`}>
              {isRenaming ? (
                <input
                  type="text"
                  className="form-input"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRename(folder.id)
                    if (e.key === 'Escape') setRenameId(null)
                  }}
                  onBlur={() => handleRename(folder.id)}
                  autoFocus
                />
              ) : (
                <>
                  <button
                    type="button"
                    className="canvas-folder-sidebar-item"
                    onClick={() => onSelectFolder(folder.id)}
                  >
                    <span className="canvas-folder-sidebar-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg></span>
                    <span className="canvas-folder-sidebar-name">{folder.name}</span>
                    <span className="canvas-folder-sidebar-count">{count}</span>
                  </button>
                  <div className="canvas-folder-sidebar-actions">
                    <button
                      type="button"
                      onClick={() => { setRenameId(folder.id); setRenameValue(folder.name) }}
                      title="Renomear"
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveFolder(folder.id)}
                      title="Excluir pasta"
                      className="canvas-folder-sidebar-remove"
                    >
                      ×
                    </button>
                  </div>
                </>
              )}
            </li>
          )
        })}
      </ul>
    </aside>
  )
}
