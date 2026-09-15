import React from 'react'
import { createPortal } from 'react-dom'
import type { Note, NoteFolder } from '@types'
import { FolderIcon, HomeFolderIcon, PageIcon } from './icons'
import type { SidebarCtxMenu } from '@types'

interface ContextMenuProps {
  ctxMenu:   SidebarCtxMenu | null
  ctxNote:   Note | null
  ctxFolder: NoteFolder | null
  contextMenuRef: React.RefObject<HTMLDivElement>
  titleInputRef:  React.RefObject<HTMLInputElement>
  setCtxMenu:     (v: SidebarCtxMenu | null) => void
  setRenamingFolderId:   (id: string | null) => void
  setRenamingFolderName: (name: string) => void
  setNewFolderParentId:  (v: string | null | undefined) => void
  setExpandedFolders:    React.Dispatch<React.SetStateAction<Set<string>>>
  newFolderInputRef:     React.RefObject<HTMLInputElement>
  onOpenNote:       (noteId: string) => void
  onOpenFolder:     (folderId: string) => void
  onToggleLock:     (noteId: string) => void
  onToggleFavorite: (noteId: string) => void
  onTogglePinned:   (noteId: string) => void
  onUpdateFolder:   (folderId: string, updates: Partial<Pick<NoteFolder, 'name' | 'parentId' | 'isHome'>>) => void
  onAddNote:        (folderId?: string | null, parentNoteId?: string | null) => void
  onDuplicateNote:  (noteId: string) => void
  onRequestDeleteNote:   (noteId: string) => void
  onRequestDeleteFolder: (folderId: string) => void
}

