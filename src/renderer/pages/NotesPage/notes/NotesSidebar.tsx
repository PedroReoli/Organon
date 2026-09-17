import React, { useState } from 'react'
import {
  FolderTree,
  Folder,
  FolderOpen,
  FileText,
  Star,
  Pin,
  Lock,
  Plus,
  Search,
  Trash2,
  ChevronRight,
  ChevronDown,
  GripVertical,
  MoreHorizontal,
  LayoutGrid,
  UploadCloud,
  X,
  PanelLeftClose,
  FolderPlus,
  ChevronsDownUp,
  Copy
} from 'lucide-react'
import type { Note, NoteFolder, TreeItemKey, TreeItemKind } from '@types'
import { folderTreeKey, noteTreeKey } from './utils'

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
  notes: Note[]
  folders: NoteFolder[]
  // Home
  activeView: 'home' | 'note' | 'folder'
  onGoHome: () => void
  showTrash?: boolean
  onOpenTrash?: () => void
  trashCount?: number
  onOpenTreeManager?: () => void
  onRequestDeleteNote?: (id: string) => void
  onDuplicateNote?: (id: string) => void
  // Selection
  selectedNoteId: string | null
  selectedFolderId: string | null
  selectedTreeItems: Set<TreeItemKey>
  // Expand
  expandedFolders: Set<string>
  expandedNotes: Set<string>
  // Sidebar
  sidebarOpen: boolean
  setSidebarOpen: (v: boolean) => void
  // Search
  searchVisible: boolean
  searchQuery: string
  setSearchQuery: (q: string) => void
  setSearchVisible: (v: boolean) => void
  searchResults: Note[]
  searchInputRef: React.RefObject<HTMLInputElement>
  // Recent notes
  recentNoteIds: string[]
  // New folder
  newFolderParentId: string | null | undefined
  setNewFolderParentId: (v: string | null | undefined) => void
  newFolderName: string
  setNewFolderName: (name: string) => void
  newFolderInputRef: React.RefObject<HTMLInputElement>
  onAddFolder: (name: string, parentId?: string | null) => string
  // Rename
  renamingFolderId: string | null
  setRenamingFolderId: (id: string | null) => void
  renamingFolderName: string
  setRenamingFolderName: (name: string) => void
  onUpdateFolder: (folderId: string, updates: Partial<Pick<NoteFolder, 'name' | 'parentId' | 'isHome'>>) => void
  // Drag
  dropTargetId: string | null
  setDropTargetId: (id: string | null) => void
  dragCount: number
  dragPayloadRef: React.MutableRefObject<{ noteIds: string[]; folderIds: string[] }>
  // Computed
  favorites: Note[]
  pinned: Note[]
  rootFolders: NoteFolder[]
  rootNotes: Note[]
  childFolders: (parentId: string) => NoteFolder[]
  notesInFolder: (folderId: string) => Note[]
  subNotes: (parentNoteId: string) => Note[]
  noteMap: Map<string, Note>
  markdownImportRef: React.RefObject<HTMLInputElement>
  // Handlers
  openNote: (id: string) => void
  openFolder: (id: string) => void
  handleAddNote: (folderId?: string | null, parentNoteId?: string | null) => void
  toggleFolder: (id: string) => void
  toggleNote: (id: string, e: React.MouseEvent) => void
  startTreeDrag: (e: React.DragEvent, kind: TreeItemKind, id: string) => void
  handleDragEnd: () => void
  handleDropOnFolder: (folderId: string) => void
  handleDropOnNote: (note: Note) => void
  handleDropOnRoot: () => void
  handleTreeRowSelection: (key: TreeItemKey, e: React.MouseEvent) => boolean
  selectSingleTreeItem: (key: TreeItemKey) => void
  toggleTreeItemSelection: (key: TreeItemKey) => void
  clearSelection: () => void
  onCollapseAll: () => void
  openCtxMenu: (e: React.MouseEvent, target: { kind: 'note'; id: string } | { kind: 'folder'; id: string }) => void
  handleMarkdownImport: (e: React.ChangeEvent<HTMLInputElement>) => void
  isFolderDescendant: (candidateId: string, ancestorId: string) => boolean
  isNoteDescendant: (candidateId: string, ancestorId: string) => boolean
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
    onClick={onToggle}
    onDragOver={onDragOver}
    onDragLeave={onDragLeave}
    onDrop={onDrop}
    style={{
      borderColor: isDropTarget ? 'var(--color-primary)' : 'transparent',
      background: isDropTarget ? 'color-mix(in srgb, var(--color-primary) 15%, transparent)' : 'transparent',
    }}
    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold tracking-wider text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-white/[0.04] transition-all cursor-pointer group select-none"
  >
    <div className="flex items-center gap-1.5 truncate">
      {onToggle && (
        <span className="opacity-60 group-hover:opacity-100 transition-opacity">
          {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </span>
      )}
      {icon && <span className="opacity-80">{icon}</span>}
      <span className="uppercase text-[11px] font-bold tracking-wider truncate">{label}</span>
    </div>

    {count !== undefined && count > 0 && (
      <span
        style={{
          background: 'color-mix(in srgb, var(--color-background) 80%, var(--color-surface))',
          color: 'var(--color-text-muted)',
        }}
        className="text-[10px] font-mono px-1.5 py-0.2 rounded-full border border-neutral-700/20 shrink-0"
      >
        {count}
      </span>
    )}
  </button>
)

