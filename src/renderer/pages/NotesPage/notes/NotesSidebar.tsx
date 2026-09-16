import React, { useState } from 'react'
import { FolderTree } from 'lucide-react'
import type { Note, NoteFolder } from '@types'
import { ChevronIcon, FolderIcon, HomeFolderIcon, PageIcon, SubFolderIcon } from './icons'
import { folderTreeKey, noteTreeKey } from './utils'
import type { TreeItemKey, TreeItemKind } from '@types'

const EMOJI_REGEX = /^(\p{Extended_Pictographic}|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDE4F]|\uD83E[\uDD00-\uDDFF]|\u2600-\u26FF|\u2700-\u27BF)\s*/u

function extractEmoji(title: string): { emoji: string | null; cleanTitle: string } {
  if (!title) return { emoji: null, cleanTitle: '' }
  const match = title.match(EMOJI_REGEX)
  if (match) {
    const emoji = match[0].trim()
    const cleanTitle = title.slice(match[0].length).trim()
    return { emoji, cleanTitle: cleanTitle || title }
  }
  return { emoji: null, cleanTitle: title }
}

interface NotesSidebarProps {
  notes:   Note[]
  folders: NoteFolder[]
  // Home
  activeView: 'home' | 'note' | 'folder'
  onGoHome:   () => void
  showTrash?:  boolean
  onOpenTrash?: () => void
  trashCount?:  number
  onOpenTreeManager?: () => void
  onRequestDeleteNote?: (id: string) => void
  onDuplicateNote?: (id: string) => void
  // Selection
  selectedNoteId:   string | null
  selectedFolderId: string | null
  selectedTreeItems: Set<TreeItemKey>
  // Expand
  expandedFolders: Set<string>
  expandedNotes:   Set<string>
  // Sidebar
  sidebarOpen:    boolean
  setSidebarOpen: (v: boolean) => void
  // Search
  searchVisible:   boolean
  searchQuery:     string
  setSearchQuery:  (q: string) => void
  setSearchVisible: (v: boolean) => void
  searchResults:   Note[]
  searchInputRef:  React.RefObject<HTMLInputElement>
  // Recent notes
  recentNoteIds: string[]
  // New folder
  newFolderParentId:  string | null | undefined
  setNewFolderParentId: (v: string | null | undefined) => void
  newFolderName:      string
  setNewFolderName:   (name: string) => void
  newFolderInputRef:  React.RefObject<HTMLInputElement>
  onAddFolder:        (name: string, parentId?: string | null) => string
  // Rename
  renamingFolderId:    string | null
  setRenamingFolderId: (id: string | null) => void
  renamingFolderName:  string
  setRenamingFolderName: (name: string) => void
  onUpdateFolder: (folderId: string, updates: Partial<Pick<NoteFolder, 'name' | 'parentId' | 'isHome'>>) => void
  // Drag
  dropTargetId:  string | null
  setDropTargetId: (id: string | null) => void
  dragCount:     number
  dragPayloadRef: React.MutableRefObject<{ noteIds: string[]; folderIds: string[] }>
  // Computed
  favorites:    Note[]
  pinned:       Note[]
  rootFolders:  NoteFolder[]
  rootNotes:    Note[]
  childFolders:  (parentId: string) => NoteFolder[]
  notesInFolder: (folderId: string) => Note[]
  subNotes:      (parentNoteId: string) => Note[]
  noteMap:       Map<string, Note>
  markdownImportRef: React.RefObject<HTMLInputElement>
  // Handlers
  openNote:   (id: string) => void
  openFolder: (id: string) => void
  handleAddNote:   (folderId?: string | null, parentNoteId?: string | null) => void
  toggleFolder:    (id: string) => void
  toggleNote:      (id: string, e: React.MouseEvent) => void
  startTreeDrag:   (e: React.DragEvent, kind: TreeItemKind, id: string) => void
  handleDragEnd:   () => void
  handleDropOnFolder: (folderId: string) => void
  handleDropOnNote:   (note: Note) => void
  handleDropOnRoot:   () => void
  handleTreeRowSelection: (key: TreeItemKey, e: React.MouseEvent) => boolean
  selectSingleTreeItem:   (key: TreeItemKey) => void
  toggleTreeItemSelection: (key: TreeItemKey) => void
  clearSelection: () => void
  onCollapseAll: () => void
  openCtxMenu: (e: React.MouseEvent, target: { kind: 'note'; id: string } | { kind: 'folder'; id: string }) => void
  handleMarkdownImport: (e: React.ChangeEvent<HTMLInputElement>) => void
  isFolderDescendant: (candidateId: string, ancestorId: string) => boolean
  isNoteDescendant:   (candidateId: string, ancestorId: string) => boolean
}

