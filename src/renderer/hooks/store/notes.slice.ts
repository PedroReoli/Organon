/**
 * Notes slice — funcoes puras de mutacao de notas e pastas de notas.
 *
 * Definido no upgrade 07 sub-A. Ver hooks/store/README.md.
 */

import type { Note, NoteFolder, Store } from '../../types'
import { generateId } from '../../utils'

// ─── Pastas ─────────────────────────────────────────────────────

export function notesAddFolder(
  prev: Store,
  name: string,
  parentId?: string | null,
): Store {
  if (!name.trim()) return prev
  const newFolder: NoteFolder = {
    id: generateId(),
    name: name.trim(),
    parentId: parentId ?? null,
    order: prev.noteFolders.length,
    isHome: false,
  }
  return {
    ...prev,
    noteFolders: [...prev.noteFolders, newFolder],
  }
}

export function notesUpdateFolder(
  prev: Store,
  folderId: string,
  updates: Partial<Pick<NoteFolder, 'name' | 'parentId' | 'isHome'>>,
): Store {
  return {
    ...prev,
    noteFolders: prev.noteFolders.map((folder) =>
      folder.id === folderId ? { ...folder, ...updates } : folder,
    ),
  }
}

export function notesRemoveFolder(prev: Store, folderId: string): Store {
  return {
    ...prev,
    noteFolders: prev.noteFolders.filter((folder) => folder.id !== folderId),
    notes: prev.notes.map((note) =>
      note.folderId === folderId ? { ...note, folderId: null } : note,
    ),
    pendingDeletes: [
      ...(prev.pendingDeletes ?? []),
      { resource: 'note_folders', id: folderId },
    ],
  }
}

export function notesReorderFolders(prev: Store, orderedIds: string[]): Store {
  return {
    ...prev,
    noteFolders: prev.noteFolders.map((folder) => {
      const newOrder = orderedIds.indexOf(folder.id)
      return newOrder !== -1 ? { ...folder, order: newOrder } : folder
    }),
  }
}

// ─── Notas ──────────────────────────────────────────────────────

export function notesAdd(
  prev: Store,
  title: string,
  folderId?: string | null,
  projectId?: string | null,
  parentNoteId?: string | null,
): { store: Store; created: Note } {
  const now = new Date().toISOString()
  const newNote: Note = {
    id: generateId(),
    title: title.trim() || 'Sem titulo',
    mdPath: `notes/${generateId()}.md`,
    folderId: folderId ?? null,
    parentNoteId: parentNoteId ?? null,
    projectId: projectId ?? null,
    isPinned: false,
    isFavorite: false,
    isLocked: false,
    order: prev.notes.length,
    createdAt: now,
    updatedAt: now,
  }
  return {
    store: { ...prev, notes: [...prev.notes, newNote] },
    created: newNote,
  }
}

type NoteEditableFields =
  | 'title'
  | 'folderId'
  | 'order'
  | 'isPinned'
  | 'isFavorite'
  | 'parentNoteId'
  | 'isLocked'

export function notesUpdate(
  prev: Store,
  noteId: string,
  updates: Partial<Pick<Note, NoteEditableFields>>,
): Store {
  const now = new Date().toISOString()
  return {
    ...prev,
    notes: prev.notes.map((note) =>
      note.id === noteId ? { ...note, ...updates, updatedAt: now } : note,
    ),
  }
}

export function notesToggleFavorite(prev: Store, noteId: string): Store {
  return notesUpdate(
    prev,
    noteId,
    {
      isFavorite: !prev.notes.find((n) => n.id === noteId)?.isFavorite,
    },
  )
}

export function notesTogglePinned(prev: Store, noteId: string): Store {
  return notesUpdate(prev, noteId, {
    isPinned: !prev.notes.find((n) => n.id === noteId)?.isPinned,
  })
}

export function notesToggleLock(prev: Store, noteId: string): Store {
  return notesUpdate(prev, noteId, {
    isLocked: !prev.notes.find((n) => n.id === noteId)?.isLocked,
  })
}

export function notesReorder(prev: Store, orderedIds: string[]): Store {
  return {
    ...prev,
    notes: prev.notes.map((note) => {
      const newOrder = orderedIds.indexOf(note.id)
      return newOrder !== -1 ? { ...note, order: newOrder } : note
    }),
  }
}

export function notesRemove(prev: Store, noteId: string): Store {
  return {
    ...prev,
    notes: prev.notes.filter((note) => note.id !== noteId),
    pendingDeletes: [...(prev.pendingDeletes ?? []), { resource: 'notes', id: noteId }],
  }
}
