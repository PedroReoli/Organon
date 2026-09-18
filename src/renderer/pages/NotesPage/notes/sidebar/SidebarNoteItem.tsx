import React from 'react'
import {
  FileText,
  Star,
  Pin,
  Lock,
  Plus,
  ChevronRight,
  ChevronDown,
  GripVertical,
  MoreHorizontal,
  Copy,
} from 'lucide-react'
import type { Note, TreeItemKey, TreeItemKind } from '@types'
import { noteTreeKey } from '../utils'
import { extractEmoji } from './emojiUtils'

export interface SidebarNoteItemProps {
  note: Note
  depth: number
  subNotes: (parentNoteId: string) => Note[]
  expandedNotes: Set<string>
  selectedNoteId: string | null
  selectedTreeItems: Set<TreeItemKey>
  dropTargetId: string | null
  dragPayloadRef: React.MutableRefObject<{ noteIds: string[]; folderIds: string[] }>
  isNoteDescendant: (candidateId: string, ancestorId: string) => boolean
  startTreeDrag: (e: React.DragEvent, kind: TreeItemKind, id: string) => void
  handleDragEnd: () => void
  setDropTargetId: (id: string | null) => void
  handleDropOnNote: (note: Note) => void
  handleTreeRowSelection: (key: TreeItemKey, e: React.MouseEvent) => boolean
  selectSingleTreeItem: (key: TreeItemKey) => void
  openNote: (id: string) => void
  openCtxMenu: (e: React.MouseEvent, target: { kind: 'note'; id: string } | { kind: 'folder'; id: string }) => void
  toggleNote: (id: string, e: React.MouseEvent) => void
  handleAddNote: (folderId?: string | null, parentNoteId?: string | null) => void
  onDuplicateNote?: (id: string) => void
}

export const SidebarNoteItem: React.FC<SidebarNoteItemProps> = ({
  note,
  depth,
  subNotes,
  expandedNotes,
  selectedNoteId,
  selectedTreeItems,
  dropTargetId,
  dragPayloadRef,
  isNoteDescendant,
  startTreeDrag,
  handleDragEnd,
  setDropTargetId,
  handleDropOnNote,
  handleTreeRowSelection,
  selectSingleTreeItem,
  openNote,
  openCtxMenu,
  toggleNote,
  handleAddNote,
  onDuplicateNote,
}) => {
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
          const canDrop = dragPayloadRef.current.noteIds.some(
            id => id !== note.id && !isNoteDescendant(note.id, id)
          )
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
            {isExpanded ? (
              <ChevronDown className="w-3 h-3 opacity-70" />
            ) : (
              <ChevronRight className="w-3 h-3 opacity-70" />
            )}
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
          {children.map(child => (
            <SidebarNoteItem
              key={child.id}
              note={child}
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
        </div>
      )}
    </div>
  )
}