interface SectionHeaderProps {
  label: string
  icon?: React.ReactNode
  count?: number
  isCollapsed?: boolean
  isDropTarget?: boolean
  onToggle?: () => void
  onDragOver?: (event: React.DragEvent<HTMLButtonElement>) => void
  onDragLeave?: (event: React.DragEvent<HTMLButtonElement>) => void
  onDrop?: (event: React.DragEvent<HTMLButtonElement>) => void
}

const SectionHeader = ({
  label,
  icon,
  count,
  isCollapsed,
  isDropTarget,
  onToggle,
  onDragOver,
  onDragLeave,
  onDrop,
}: SectionHeaderProps) => (
  <button
    type="button"
    className={`notes-tree-section-header${isDropTarget ? ' is-drop-target' : ''}`}
    onClick={onToggle}
    onDragOver={onDragOver}
    onDragLeave={onDragLeave}
    onDrop={onDrop}
  >
    {onToggle && (
      <span className={`notes-tree-section-chevron${isCollapsed ? '' : ' open'}`}>
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" width="10" height="10">
          <polyline points="4 6 8 10 12 6" />
        </svg>
      </span>
    )}
    {icon && <span className="notes-tree-section-icon">{icon}</span>}
    <span className="notes-tree-section-label-text">{label}</span>
    {count !== undefined && count > 0 && (
      <span className="notes-tree-section-count">{count}</span>
    )}
  </button>
)