export const ContextMenu = ({
  ctxMenu, ctxNote, ctxFolder, contextMenuRef, titleInputRef, setCtxMenu,
  setRenamingFolderId, setRenamingFolderName, setNewFolderParentId, setExpandedFolders, newFolderInputRef,
  onOpenNote, onOpenFolder, onToggleLock, onToggleFavorite, onTogglePinned, onUpdateFolder,
  onAddNote, onDuplicateNote, onRequestDeleteNote, onRequestDeleteFolder,
}: ContextMenuProps) => {
  const [pos, setPos] = React.useState({ x: 0, y: 0 })

  React.useLayoutEffect(() => {
    if (!contextMenuRef.current || !ctxMenu) return
    const rect = contextMenuRef.current.getBoundingClientRect()
    const winW = window.innerWidth
    const winH = window.innerHeight

    let posX = ctxMenu.x
    let posY = ctxMenu.y

    if (posX + rect.width > winW - 12) {
      posX = Math.max(12, winW - rect.width - 12)
    }
    if (posY + rect.height > winH - 12) {
      posY = Math.max(12, winH - rect.height - 12)
    }

    setPos({ x: posX, y: posY })
    contextMenuRef.current.focus({ preventScroll: true })
  }, [ctxMenu, contextMenuRef])

  if (!ctxMenu || (!ctxNote && !ctxFolder)) return null

  const close = () => setCtxMenu(null)
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
    const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('.notes-ctx-item:not(:disabled)'))
    if (items.length === 0) return
    event.preventDefault()
    const activeIndex = items.indexOf(document.activeElement as HTMLButtonElement)
    if (event.key === 'Home') items[0].focus()
    else if (event.key === 'End') items[items.length - 1].focus()
    else if (event.key === 'ArrowDown') items[(activeIndex + 1 + items.length) % items.length].focus()
    else items[(activeIndex - 1 + items.length) % items.length].focus()
  }

  return createPortal(
    <div
      ref={contextMenuRef}
      className="notes-ctx-menu"
      style={{ left: pos.x, top: pos.y }}
      role="menu"
      aria-label={ctxMenu.kind === 'note' ? 'Ações da nota' : 'Ações da pasta'}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      onPointerDown={e => e.stopPropagation()}
      onClick={e => e.stopPropagation()}
      onContextMenu={e => { e.preventDefault(); e.stopPropagation() }}
    >
      {ctxMenu.kind === 'note' && ctxNote && (() => {
        const locked = ctxNote.isLocked
        return (
          <>
            <div className="notes-ctx-header">
              <PageIcon />
              <span className="notes-ctx-title">{ctxNote.title || 'Sem título'}</span>
            </div>
            <div className="notes-ctx-body-grid">
              <div className="notes-ctx-section">
                <span className="notes-ctx-section-label">Visualização e ações</span>
                <button className="notes-ctx-item" onClick={() => { onOpenNote(ctxNote.id); close() }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                  Abrir nota
                </button>
                <button className="notes-ctx-item" disabled={locked} onClick={() => { close(); setTimeout(() => titleInputRef.current?.focus(), 80) }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                  Renomear
                </button>
                <button className="notes-ctx-item" onClick={() => { onToggleLock(ctxNote.id); close() }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <rect x="3" y="11" width="18" height="10" rx="2" />
                    <path d={locked ? 'M8 11V7a4 4 0 0 1 8 0v1' : 'M7 11V7a5 5 0 0 1 10 0v4'} />
                  </svg>
                  {locked ? 'Destrancar' : 'Trancar'}
                </button>
                <button className="notes-ctx-item" disabled={locked} onClick={() => { onToggleFavorite(ctxNote.id); close() }}>
                  <svg viewBox="0 0 24 24" fill={ctxNote.isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                  {ctxNote.isFavorite ? 'Desfavoritar' : 'Favoritar'}
                </button>
              </div>
              <div className="notes-ctx-section">
                <span className="notes-ctx-section-label">Organização</span>
                <button className="notes-ctx-item" disabled={locked} onClick={() => { onTogglePinned(ctxNote.id); close() }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><line x1="12" y1="17" x2="12" y2="22" /><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17z" /></svg>
                  {ctxNote.isPinned ? 'Desafixar' : 'Fixar no topo'}
                </button>
                <button className="notes-ctx-item" disabled={locked} onClick={() => { onAddNote(ctxNote.folderId, ctxNote.id); close() }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                  Subpágina
                </button>
                <button className="notes-ctx-item" disabled={locked} onClick={() => { onDuplicateNote(ctxNote.id); close() }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                  Duplicar
                </button>
                <button className="notes-ctx-item notes-ctx-danger" disabled={locked} onClick={() => { onRequestDeleteNote(ctxNote.id); close() }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /></svg>
                  Excluir
                </button>
              </div>
            </div>
          </>
        )
      })()}

      {ctxMenu.kind === 'folder' && ctxFolder && (() => (
        <>
          <div className="notes-ctx-header">
            {ctxFolder.isHome ? <HomeFolderIcon /> : <FolderIcon open={false} />}
            <span className="notes-ctx-title">{ctxFolder.name || 'Sem nome'}</span>
            {ctxFolder.isHome && <span className="notes-ctx-badge-hub">Hub</span>}
          </div>
          <div className="notes-ctx-body-grid">
            <div className="notes-ctx-section">
              <span className="notes-ctx-section-label">Ações da pasta</span>
              {ctxFolder.isHome && (
                <button className="notes-ctx-item notes-ctx-item--hub" onClick={() => { onOpenFolder(ctxFolder.id); close() }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" /><path d="M9 21V12h6v9" /></svg>
                  Abrir Hub
                </button>
              )}
              <button className="notes-ctx-item" onClick={() => { close(); setRenamingFolderName(ctxFolder.name); setRenamingFolderId(ctxFolder.id) }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                Renomear
              </button>
              <button className="notes-ctx-item" onClick={() => { onUpdateFolder(ctxFolder.id, { isHome: !ctxFolder.isHome }); close() }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" /><path d="M9 21V12h6v9" /></svg>
                {ctxFolder.isHome ? 'Tornar pasta' : 'Tornar Hub'}
              </button>
            </div>
            <div className="notes-ctx-section">
              <span className="notes-ctx-section-label">Criar e excluir</span>
              <button className="notes-ctx-item" onClick={() => { onAddNote(ctxFolder.id, null); setExpandedFolders(prev => new Set([...prev, ctxFolder.id])); close() }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="12" y1="18" x2="12" y2="12" /><line x1="9" y1="15" x2="15" y2="15" /></svg>
                + Nova nota
              </button>
              <button className="notes-ctx-item" onClick={() => {
                setNewFolderParentId(ctxFolder.id)
                setExpandedFolders(prev => new Set([...prev, ctxFolder.id]))
                close(); setTimeout(() => newFolderInputRef.current?.focus(), 50)
              }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /><line x1="12" y1="11" x2="12" y2="17" /><line x1="9" y1="14" x2="15" y2="14" /></svg>
                + Subpasta
              </button>
              <button className="notes-ctx-item notes-ctx-danger" onClick={() => { onRequestDeleteFolder(ctxFolder.id); close() }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /></svg>
                Excluir
              </button>
            </div>
          </div>
        </>
      ))()}
    </div>,
    document.body,
  )
}