export const NotesSidebar: React.FC<NotesSidebarProps> = (props) => {
  const {
    notes: _notes, activeView, onGoHome, showTrash: _showTrash = false, onOpenTrash, trashCount = 0, onOpenTreeManager, onRequestDeleteNote: _onRequestDeleteNote, onDuplicateNote,
    selectedNoteId, selectedFolderId, selectedTreeItems,
    expandedFolders, expandedNotes, sidebarOpen, setSidebarOpen,
    searchQuery, setSearchQuery, setSearchVisible: _setSearchVisible, searchResults, searchInputRef,
    newFolderParentId, setNewFolderParentId, newFolderName, setNewFolderName, newFolderInputRef, onAddFolder,
    renamingFolderId, setRenamingFolderId, renamingFolderName, setRenamingFolderName, onUpdateFolder,
    dropTargetId, setDropTargetId, dragCount, dragPayloadRef,
    favorites, pinned, rootFolders, rootNotes, childFolders, notesInFolder, subNotes, noteMap,
    markdownImportRef,
    openNote, openFolder, handleAddNote, toggleFolder, toggleNote,
    startTreeDrag, handleDragEnd, handleDropOnFolder, handleDropOnNote, handleDropOnRoot,
    handleTreeRowSelection, selectSingleTreeItem, toggleTreeItemSelection: _toggleTreeItemSelection, clearSelection: _clearSelection, onCollapseAll,
    openCtxMenu, handleMarkdownImport,
    isFolderDescendant, isNoteDescendant,
  } = props

  const [favoritesCollapsed, setFavoritesCollapsed] = useState(false)
  const [pinnedCollapsed, setPinnedCollapsed] = useState(false)
  const [privateCollapsed, setPrivateCollapsed] = useState(false)

  const countNotesInFolder = (folderId: string): number => {
    const direct = notesInFolder(folderId).length
    return direct + childFolders(folderId).reduce((sum, f) => sum + countNotesInFolder(f.id), 0)
  }

  const handleAddFolder = () => {
    const name = newFolderName.trim()
    if (!name) return
    onAddFolder(name, newFolderParentId ?? null)
    setNewFolderName('')
    setNewFolderParentId(undefined)
  }

  const renderNote = (note: Note, depth: number): React.ReactElement => {
    const children = subNotes(note.id)
    const isExpanded = expandedNotes.has(note.id)
    const isActive = selectedNoteId === note.id
    const treeKey = noteTreeKey(note.id)
    const isSelected = selectedTreeItems.has(treeKey)
    const isDropTarget = dropTargetId === note.id
    const { emoji, cleanTitle } = extractEmoji(note.title)

    return (
      <div key={note.id} className="relative group/note select-none">
        <div
          draggable
          data-tree-kind="note"
          data-tree-id={note.id}
          title={note.title || 'Sem título'}
          style={{
            paddingLeft: `${10 + depth * 14}px`,
            paddingRight: '60px',
            background: isActive
              ? 'color-mix(in srgb, var(--color-primary) 14%, var(--color-surface))'
              : isSelected
              ? 'color-mix(in srgb, var(--color-primary) 8%, transparent)'
              : 'transparent',
            borderColor: isDropTarget
              ? 'var(--color-primary)'
              : isActive
              ? 'color-mix(in srgb, var(--color-primary) 30%, transparent)'
              : 'transparent',
            boxShadow: isDropTarget ? '0 0 8px var(--color-primary)' : 'none',
          }}
          className="relative flex items-center gap-1.5 py-1.5 my-0.5 rounded-lg border text-xs font-medium cursor-pointer transition-all duration-150 hover:bg-white/[0.05] group"
          onDragStart={e => startTreeDrag(e, 'note', note.id)}
          onDragEnd={handleDragEnd}
          onDragOver={e => {
            e.preventDefault()
            e.stopPropagation()
            const canDrop = dragPayloadRef.current.noteIds.some(id => id !== note.id && !isNoteDescendant(note.id, id))
            if (canDrop) setDropTargetId(note.id)
          }}
          onDragLeave={e => {
            e.stopPropagation()
            if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropTargetId(null)
          }}
          onDrop={e => {
            e.preventDefault()
            e.stopPropagation()
            handleDropOnNote(note)
          }}
          onClick={e => {
            if (handleTreeRowSelection(treeKey, e)) return
            selectSingleTreeItem(treeKey)
            openNote(note.id)
          }}
          onContextMenu={e => {
            if (!selectedTreeItems.has(treeKey)) selectSingleTreeItem(treeKey)
            openCtxMenu(e, { kind: 'note', id: note.id })
          }}
        >
          {/* Drag Grip Handle */}
          <span className="opacity-0 group-hover:opacity-40 hover:opacity-100 transition-opacity cursor-grab shrink-0">
            <GripVertical className="w-3 h-3" />
          </span>

          {/* Subnote Expand Chevron */}
          {children.length > 0 ? (
            <button
              type="button"
              onClick={e => {
                e.stopPropagation()
                toggleNote(note.id, e)
              }}
              className="p-0.5 rounded hover:bg-white/10 transition-colors shrink-0"
            >
              {isExpanded ? <ChevronDown className="w-3 h-3 opacity-70" /> : <ChevronRight className="w-3 h-3 opacity-70" />}
            </button>
          ) : (
            <span className="w-3 shrink-0" />
          )}

          {/* Emoji / File Icon */}
          {emoji ? (
            <span className="text-sm shrink-0 leading-none">{emoji}</span>
          ) : (
            <FileText
              className="w-3.5 h-3.5 shrink-0 transition-colors"
              style={{ color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)' }}
            />
          )}

          {/* Label Truncated with ellipsis */}
          <span
            style={{ color: isActive ? 'var(--color-primary)' : 'var(--color-text)' }}
            className="truncate flex-1 min-w-0 font-medium text-[12px]"
          >
            {(cleanTitle && cleanTitle.trim()) || (note.title && note.title.trim()) || 'Sem título'}
          </span>

          {/* Status Badges */}
          <div className="flex items-center gap-1 shrink-0">
            {note.isFavorite && <Star className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />}
            {note.isPinned && <Pin className="w-2.5 h-2.5 text-emerald-400" />}
            {note.isLocked && <Lock className="w-2.5 h-2.5 text-rose-400" />}
          </div>

          {/* Hover Action Buttons */}
          <div
            style={{
              background: 'linear-gradient(90deg, transparent, var(--color-surface) 30%)',
            }}
            className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5 pl-2 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            {onDuplicateNote && (
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation()
                  onDuplicateNote(note.id)
                }}
                title="Duplicar nota"
                className="p-1 rounded hover:bg-white/10 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
              >
                <Copy className="w-3 h-3" />
              </button>
            )}

            <button
              type="button"
              onClick={e => {
                e.stopPropagation()
                handleAddNote(note.folderId, note.id)
              }}
              title="Nova subpágina"
              className="p-1 rounded hover:bg-white/10 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
            >
              <Plus className="w-3 h-3" />
            </button>

            <button
              type="button"
              onClick={e => {
                e.stopPropagation()
                openCtxMenu(e, { kind: 'note', id: note.id })
              }}
              title="Mais opções"
              className="p-1 rounded hover:bg-white/10 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
            >
              <MoreHorizontal className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Subnotes recursive container */}
        {isExpanded && children.length > 0 && (
          <div className="border-l border-neutral-700/25 ml-4 pl-1">
            {children.map(child => renderNote(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  const renderFolder = (folder: NoteFolder, depth: number): React.ReactElement => {
    const isExpanded = expandedFolders.has(folder.id)
    const childFlds = childFolders(folder.id)
    const childNts = notesInFolder(folder.id)
    const treeKey = folderTreeKey(folder.id)
    const isSelected = selectedTreeItems.has(treeKey)
    const isActive = selectedFolderId === folder.id
    const isDropTarget = dropTargetId === folder.id
    const noteCount = countNotesInFolder(folder.id)
    const { emoji, cleanTitle } = extractEmoji(folder.name)

    const MAX_DEPTH = 2

    return (
      <div key={folder.id} className="relative group/folder select-none">
        <div
          draggable
          data-tree-kind="folder"
          data-tree-id={folder.id}
          title={folder.name || 'Sem nome'}
          style={{
            paddingLeft: `${10 + depth * 14}px`,
            paddingRight: '60px',
            background: isActive
              ? 'color-mix(in srgb, var(--color-primary) 14%, var(--color-surface))'
              : isSelected
              ? 'color-mix(in srgb, var(--color-primary) 8%, transparent)'
              : 'transparent',
            borderColor: isDropTarget
              ? 'var(--color-primary)'
              : isActive
              ? 'color-mix(in srgb, var(--color-primary) 30%, transparent)'
              : 'transparent',
            boxShadow: isDropTarget ? '0 0 8px var(--color-primary)' : 'none',
          }}
          className="relative flex items-center gap-1.5 py-1.5 my-0.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all duration-150 hover:bg-white/[0.05] group"
          onDragStart={e => startTreeDrag(e, 'folder', folder.id)}
          onDragEnd={handleDragEnd}
          onDragOver={e => {
            e.preventDefault()
            e.stopPropagation()
            const canF = dragPayloadRef.current.folderIds.some(fid => fid !== folder.id && !isFolderDescendant(folder.id, fid))
            const canN = dragPayloadRef.current.noteIds.some(nid => noteMap.has(nid))
            if (canF || canN) setDropTargetId(folder.id)
          }}
          onDragLeave={e => {
            e.stopPropagation()
            if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropTargetId(null)
          }}
          onDrop={e => {
            e.preventDefault()
            e.stopPropagation()
            handleDropOnFolder(folder.id)
          }}
          onContextMenu={e => openCtxMenu(e, { kind: 'folder', id: folder.id })}
          onClick={e => {
            if (renamingFolderId === folder.id) return
            if (handleTreeRowSelection(treeKey, e)) return
            selectSingleTreeItem(treeKey)
            toggleFolder(folder.id)
          }}
          onDoubleClick={e => {
            e.stopPropagation()
            if (renamingFolderId === folder.id) return
            openFolder(folder.id)
          }}
        >
          {/* Drag Grip Handle */}
          <span className="opacity-0 group-hover:opacity-40 hover:opacity-100 transition-opacity cursor-grab shrink-0">
            <GripVertical className="w-3 h-3" />
          </span>

          {/* Folder Chevron */}
          <button
            type="button"
            onClick={e => {
              e.stopPropagation()
              toggleFolder(folder.id)
            }}
            className="p-0.5 rounded hover:bg-white/10 transition-colors shrink-0"
          >
            {isExpanded ? <ChevronDown className="w-3 h-3 opacity-70" /> : <ChevronRight className="w-3 h-3 opacity-70" />}
          </button>

          {/* Folder Icon / Emoji */}
          {emoji ? (
            <span className="text-sm shrink-0 leading-none">{emoji}</span>
          ) : isExpanded ? (
            <FolderOpen className="w-3.5 h-3.5 text-[var(--color-primary)] shrink-0" />
          ) : (
            <Folder className="w-3.5 h-3.5 text-[var(--color-primary)] shrink-0" />
          )}

          {/* Folder Rename Input / Label */}
          {renamingFolderId === folder.id ? (
            <input
              autoFocus
              className="bg-[var(--color-background)] border border-[var(--color-primary)] px-1.5 py-0.5 rounded text-xs text-[var(--color-text)] flex-1 min-w-0"
              value={renamingFolderName}
              onClick={e => e.stopPropagation()}
              onChange={e => setRenamingFolderName(e.target.value)}
              onKeyDown={e => {
                e.stopPropagation()
                if (e.key === 'Enter') {
                  const next = renamingFolderName.trim()
                  if (next && next !== folder.name) onUpdateFolder(folder.id, { name: next })
                  setRenamingFolderId(null)
                } else if (e.key === 'Escape') setRenamingFolderId(null)
              }}
              onBlur={() => {
                const next = renamingFolderName.trim()
                if (next && next !== folder.name) onUpdateFolder(folder.id, { name: next })
                setRenamingFolderId(null)
              }}
            />
          ) : (
            <span
              style={{ color: isActive ? 'var(--color-primary)' : 'var(--color-text)' }}
              className="truncate flex-1 min-w-0 font-semibold text-[12px]"
            >
              {cleanTitle || folder.name}
            </span>
          )}

          {/* Note count badge */}
          {noteCount > 0 && renamingFolderId !== folder.id && (
            <span className="text-[10px] text-[var(--color-text-muted)] font-mono px-1 rounded bg-black/20 shrink-0">
              {noteCount}
            </span>
          )}

          {/* Hover Actions for Folders */}
          <div
            style={{
              background: 'linear-gradient(90deg, transparent, var(--color-surface) 30%)',
            }}
            className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5 pl-2 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <button
              type="button"
              onClick={e => {
                e.stopPropagation()
                handleAddNote(folder.id, null)
              }}
              title="Nova nota nesta pasta"
              className="p-1 rounded hover:bg-white/10 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
            >
              <Plus className="w-3 h-3" />
            </button>

            {depth < MAX_DEPTH && (
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation()
                  setNewFolderParentId(folder.id)
                  if (!isExpanded) toggleFolder(folder.id)
                  setTimeout(() => newFolderInputRef.current?.focus(), 50)
                }}
                title="Nova subpasta"
                className="p-1 rounded hover:bg-white/10 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
              >
                <FolderPlus className="w-3 h-3" />
              </button>
            )}

            <button
              type="button"
              onClick={e => {
                e.stopPropagation()
                openCtxMenu(e, { kind: 'folder', id: folder.id })
              }}
              title="Mais opções"
              className="p-1 rounded hover:bg-white/10 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
            >
              <MoreHorizontal className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Children (Subfolders and Subnotes) */}
        {isExpanded && (
          <div className="border-l border-neutral-700/25 ml-4 pl-1">
            {childFlds.map(f => renderFolder(f, depth + 1))}
            {childNts.map(n => renderNote(n, depth + 1))}

            {/* Inline Subfolder creation input */}
            {newFolderParentId === folder.id && (
              <div className="flex items-center gap-1.5 px-2 py-1 my-1 rounded border border-[var(--color-primary)] bg-[var(--color-background)]">
                <FolderPlus className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                <input
                  ref={newFolderInputRef}
                  className="bg-transparent text-xs text-[var(--color-text)] flex-1 outline-none"
                  value={newFolderName}
                  onChange={e => setNewFolderName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleAddFolder()
                    if (e.key === 'Escape') {
                      setNewFolderParentId(undefined)
                      setNewFolderName('')
                    }
                  }}
                  onBlur={() => {
                    if (newFolderName.trim()) handleAddFolder()
                    else {
                      setNewFolderParentId(undefined)
                      setNewFolderName('')
                    }
                  }}
                  placeholder="Nome da subpasta..."
                />
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  const isSidebarCollapsed = !sidebarOpen

  return (
    <nav
      style={{
        width: sidebarOpen ? '260px' : '0px',
        background: 'color-mix(in srgb, var(--color-surface) 95%, var(--color-background))',
        borderColor: 'var(--color-border)',
      }}
      className={`h-full border-r flex flex-col justify-between select-none relative transition-all duration-300 overflow-hidden ${isSidebarCollapsed ? 'w-0 border-none' : ''}`}
    >
      {/* Top Header & Search */}
      <div className="p-2.5 border-b border-neutral-800/60 space-y-2 shrink-0">
        <div className="flex items-center justify-between gap-1">
          {/* Search Input Bar */}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-[var(--color-text-muted)] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={searchInputRef}
              style={{
                background: 'color-mix(in srgb, var(--color-background) 70%, var(--color-surface))',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text)',
              }}
              className="w-full pl-8 pr-6 py-1.5 rounded-lg border text-xs outline-none focus:border-[var(--color-primary)] transition-colors"
              placeholder="Buscar notas..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Escape') {
                  setSearchQuery('')
                }
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Quick actions top icons */}
          <div className="flex items-center gap-0.5 text-[var(--color-text-muted)] shrink-0">
            <button
              type="button"
              onClick={() => handleAddNote()}
              title="Nova nota rápida"
              className="p-1.5 rounded-lg hover:bg-white/10 hover:text-[var(--color-text)] transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[var(--color-primary)]" />
            </button>
            <button
              type="button"
              onClick={onCollapseAll}
              title="Recolher todas as pastas"
              className="p-1.5 rounded-lg hover:bg-white/10 hover:text-[var(--color-text)] transition-colors cursor-pointer"
            >
              <ChevronsDownUp className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              title="Recolher barra lateral"
              className="p-1.5 rounded-lg hover:bg-white/10 hover:text-[var(--color-text)] transition-colors cursor-pointer"
            >
              <PanelLeftClose className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Tree Body */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-2">
        {/* Hubs / Visão Geral Button */}
        <button
          type="button"
          onClick={onGoHome}
          style={{
            background: activeView === 'home'
              ? 'color-mix(in srgb, var(--color-primary) 12%, var(--color-surface))'
              : 'transparent',
            borderColor: activeView === 'home'
              ? 'color-mix(in srgb, var(--color-primary) 30%, transparent)'
              : 'transparent',
            color: activeView === 'home' ? 'var(--color-primary)' : 'var(--color-text)',
          }}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer hover:bg-white/[0.04]"
        >
          <LayoutGrid className="w-3.5 h-3.5 shrink-0 opacity-80" />
          <span>Visão Geral</span>
        </button>

        {searchQuery.trim() ? (
          <div className="space-y-1 mt-2">
            <div className="text-[11px] font-bold text-[var(--color-text-muted)] px-2 uppercase">
              Resultados da Busca
            </div>
            {searchResults.length > 0 ? (
              searchResults.map(n => renderNote(n, 0))
            ) : (
              <div className="text-xs text-[var(--color-text-muted)] text-center py-4">
                Nenhuma nota encontrada.
              </div>
            )}
          </div>
        ) : (
          <>
            {/* FAVORITAS */}
            {favorites.length > 0 && (
              <div className="space-y-0.5">
                <SectionHeader
                  label="Favoritas"
                  icon={<Star className="w-3 h-3 text-amber-500 fill-amber-500" />}
                  count={favorites.length}
                  isCollapsed={favoritesCollapsed}
                  onToggle={() => setFavoritesCollapsed(v => !v)}
                />
                {!favoritesCollapsed && (
                  <div className="space-y-0.5">
                    {favorites.map(n => renderNote(n, 0))}
                  </div>
                )}
              </div>
            )}

            {/* FIXADAS */}
            {pinned.length > 0 && (
              <div className="space-y-0.5">
                <SectionHeader
                  label="Fixadas"
                  icon={<Pin className="w-3 h-3 text-emerald-400" />}
                  count={pinned.length}
                  isCollapsed={pinnedCollapsed}
                  onToggle={() => setPinnedCollapsed(v => !v)}
                />
                {!pinnedCollapsed && (
                  <div className="space-y-0.5">
                    {pinned.map(n => renderNote(n, 0))}
                  </div>
                )}
              </div>
            )}

            {/* MAIN FOLDERS & NOTES */}
            <div className="space-y-0.5 pt-1">
              <SectionHeader
                label={dragCount > 0 ? `Mover ${dragCount} para Raiz` : 'Minhas Pastas'}
                icon={<Folder className="w-3 h-3 text-[var(--color-primary)]" />}
                count={rootFolders.length + rootNotes.length}
                isCollapsed={privateCollapsed}
                isDropTarget={dropTargetId === 'root-zone'}
                onToggle={() => setPrivateCollapsed(v => !v)}
                onDragOver={e => {
                  e.preventDefault()
                  e.stopPropagation()
                  setDropTargetId('root-zone')
                }}
                onDragLeave={e => {
                  e.stopPropagation()
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropTargetId(null)
                }}
                onDrop={e => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleDropOnRoot()
                }}
              />

              {!privateCollapsed && (
                <div className="space-y-0.5">
                  {rootFolders.map(f => renderFolder(f, 0))}
                  {rootNotes.map(n => renderNote(n, 0))}

                  {/* Inline New Root Folder creation */}
                  {newFolderParentId === null && (
                    <div className="flex items-center gap-1.5 px-2 py-1.5 my-1 rounded-lg border border-[var(--color-primary)] bg-[var(--color-background)]">
                      <FolderPlus className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                      <input
                        ref={newFolderInputRef}
                        className="bg-transparent text-xs text-[var(--color-text)] flex-1 outline-none font-medium"
                        value={newFolderName}
                        onChange={e => setNewFolderName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleAddFolder()
                          if (e.key === 'Escape') {
                            setNewFolderParentId(undefined)
                            setNewFolderName('')
                          }
                        }}
                        onBlur={() => {
                          if (newFolderName.trim()) handleAddFolder()
                          else {
                            setNewFolderParentId(undefined)
                            setNewFolderName('')
                          }
                        }}
                        placeholder="Nome da pasta..."
                      />
                    </div>
                  )}

                  {rootFolders.length === 0 && rootNotes.length === 0 && (
                    <div className="text-xs text-[var(--color-text-muted)] text-center py-6">
                      Nenhuma pasta criada.
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Footer Quick Controls */}
      <div className="p-2.5 border-t border-neutral-800/60 space-y-1.5 shrink-0 bg-[var(--color-surface)]">
        {/* Nova Nota Primary Pill */}
        <button
          type="button"
          onClick={() => handleAddNote()}
          style={{
            background: 'var(--color-primary)',
            color: 'var(--color-primary-text, #ffffff)',
          }}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all cursor-pointer shadow-xs"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Nova Nota</span>
        </button>

        {/* Compact Tool Row */}
        <div className="grid grid-cols-4 gap-1 text-[11px] font-medium text-[var(--color-text-muted)]">
          <button
            type="button"
            onClick={() => {
              setNewFolderParentId(null)
              setTimeout(() => newFolderInputRef.current?.focus(), 50)
            }}
            title="Criar nova pasta raiz"
            className="p-1.5 rounded-lg border border-neutral-800/50 hover:border-neutral-700 hover:text-[var(--color-text)] hover:bg-white/[0.04] transition-all flex flex-col items-center gap-0.5 cursor-pointer"
          >
            <FolderPlus className="w-3.5 h-3.5 text-[var(--color-primary)]" />
            <span className="text-[9px]">Pasta</span>
          </button>

          {onOpenTreeManager && (
            <button
              type="button"
              onClick={onOpenTreeManager}
              title="Gerenciar estrutura de pastas"
              className="p-1.5 rounded-lg border border-neutral-800/50 hover:border-neutral-700 hover:text-[var(--color-text)] hover:bg-white/[0.04] transition-all flex flex-col items-center gap-0.5 cursor-pointer"
            >
              <FolderTree className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-[9px]">Estrutura</span>
            </button>
          )}

          {onOpenTrash && (
            <button
              type="button"
              onClick={onOpenTrash}
              title="Abrir Lixeira"
              style={{
                color: trashCount > 0 ? '#f43f5e' : undefined,
                borderColor: trashCount > 0 ? 'rgba(244, 63, 94, 0.3)' : undefined,
              }}
              className="p-1.5 rounded-lg border border-neutral-800/50 hover:border-neutral-700 hover:text-rose-400 hover:bg-white/[0.04] transition-all flex flex-col items-center gap-0.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="text-[9px]">{trashCount > 0 ? `Lixo (${trashCount})` : 'Lixeira'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => markdownImportRef.current?.click()}
            title="Importar arquivos .md"
            className="p-1.5 rounded-lg border border-neutral-800/50 hover:border-neutral-700 hover:text-[var(--color-text)] hover:bg-white/[0.04] transition-all flex flex-col items-center gap-0.5 cursor-pointer"
          >
            <UploadCloud className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[9px]">Importar</span>
          </button>
        </div>

        <input
          ref={markdownImportRef}
          type="file"
          accept=".md,.markdown"
          style={{ display: 'none' }}
          multiple
          onChange={handleMarkdownImport}
        />
      </div>
    </nav>
  )
}
