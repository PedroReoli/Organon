import type { Note, NoteFolder, KeyboardShortcut, NoteTemplate, NoteBookmark } from '@types'

export type TreeItemKind = 'note' | 'folder'
export type TreeItemKey = string
export type BreadcrumbPart = { label: string; id: string; kind: 'folder' | 'note' }
export type SidebarCtxMenu = { x: number; y: number } & (
  | { kind: 'note'; id: string }
  | { kind: 'folder'; id: string }
)

export interface NotesViewProps {
  notes: Note[]
  folders: NoteFolder[]
  onAddNote: (title: string, folderId?: string | null, projectId?: string | null, parentNoteId?: string | null) => Note
  onUpdateNote: (noteId: string, updates: Partial<Pick<Note, 'title' | 'folderId' | 'order' | 'isPinned' | 'isFavorite' | 'parentNoteId'>>) => void
  onUpdateFolder: (folderId: string, updates: Partial<Pick<NoteFolder, 'name' | 'parentId' | 'isHome'>>) => void
  onRemoveNote: (noteId: string) => void
  onAddFolder: (name: string, parentId?: string | null) => string
  onRemoveFolder: (folderId: string) => void
  onReorderNotes: (orderedIds: string[]) => void
  onReorderFolders: (orderedIds: string[]) => void
  onToggleFavorite: (noteId: string) => void
  onTogglePinned: (noteId: string) => void
  onToggleLock: (noteId: string) => void
  reduceModeSignal?: number
  initialNoteId?: string | null
  onInitialNoteConsumed?: () => void
  keyboardShortcuts?: KeyboardShortcut[]
  // Upgrade 10a — Lixeira
  onSoftDeleteNote?: (noteId: string) => void
  onSoftDeleteFolder?: (folderId: string) => void
  onRestoreNote?: (noteId: string) => void
  onRestoreFolder?: (folderId: string) => void
  onPurgeNote?: (noteId: string) => void
  onPurgeFolder?: (folderId: string) => void
  onEmptyTrash?: () => void
  // Upgrade 10c — Templates
  noteTemplates?: NoteTemplate[]
  // Upgrade 10d — Bookmarks
  onSetNoteBookmarks?: (noteId: string, bookmarks: NoteBookmark[]) => void
}
