import React from 'react'
import {
  Folder,
  FolderOpen,
  Plus,
  ChevronRight,
  ChevronDown,
  GripVertical,
  MoreHorizontal,
  FolderPlus,
} from 'lucide-react'
import type { Note, NoteFolder, TreeItemKey, TreeItemKind } from '@types'
import { folderTreeKey } from '../utils'
import { extractEmoji } from './emojiUtils'
import { SidebarNoteItem } from './SidebarNoteItem'

export interface SidebarFolderItemProps {
  folder: NoteFolder
  depth: number
  childFolders: (parentId: string) => NoteFolder[]
  notesInFolder: (folderId: string) => Note[]
  subNotes: (parentNoteId: string) => Note[]
  expandedFolders: Set<string>
  expandedNotes: Set<string>
  selectedFolderId: string | null
  selectedNoteId: string | null
  selectedTreeItems: Set<TreeItemKey>
  dropTargetId: string | null
  renamingFolderId: string | null
  renamingFolderName: string
  newFolderParentId: string | null | undefined
  newFolderName: string
  newFolderInputRef: React.RefObject<HTMLInputElement>
  dragPayloadRef: React.MutableRefObject<{ noteIds: string[]; folderIds: string[] }>
  noteMap: Map<string, Note>
  isFolderDescendant: (candidateId: string, ancestorId: string) => boolean
  isNoteDescendant: (candidateId: string, ancestorId: string) => boolean
  startTreeDrag: (e: React.DragEvent, kind: TreeItemKind, id: string) => void
  handleDragEnd: () => void
  setDropTargetId: (id: string | null) => void
  handleDropOnFolder: (folderId: string) => void
  handleDropOnNote: (note: Note) => void
  handleTreeRowSelection: (key: TreeItemKey, e: React.MouseEvent) => boolean
  selectSingleTreeItem: (key: TreeItemKey) => void
  toggleFolder: (id: string) => void
  openFolder: (id: string) => void
  openNote: (id: string) => void
  openCtxMenu: (e: React.MouseEvent, target: { kind: 'note'; id: string } | { kind: 'folder'; id: string }) => void
  toggleNote: (id: string, e: React.MouseEvent) => void
  setNewFolderParentId: (id: string | null | undefined) => void
  setNewFolderName: (name: string) => void
  setRenamingFolderName: (name: string) => void
  setRenamingFolderId: (id: string | null) => void
  onUpdateFolder: (folderId: string, updates: Partial<Pick<NoteFolder, 'name' | 'parentId' | 'isHome'>>) => void
  handleAddFolder: () => void
  handleAddNote: (folderId?: string | null, parentNoteId?: string | null) => void
  onDuplicateNote?: (id: string) => void
}

