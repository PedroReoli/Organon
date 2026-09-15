/**
 * PlaybookFolderSidebar — sidebar lateral com pastas flat.
 *
 * Mostra: "Todos", "Favoritos", "Arquivados", e a lista de pastas do
 * usuario (1 nivel). Cada pasta tem contador de playbooks, botao para
 * renomear e excluir inline. Upgrade 15.
 */

import React, { useState } from 'react'
import type { Playbook, PlaybookFolder } from '@types'

export type FolderSelection =
  | { kind: 'all' }
  | { kind: 'favorites' }
  | { kind: 'archived' }
  | { kind: 'folder'; folderId: string }
  | { kind: 'none' } // raiz (playbooks sem pasta e nao arquivados)

interface PlaybookFolderSidebarProps {
  playbooks: Playbook[]
  folders: PlaybookFolder[]
  selection: FolderSelection
  onSelect: (selection: FolderSelection) => void
  onCreateFolder: (name: string) => void
  onRenameFolder: (folderId: string, name: string) => void
  onRemoveFolder: (folderId: string) => void
}

function countInFolder(playbooks: Playbook[], folderId: string | null): number {
  return playbooks.filter((pb) => !pb.isArchived && (pb.folderId ?? null) === folderId)
    .length
}

export const PlaybookFolderSidebar: React.FC<PlaybookFolderSidebarProps> = ({
  playbooks,
  folders,
  selection,
  onSelect,
  onCreateFolder,
  onRenameFolder,
  onRemoveFolder,
}) => {
  const [newFolderName, setNewFolderName] = useState('')
  const [isAddingFolder, setIsAddingFolder] = useState(false)
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')

  const totalActive = playbooks.filter((pb) => !pb.isArchived).length
  const totalFavorites = playbooks.filter((pb) => pb.isFavorite && !pb.isArchived).length
  const totalArchived = playbooks.filter((pb) => pb.isArchived).length

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = newFolderName.trim()
    if (!trimmed) {
      setIsAddingFolder(false)
      return
    }
    onCreateFolder(trimmed)
    setNewFolderName('')
    setIsAddingFolder(false)
  }

  const startRename = (folder: PlaybookFolder) => {
    setEditingFolderId(folder.id)
    setEditingName(folder.name)
  }

  const commitRename = () => {
    if (!editingFolderId) return
    const trimmed = editingName.trim()
    if (trimmed) onRenameFolder(editingFolderId, trimmed)
    setEditingFolderId(null)
    setEditingName('')
  }

  const isSelected = (s: FolderSelection): boolean => {
    if (selection.kind !== s.kind) return false
    if (selection.kind === 'folder' && s.kind === 'folder')
      return selection.folderId === s.folderId
    return true
  }

  return (
    <nav className="projects-sidebar is-open">
      <div className="projects-sidebar-header">
        <div className="projects-sidebar-logo" style={{ color: 'var(--color-primary)' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </div>
        <div className="projects-sidebar-title">Playbooks</div>
      </div>

      <div className="projects-sidebar-nav" style={{ padding: '16px 12px' }}>
        <button
          type="button"
          className={`projects-sidebar-item ${isSelected({ kind: 'all' }) ? 'is-active' : ''}`}
          onClick={() => onSelect({ kind: 'all' })}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
          <span style={{ flex: 1 }}>Todos</span>
          <span style={{ fontSize: '11px', backgroundColor: isSelected({ kind: 'all' }) ? 'var(--color-primary-glow)' : 'var(--bg-tertiary)', color: isSelected({ kind: 'all' }) ? 'var(--accent-primary)' : 'var(--text-muted)', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>{totalActive}</span>
        </button>

        <button
          type="button"
          className={`projects-sidebar-item ${isSelected({ kind: 'favorites' }) ? 'is-active' : ''}`}
          onClick={() => onSelect({ kind: 'favorites' })}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" style={{ color: '#f59e0b' }}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
          <span style={{ flex: 1 }}>Favoritos</span>
          <span style={{ fontSize: '11px', backgroundColor: isSelected({ kind: 'favorites' }) ? 'var(--color-primary-glow)' : 'var(--bg-tertiary)', color: isSelected({ kind: 'favorites' }) ? 'var(--accent-primary)' : 'var(--text-muted)', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>{totalFavorites}</span>
        </button>

        <button
          type="button"
          className={`projects-sidebar-item ${isSelected({ kind: 'none' }) ? 'is-active' : ''}`}
          onClick={() => onSelect({ kind: 'none' })}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" /></svg>
          <span style={{ flex: 1 }}>Sem pasta</span>
          <span style={{ fontSize: '11px', backgroundColor: isSelected({ kind: 'none' }) ? 'var(--color-primary-glow)' : 'var(--bg-tertiary)', color: isSelected({ kind: 'none' }) ? 'var(--accent-primary)' : 'var(--text-muted)', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
            {countInFolder(playbooks, null)}
          </span>
        </button>
      </div>

      <div style={{ padding: '0 12px 16px 12px', display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, overflowY: 'auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 4px 8px 4px', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          <span>Pastas</span>
          <button
            type="button"
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s ease' }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'; e.currentTarget.style.color = 'var(--text-primary)' }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
            onClick={() => setIsAddingFolder(true)}
            title="Nova pasta"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </header>

        {isAddingFolder && (
          <form
            style={{ marginBottom: '8px' }}
            onSubmit={handleCreate}
          >
            <input
              type="text"
              className="f-input"
              style={{ width: '100%', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--color-primary)', borderRadius: '8px', padding: '8px 12px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none', boxShadow: '0 0 0 2px rgba(139, 92, 246, 0.2)' }}
              autoFocus
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onBlur={handleCreate}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setNewFolderName('')
                  setIsAddingFolder(false)
                }
              }}
              placeholder="Nome da pasta"
            />
          </form>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {folders.map((folder) => {
            const active = isSelected({ kind: 'folder', folderId: folder.id })
            const count = countInFolder(playbooks, folder.id)
            const isEditing = editingFolderId === folder.id

            return (
              <div
                key={folder.id}
                className={`projects-sidebar-item ${active ? 'is-active' : ''}`}
                style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '12px' }}
              >
                {isEditing ? (
                  <input
                    type="text"
                    className="f-input"
                    style={{ flex: 1, minWidth: 0, backgroundColor: 'var(--bg-primary)', border: '1px solid var(--color-primary)', borderRadius: '6px', padding: '4px 8px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
                    autoFocus
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitRename()
                      if (e.key === 'Escape') {
                        setEditingFolderId(null)
                        setEditingName('')
                      }
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0, color: 'inherit', fontSize: '14px', fontWeight: 500 }}
                    onClick={() => onSelect({ kind: 'folder', folderId: folder.id })}
                    onDoubleClick={() => startRename(folder)}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" style={{ marginRight: '12px', color: folder.color || 'var(--text-muted)' }}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
                    <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{folder.name}</span>
                    <span style={{ fontSize: '11px', backgroundColor: active ? 'var(--color-primary-glow)' : 'var(--bg-tertiary)', color: active ? 'var(--accent-primary)' : 'var(--text-muted)', padding: '2px 8px', borderRadius: '12px', fontWeight: 600, marginLeft: '8px' }}>{count}</span>
                  </button>
                )}

                {!isEditing && active && (
                  <button
                    type="button"
                    style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px', display: 'flex', borderRadius: '4px', transition: 'background-color 0.15s ease' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    onClick={() => onRemoveFolder(folder.id)}
                    title="Excluir pasta"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ marginTop: 'auto', padding: '16px 12px', borderTop: '1px solid var(--border)' }}>
        <button
          type="button"
          className={`projects-sidebar-item ${isSelected({ kind: 'archived' }) ? 'is-active' : ''}`}
          onClick={() => onSelect({ kind: 'archived' })}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><polyline points="21 8 21 21 3 21 3 8" /><rect x="1" y="3" width="22" height="5" /><line x1="10" y1="12" x2="14" y2="12" /></svg>
          <span style={{ flex: 1 }}>Arquivados</span>
          <span style={{ fontSize: '11px', backgroundColor: isSelected({ kind: 'archived' }) ? 'var(--color-primary-glow)' : 'var(--bg-tertiary)', color: isSelected({ kind: 'archived' }) ? 'var(--accent-primary)' : 'var(--text-muted)', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>{totalArchived}</span>
        </button>
      </div>
    </nav>
  )
}