export const NotesSidebar = (props: NotesSidebarProps) => {
  const {
    notes: _notes, activeView, onGoHome, showTrash = false, onOpenTrash, trashCount = 0, onOpenTreeManager, onRequestDeleteNote: _onRequestDeleteNote, onDuplicateNote,
    selectedNoteId, selectedFolderId, selectedTreeItems,
    expandedFolders, expandedNotes, sidebarOpen, setSidebarOpen,
    searchQuery, setSearchQuery, setSearchVisible, searchResults, searchInputRef,
    newFolderParentId, setNewFolderParentId, newFolderName, setNewFolderName, newFolderInputRef, onAddFolder,
    renamingFolderId, setRenamingFolderId, renamingFolderName, setRenamingFolderName, onUpdateFolder,
    dropTargetId, setDropTargetId, dragCount, dragPayloadRef,
    favorites, pinned, rootFolders, rootNotes, childFolders, notesInFolder, subNotes, noteMap,
    markdownImportRef,
    openNote, openFolder, handleAddNote, toggleFolder, toggleNote,
    startTreeDrag, handleDragEnd, handleDropOnFolder, handleDropOnNote, handleDropOnRoot,
    handleTreeRowSelection, selectSingleTreeItem, toggleTreeItemSelection: _toggleTreeItemSelection, clearSelection, onCollapseAll,
    openCtxMenu, handleMarkdownImport,
    isFolderDescendant, isNoteDescendant,
  } = props

  // Section collapse state
  const [favoritesCollapsed, setFavoritesCollapsed] = useState(false)
  const [pinnedCollapsed,    setPinnedCollapsed]    = useState(false)
  const [privateCollapsed,   setPrivateCollapsed]   = useState(false)

  const hasSelection = selectedTreeItems.size > 0

  // Recursive note count for a folder
  const countNotesInFolder = (folderId: string): number => {
    const direct = notesInFolder(folderId).length
    return direct + childFolders(folderId).reduce((sum, f) => sum + countNotesInFolder(f.id), 0)
  }

  const handleAddFolder = () => {
    const name = newFolderName.trim(); if (!name) return
    onAddFolder(name, newFolderParentId ?? null)
    setNewFolderName(''); setNewFolderParentId(undefined)
  }

  const renderNote = (note: Note, depth: number): React.ReactElement => {
    const children    = subNotes(note.id)
    const isExpanded  = expandedNotes.has(note.id)
    const isActive    = selectedNoteId === note.id
    const treeKey     = noteTreeKey(note.id)
    const isSelected  = selectedTreeItems.has(treeKey)
    const isDropTarget = dropTargetId === note.id
    const { emoji, cleanTitle } = extractEmoji(note.title)

    return (
      <div key={note.id} className="notes-tree-group">
        <div
          className={`notes-tree-row notes-tree-note${isActive ? ' is-active' : ''}${isSelected ? ' is-selected' : ''}${isDropTarget ? ' is-drop-target' : ''}`}
          style={{ paddingLeft: `${12 + depth * 16}px` }}
          draggable
          data-tree-kind="note"
          data-tree-id={note.id}
          onDragStart={e => startTreeDrag(e, 'note', note.id)}
          onDragEnd={handleDragEnd}
          onDragOver={e => {
            e.preventDefault(); e.stopPropagation()
            const canDrop = dragPayloadRef.current.noteIds.some(id => id !== note.id && !isNoteDescendant(note.id, id))
            if (canDrop) setDropTargetId(note.id)
          }}
          onDragLeave={e => { e.stopPropagation(); if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropTargetId(null) }}
          onDrop={e => { e.preventDefault(); e.stopPropagation(); handleDropOnNote(note) }}
          onClick={e => { if (handleTreeRowSelection(treeKey, e)) return; selectSingleTreeItem(treeKey); openNote(note.id) }}
          onContextMenu={e => { if (!selectedTreeItems.has(treeKey)) selectSingleTreeItem(treeKey); openCtxMenu(e, { kind: 'note', id: note.id }) }}
        >
          <span className="notes-tree-drag-handle" aria-label="Arrastar nota" title="Arrastar nota">
            <svg viewBox="0 0 12 16" fill="currentColor" width="8" height="12"><circle cx="3" cy="4" r="1"/><circle cx="9" cy="4" r="1"/><circle cx="3" cy="8" r="1"/><circle cx="9" cy="8" r="1"/><circle cx="3" cy="12" r="1"/><circle cx="9" cy="12" r="1"/></svg>
          </span>
          <button className={`notes-tree-chevron${children.length > 0 ? ' visible' : ''}${isExpanded ? ' open' : ''}`} onClick={e => children.length > 0 ? toggleNote(note.id, e) : undefined} tabIndex={-1}>
            <ChevronIcon open={isExpanded} />
          </button>
          {emoji ? (
            <span style={{ fontSize: '13px', marginRight: '2px', display: 'inline-flex', alignItems: 'center', lineHeight: 1 }}>{emoji}</span>
          ) : (
            <PageIcon />
          )}
          <span className="notes-tree-label">{(cleanTitle && cleanTitle.trim()) || (note.title && note.title.trim()) || 'Sem título'}</span>
          <span className="notes-tree-row-actions">
            {onDuplicateNote && (
              <button className="notes-tree-action-btn" title="Duplicar nota" disabled={note.isLocked} onClick={e => { e.stopPropagation(); onDuplicateNote(note.id) }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="11" height="11"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
              </button>
            )}
            <button className="notes-tree-action-btn" title="Nova subpágina" disabled={note.isLocked} onClick={e => { e.stopPropagation(); handleAddNote(note.folderId, note.id) }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            </button>
            <button className="notes-tree-action-btn notes-tree-action-more" title="Mais opções" onClick={e => { e.stopPropagation(); openCtxMenu(e, { kind: 'note', id: note.id }) }}>
              <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>
            </button>
          </span>
          {note.isFavorite && <span className="notes-tree-star">*</span>}
          {note.isPinned   && <span className="notes-tree-pin">PIN</span>}
          {note.isLocked   && <span className="notes-tree-lock" title="Nota trancada"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="10" height="10"><rect x="4" y="11" width="16" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg></span>}
        </div>
        <div className={`notes-tree-folder-children ${isExpanded ? 'is-expanded' : 'is-collapsed'}`}>
          <div className="notes-tree-folder-children-inner">
            {children.map(child => renderNote(child, depth + 1))}
          </div>
        </div>
      </div>
    )
  }

  const renderFolder = (folder: NoteFolder, depth: number): React.ReactElement => {
    const isExpanded    = expandedFolders.has(folder.id)
    const childFlds     = childFolders(folder.id)
    const childNts      = notesInFolder(folder.id)
    const treeKey       = folderTreeKey(folder.id)
    const isSelected    = selectedTreeItems.has(treeKey)
    const isActive      = selectedFolderId === folder.id
    const isDropTarget  = dropTargetId === folder.id
    const noteCount     = countNotesInFolder(folder.id)
    const { emoji, cleanTitle } = extractEmoji(folder.name)

    const isHub = depth === 0 || !folder.parentId || folder.isHome
    const isSub = depth >= 2
    const MAX_DEPTH = 2

    return (
      <div key={folder.id} className="notes-tree-group">
        <div
          className={`notes-tree-row notes-tree-folder${isActive ? ' is-active' : ''}${isSelected ? ' is-selected' : ''}${isDropTarget ? ' is-drop-target' : ''}`}
          style={{ paddingLeft: `${12 + depth * 16}px` }}
          draggable
          data-tree-kind="folder"
          data-tree-id={folder.id}
          onDragStart={e => startTreeDrag(e, 'folder', folder.id)}
          onDragEnd={handleDragEnd}
          onDragOver={e => {
            e.preventDefault(); e.stopPropagation()
            const canF = dragPayloadRef.current.folderIds.some(fid => fid !== folder.id && !isFolderDescendant(folder.id, fid))
            const canN = dragPayloadRef.current.noteIds.some(nid => noteMap.has(nid))
            if (canF || canN) setDropTargetId(folder.id)
          }}
          onDragLeave={e => { e.stopPropagation(); if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropTargetId(null) }}
          onDrop={e => { e.preventDefault(); e.stopPropagation(); handleDropOnFolder(folder.id) }}
          onContextMenu={e => openCtxMenu(e, { kind: 'folder', id: folder.id })}
          onClick={e => {
            if (renamingFolderId === folder.id) return
            if (handleTreeRowSelection(treeKey, e)) return
            selectSingleTreeItem(treeKey)
            if (isHub) {
              openFolder(folder.id)
            } else {
              toggleFolder(folder.id)
            }
          }}
          onDoubleClick={e => { e.stopPropagation(); if (renamingFolderId === folder.id || !isHub) return; openFolder(folder.id) }}
        >
          <span className="notes-tree-drag-handle" aria-label="Arrastar pasta" title="Arrastar pasta">
            <svg viewBox="0 0 12 16" fill="currentColor" width="8" height="12"><circle cx="3" cy="4" r="1"/><circle cx="9" cy="4" r="1"/><circle cx="3" cy="8" r="1"/><circle cx="9" cy="8" r="1"/><circle cx="3" cy="12" r="1"/><circle cx="9" cy="12" r="1"/></svg>
          </span>
          <button className="notes-tree-chevron visible" onClick={e => { e.stopPropagation(); toggleFolder(folder.id) }} tabIndex={-1} style={{ transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>
            <ChevronIcon open={isExpanded} />
          </button>
          {emoji ? (
            <span style={{ fontSize: '13px', marginRight: '2px', display: 'inline-flex', alignItems: 'center', lineHeight: 1 }}>{emoji}</span>
          ) : (
            isHub ? <HomeFolderIcon /> : isSub ? <SubFolderIcon open={isExpanded} /> : <FolderIcon open={isExpanded} />
          )}

          {renamingFolderId === folder.id ? (
            <input
              className="notes-tree-rename-input" value={renamingFolderName} autoFocus
              onClick={e => e.stopPropagation()}
              onChange={e => setRenamingFolderName(e.target.value)}
              onKeyDown={e => {
                e.stopPropagation()
                if (e.key === 'Enter') { const next = renamingFolderName.trim(); if (next && next !== folder.name) onUpdateFolder(folder.id, { name: next }); setRenamingFolderId(null) }
                else if (e.key === 'Escape') setRenamingFolderId(null)
              }}
              onBlur={() => { const next = renamingFolderName.trim(); if (next && next !== folder.name) onUpdateFolder(folder.id, { name: next }); setRenamingFolderId(null) }}
            />
          ) : (
            <span className="notes-tree-label">
              {cleanTitle || folder.name}
              {isHub && <span className="notes-tree-hub-badge">Hub</span>}
              {isSub && <span className="notes-tree-sub-badge" style={{ fontSize: '9px', background: 'rgba(168,85,247,0.15)', color: '#a855f7', padding: '1px 4px', borderRadius: '3px', marginLeft: '4px', fontWeight: 700 }}>Sub</span>}
            </span>
          )}

          {noteCount > 0 && renamingFolderId !== folder.id && (
            <span className="notes-tree-folder-count">{noteCount}</span>
          )}

          <span className="notes-tree-row-actions">
            <button className="notes-tree-action-btn" title="Nova nota nesta pasta" onClick={e => { e.stopPropagation(); handleAddNote(folder.id, null) }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            </button>
            {depth < MAX_DEPTH ? (
              <button
                className="notes-tree-action-btn"
                title="Nova subpasta"
                onClick={e => {
                  e.stopPropagation()
                  setNewFolderParentId(folder.id)
                  if (!isExpanded) toggleFolder(folder.id)
                  setTimeout(() => newFolderInputRef.current?.focus(), 50)
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /><line x1="12" y1="11" x2="12" y2="17" /><line x1="9" y1="14" x2="15" y2="14" /></svg>
              </button>
            ) : (
              <button
                className="notes-tree-action-btn"
                title="Profundidade máxima atingida (3 níveis: Hub > Pasta > Subpasta)"
                disabled
                style={{ opacity: 0.3, cursor: 'not-allowed' }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
              </button>
            )}
            <button className="notes-tree-action-btn notes-tree-action-more" title="Mais opções" onClick={e => { e.stopPropagation(); openCtxMenu(e, { kind: 'folder', id: folder.id }) }}>
              <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>
            </button>
          </span>
        </div>

        <div className={`notes-tree-folder-children ${isExpanded ? 'is-expanded' : 'is-collapsed'}`}>
          <div className="notes-tree-folder-children-inner">
            {childFlds.map(f => renderFolder(f, depth + 1))}
            {childNts.map(n => renderNote(n, depth + 1))}
            {newFolderParentId === folder.id && (
              <div className="notes-tree-new-folder-input" style={{ paddingLeft: `${12 + (depth + 1) * 16}px` }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="13" height="13" style={{ flexShrink: 0, opacity: 0.5 }}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
                <input ref={newFolderInputRef} className="notes-tree-new-folder-field" value={newFolderName}
                  onChange={e => setNewFolderName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddFolder(); if (e.key === 'Escape') { setNewFolderParentId(undefined); setNewFolderName('') } }}
                  onBlur={() => { if (newFolderName.trim()) handleAddFolder(); else { setNewFolderParentId(undefined); setNewFolderName('') } }}
                  placeholder="Nome da pasta..." />
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  const isSidebarCollapsed = !sidebarOpen

  return (
    <nav className={`projects-sidebar notes-tree-sidebar ${sidebarOpen ? 'is-open' : ''} ${hasSelection ? ' has-selection' : ''}`}>
      {/* ── Collapsed Indicator ───────────────────────────────────────────── */}
      {isSidebarCollapsed && (
        <div className="projects-sidebar-expand-indicator" onClick={() => setSidebarOpen(true)} title="Expandir barra lateral">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
      )}

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="projects-sidebar-header" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div className="projects-sidebar-logo" style={{ color: activeView === 'home' ? 'var(--color-primary)' : 'var(--text-primary)', cursor: 'pointer', flexShrink: 0 }} onClick={onGoHome} title="Página inicial das notas">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
            <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
            <polyline points="9 21 9 13 15 13 15 21" />
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={onGoHome}>
          <div className="projects-sidebar-title" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Notas</div>
        </div>
        <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
          <button className="notes-tree-header-btn" title="Criar nova nota" onClick={(e) => { e.preventDefault(); handleAddNote() }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          </button>
          <button className="notes-tree-header-btn" title="Recolher todas as pastas" onClick={onCollapseAll}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><polyline points="18 15 12 9 6 15"/><polyline points="18 20 12 14 6 20"/></svg>
          </button>
          {!isSidebarCollapsed && (
            <button className="notes-tree-header-btn" title="Recolher barra lateral" onClick={() => setSidebarOpen(false)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
          )}
        </div>
      </div>

      {/* ── Search — always visible ─────────────────────────────────────────── */}
      <div className="notes-tree-search-wrap" style={{ padding: '16px 12px 0 12px' }}>
        <div style={{ position: 'relative' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input
            ref={searchInputRef}
            className="f-input"
            style={{ width: '100%', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px 12px 8px 30px', color: 'var(--text-primary)', fontSize: '13px' }}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar notas..."
            onKeyDown={e => { if (e.key === 'Escape') { setSearchQuery(''); setSearchVisible(false) } }}
          />
          {searchQuery && (
            <button style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }} onClick={() => { setSearchQuery(''); searchInputRef.current?.focus() }}>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="12" height="12"><path d="M12 4L4 12M4 4l8 8" /></svg>
            </button>
          )}
        </div>
      </div>

      {/* ── Selection bar ──────────────────────────────────────────────────── */}
      {selectedTreeItems.size > 1 && (
        <div className="notes-selection-bar" style={{ margin: '12px 12px 0 12px', background: 'var(--color-primary-light)', border: '1px solid var(--color-primary)', borderRadius: '6px', padding: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg viewBox="0 0 16 16" fill="none" stroke="var(--color-primary)" strokeWidth="2" width="12" height="12" style={{ flexShrink: 0 }}><rect x="2" y="2" width="12" height="12" rx="2"/><polyline points="4.5 8 7 10.5 11.5 5.5"/></svg>
          <span style={{ fontSize: '12px', color: 'var(--color-primary)', flex: 1, fontWeight: 500 }}>{selectedTreeItems.size} selecionados</span>
          <button style={{ background: 'transparent', border: 'none', color: 'var(--color-primary)', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={clearSelection} title="Limpar seleção">
            Limpar
          </button>
        </div>
      )}

      {/* ── Tree body ────────────────────────────────────────── */}
      <div className="projects-sidebar-nav" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 8px' }}>

        {/* Home / Hubs link */}
        <div
          className={`notes-tree-row notes-tree-home${activeView === 'home' ? ' is-active' : ''}`}
          onClick={onGoHome}
          style={{ marginBottom: '12px' }}
        >
          <span className="notes-tree-icon-wrap" style={{ color: 'var(--color-primary)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" /><polyline points="9 21 9 13 15 13 15 21" /></svg>
          </span>
          <span className="notes-tree-label" style={{ fontWeight: 600 }}>Visão Geral / Hubs</span>
        </div>
        {searchQuery.trim() ? (
          searchResults.length > 0
            ? searchResults.map(n => renderNote(n, 0))
            : <div style={{ padding: '16px', textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>Nenhum resultado</div>
        ) : (
          <>
            {/* Favoritos */}
            {favorites.length > 0 && (
              <div className="notes-tree-section">
                <SectionHeader
                  label="Favoritos"
                  count={favorites.length}
                  icon={<svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>}
                  isCollapsed={favoritesCollapsed}
                  onToggle={() => setFavoritesCollapsed(v => !v)}
                />
                <div className={`notes-tree-section-content ${favoritesCollapsed ? 'is-collapsed' : 'is-expanded'}`}>
                  <div className="notes-tree-section-content-inner">
                    {favorites.map(n => renderNote(n, 0))}
                  </div>
                </div>
              </div>
            )}

            {/* Fixadas */}
            {pinned.length > 0 && (
              <div className="notes-tree-section">
                <SectionHeader
                  label="Fixadas"
                  count={pinned.length}
                  icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>}
                  isCollapsed={pinnedCollapsed}
                  onToggle={() => setPinnedCollapsed(v => !v)}
                />
                <div className={`notes-tree-section-content ${pinnedCollapsed ? 'is-collapsed' : 'is-expanded'}`}>
                  <div className="notes-tree-section-content-inner">
                    {pinned.map(n => renderNote(n, 0))}
                  </div>
                </div>
              </div>
            )}

            {/* Main tree */}
            <div className="notes-tree-section notes-tree-main">
              <SectionHeader
                label={dragCount > 0 ? (dragCount > 1 ? `Mover ${dragCount} itens para Privadas` : 'Mover para Privadas') : 'Privadas'}
                count={rootFolders.length + rootNotes.length}
                icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="12" height="12"><rect x="4" y="10" width="16" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>}
                isCollapsed={privateCollapsed}
                isDropTarget={dropTargetId === 'root-zone'}
                onToggle={() => setPrivateCollapsed(value => !value)}
                onDragOver={e => { e.preventDefault(); e.stopPropagation(); setDropTargetId('root-zone') }}
                onDragLeave={e => { e.stopPropagation(); if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropTargetId(null) }}
                onDrop={e => { e.preventDefault(); e.stopPropagation(); handleDropOnRoot() }}
              />
              <div className={`notes-tree-section-content ${privateCollapsed ? 'is-collapsed' : 'is-expanded'}`}>
                <div className="notes-tree-section-content-inner">
                  {rootFolders.map(f => renderFolder(f, 0))}
                  {rootNotes.map(n => renderNote(n, 0))}
                  {rootFolders.length === 0 && rootNotes.length === 0 && (
                    <div className="notes-tree-private-empty">Nenhuma nota privada</div>
                  )}
                </div>
              </div>
            </div>

            {/* New folder input at root level */}
            {newFolderParentId === null && (
              <div className="notes-tree-new-folder-input" style={{ paddingLeft: '12px' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="13" height="13" style={{ flexShrink: 0, opacity: 0.5 }}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
                <input ref={newFolderInputRef} className="notes-tree-new-folder-field" value={newFolderName}
                  onChange={e => setNewFolderName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddFolder(); if (e.key === 'Escape') { setNewFolderParentId(undefined); setNewFolderName('') } }}
                  onBlur={() => { if (newFolderName.trim()) handleAddFolder(); else { setNewFolderParentId(undefined); setNewFolderName('') } }}
                  placeholder="Nome da pasta..." />
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <div style={{ padding: '12px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button type="button" className="notes-sidebar-footer-btn is-primary" onClick={(e) => { e.preventDefault(); handleAddNote() }} title="Criar nova nota">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" style={{ flexShrink: 0 }}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Nova nota
        </button>
        <div className="notes-sidebar-footer-btn-group">
          <button type="button" className="notes-sidebar-footer-btn" onClick={(e) => { e.preventDefault(); setNewFolderParentId(null); setTimeout(() => { newFolderInputRef.current?.scrollIntoView({ behavior: 'smooth' }); newFolderInputRef.current?.focus() }, 100) }} title="Criar nova pasta">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15" style={{ flexShrink: 0 }}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /><line x1="12" y1="11" x2="12" y2="17" /><line x1="9" y1="14" x2="15" y2="14" /></svg>
            Pasta
          </button>
          {onOpenTreeManager && (
            <button type="button" className="notes-sidebar-footer-btn" onClick={onOpenTreeManager} title="Central de Estrutura">
              <FolderTree size={14} style={{ flexShrink: 0 }} />
              Estrutura
            </button>
          )}
          {onOpenTrash && (
            <button 
              type="button" 
              className={`notes-sidebar-footer-btn ${showTrash ? 'is-active' : ''}`} 
              onClick={onOpenTrash} 
              title="Abrir lixeira"
              style={{ color: trashCount > 0 ? '#ef4444' : undefined }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" style={{ flexShrink: 0 }}><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /></svg>
              {trashCount > 0 ? `(${trashCount})` : 'Lixo'}
            </button>
          )}
          <button type="button" className="notes-sidebar-footer-btn" onClick={(e) => { e.preventDefault(); markdownImportRef.current?.click() }} title="Importar arquivo markdown">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" style={{ flexShrink: 0 }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
            Importar
          </button>
        </div>
        <input ref={markdownImportRef} type="file" accept=".md,.markdown" style={{ display: 'none' }} multiple onChange={handleMarkdownImport} />
      </div>
    </nav>
  )
}