export const SidebarFolderItem: React.FC<SidebarFolderItemProps> = (props) => {
  const {
    folder,
    depth,
    childFolders,
    notesInFolder,
    subNotes,
    expandedFolders,
    expandedNotes,
    selectedFolderId,
    selectedNoteId,
    selectedTreeItems,
    dropTargetId,
    renamingFolderId,
    renamingFolderName,
    newFolderParentId,
    newFolderName,
    newFolderInputRef,
    dragPayloadRef,
    noteMap,
    isFolderDescendant,
    isNoteDescendant,
    startTreeDrag,
    handleDragEnd,
    setDropTargetId,
    handleDropOnFolder,
    handleDropOnNote,
    handleTreeRowSelection,
    selectSingleTreeItem,
    toggleFolder,
    openFolder,
    openNote,
    openCtxMenu,
    toggleNote,
    setNewFolderParentId,
    setNewFolderName,
    setRenamingFolderName,
    setRenamingFolderId,
    onUpdateFolder,
    handleAddFolder,
    handleAddNote,
    onDuplicateNote,
  } = props

  const countNotesInFolder = (folderId: string): number => {
    const direct = notesInFolder(folderId).length
    return direct + childFolders(folderId).reduce((sum, f) => sum + countNotesInFolder(f.id), 0)
  }

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
          paddingLeft: `${8 + depth * 12}px`,
          paddingRight: '8px',
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
          const canF = dragPayloadRef.current.folderIds.some(
            fid => fid !== folder.id && !isFolderDescendant(folder.id, fid)
          )
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
        {/* Drag Grip Handle - zero width when not hovering */}
        <span className="w-0 opacity-0 group-hover:w-3.5 group-hover:opacity-60 hover:!opacity-100 transition-all duration-150 cursor-grab shrink-0 overflow-hidden flex items-center justify-center -ml-0.5">
          <GripVertical className="w-3 h-3" />
        </span>

        {/* Folder Chevron */}
        <span className="p-0.5 rounded shrink-0 opacity-70">
          {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </span>

        {/* Folder Icon */}
        {emoji ? (
          <span className="text-sm shrink-0 leading-none">{emoji}</span>
        ) : isExpanded ? (
          <FolderOpen className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        ) : (
          <Folder className="w-3.5 h-3.5 text-amber-400/80 shrink-0" />
        )}

        {/* Inline rename or label */}
        {renamingFolderId === folder.id ? (
          <input
            autoFocus
            className="bg-transparent text-xs font-semibold text-[var(--color-text)] flex-1 outline-none border-b border-[var(--color-primary)] py-0"
            value={renamingFolderName}
            onChange={e => setRenamingFolderName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                const name = renamingFolderName.trim()
                if (name) onUpdateFolder(folder.id, { name })
                setRenamingFolderId(null)
              }
              if (e.key === 'Escape') setRenamingFolderId(null)
            }}
            onBlur={() => {
              const name = renamingFolderName.trim()
              if (name) onUpdateFolder(folder.id, { name })
              setRenamingFolderId(null)
            }}
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <span
            title={folder.name || 'Sem nome'}
            style={{ color: isActive ? 'var(--color-primary)' : 'var(--color-text)' }}
            className="truncate flex-1 min-w-0 font-semibold text-[12px] leading-tight"
          >
            {(cleanTitle && cleanTitle.trim()) || (folder.name && folder.name.trim()) || 'Sem nome'}
          </span>
        )}

        {/* Note count badge - hidden on hover to make clean room for buttons */}
        {noteCount > 0 && renamingFolderId !== folder.id && (
          <span className="text-[10px] text-[var(--color-text-muted)] font-mono px-1 rounded bg-black/20 shrink-0 group-hover:opacity-0 transition-opacity duration-150 pr-1">
            {noteCount}
          </span>
        )}

        {/* Hover Actions for Folders - clean floating pill */}
        <div
          className="absolute right-1.5 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-0.5 px-1 py-0.5 rounded-md bg-[#1e293b]/95 backdrop-blur border border-white/10 shadow-md z-10 transition-all duration-150"
        >
          <button
            type="button"
            onClick={e => {
              e.stopPropagation()
              handleAddNote(folder.id, null)
            }}
            title="Nova nota nesta pasta"
            className="p-1 rounded hover:bg-white/15 text-[var(--color-text-muted)] hover:text-white transition-colors"
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
              className="p-1 rounded hover:bg-white/15 text-[var(--color-text-muted)] hover:text-white transition-colors"
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
            className="p-1 rounded hover:bg-white/15 text-[var(--color-text-muted)] hover:text-white transition-colors"
          >
            <MoreHorizontal className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Children (Subfolders and Subnotes) */}
      {isExpanded && (
        <div className="border-l border-neutral-700/25 ml-4 pl-1">
          {childFlds.map(f => (
            <SidebarFolderItem key={f.id} {...props} folder={f} depth={depth + 1} />
          ))}
          {childNts.map(n => (
            <SidebarNoteItem
              key={n.id}
              note={n}
              depth={depth + 1}
              subNotes={subNotes}
              expandedNotes={expandedNotes}
              selectedNoteId={selectedNoteId}
              selectedTreeItems={selectedTreeItems}
              dropTargetId={dropTargetId}
              dragPayloadRef={dragPayloadRef}
              isNoteDescendant={isNoteDescendant}
              startTreeDrag={startTreeDrag}
              handleDragEnd={handleDragEnd}
              setDropTargetId={setDropTargetId}
              handleDropOnNote={handleDropOnNote}
              handleTreeRowSelection={handleTreeRowSelection}
              selectSingleTreeItem={selectSingleTreeItem}
              openNote={openNote}
              openCtxMenu={openCtxMenu}
              toggleNote={toggleNote}
              handleAddNote={handleAddNote}
              onDuplicateNote={onDuplicateNote}
            />
          ))}

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
