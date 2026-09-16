import type { Note, NoteFolder, Store } from '../../types'
import type { UpdateStoreFn } from './types'
import { generateId, isElectron } from '../../utils'

const safeNoteSegment = (value: string, fallback: string): string => {
  const cleaned = value.normalize('NFC')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
    .replace(/[. ]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return (cleaned || fallback).slice(0, 80)
}

const getReadableNotePath = (store: Store, title: string, noteId: string, folderId: string | null): string => {
  const byId = new Map(store.noteFolders.map(folder => [folder.id, folder]))
  const segments: string[] = []
  const visited = new Set<string>()
  let currentId = folderId
  while (currentId && !visited.has(currentId)) {
    visited.add(currentId)
    const folder = byId.get(currentId)
    if (!folder) break
    segments.unshift(safeNoteSegment(folder.name, `Pasta-${folder.id.slice(0, 8)}`))
    currentId = folder.parentId
  }
  if (segments.length === 0) segments.push('Sem pasta')
  segments.push(`${safeNoteSegment(title, 'Sem título')}--${noteId.slice(0, 8)}.md`)
  return segments.join('/')
}

export const createNotesSlice = (updateStore: UpdateStoreFn) => {
  // ─── Pastas ─────────────────────────────────────────────────────

  const addNoteFolder = (name: string, parentId?: string | null) => {
    const newFolder: NoteFolder = {
      id: generateId(),
      name: name.trim(),
      parentId: parentId ?? null,
      order: Date.now(),
      isHome: false,
    }
    updateStore(prev => ({
      ...prev,
      noteFolders: [...prev.noteFolders, newFolder],
    }))
    return newFolder.id
  }

  const updateNoteFolder = (folderId: string, updates: Partial<Pick<NoteFolder, 'name' | 'parentId' | 'isHome'>>) => {
    updateStore(prev => ({
      ...prev,
      noteFolders: prev.noteFolders.map((folder: any) => {
        if (folder.id !== folderId) return folder
        return { ...folder, ...updates }
      }),
    }))
  }

  const removeNoteFolder = (folderId: string) => {
    updateStore(prev => ({
      ...prev,
      noteFolders: prev.noteFolders.filter((folder: any) => folder.id !== folderId),
      pendingDeletes: [...(prev.pendingDeletes ?? []), { resource: 'note_folders', id: folderId }],
      notes: prev.notes.map((note: any) => (
        note.folderId === folderId ? { ...note, folderId: null } : note
      )),
    }))
  }

  const reorderNoteFolders = (orderedIds: string[]) => {
    updateStore(prev => ({
      ...prev,
      noteFolders: prev.noteFolders.map((folder: any) => {
        const idx = orderedIds.indexOf(folder.id)
        if (idx === -1) return folder
        return { ...folder, order: idx }
      }),
    }))
  }

  // ─── Notas ─────────────────────────────────────────────────────

  const addNote = (input: string | {
    title: string
    content?: string
    folderId?: string | null
    projectId?: string | null
    parentNoteId?: string | null
  }, contentParam?: string) => {
    const rawTitle = typeof input === 'object' && input ? input.title : input
    const rawContent = typeof input === 'object' && input ? (input.content ?? '') : (contentParam ?? '')
    const folderId = typeof input === 'object' && input ? input.folderId : null
    const projectId = typeof input === 'object' && input ? input.projectId : null
    const parentNoteId = typeof input === 'object' && input ? input.parentNoteId : null

    const titleStr = typeof rawTitle === 'string' ? rawTitle.trim() : (rawTitle ? String(rawTitle) : 'Sem título')
    const now = new Date().toISOString()
    const noteId = generateId()
    let newNote: Note | null = null
    updateStore(prev => {
      const title = titleStr || 'Sem título'
      newNote = {
        id: noteId,
        title,
        mdPath: getReadableNotePath(prev, title, noteId, folderId ?? null),
        folderId: folderId ?? null,
        projectId: projectId ?? null,
        parentNoteId: parentNoteId ?? null,
        isPinned: false,
        isFavorite: false,
        isLocked: false,
        createdAt: now,
        updatedAt: now,
        order: prev.notes.length,
      }
      return { ...prev, notes: [...prev.notes, newNote!] }
    })
    if (!newNote) throw new Error('Não foi possível criar a nota.')
    const createdNote: Note = newNote
    if (rawContent && isElectron()) {
      window.electronAPI.writeNote(createdNote.mdPath, String(rawContent)).catch(() => {})
    }
    return createdNote
  }

  const updateNote = (noteId: string, updates: Partial<Pick<Note, 'title' | 'content' | 'folderId' | 'projectId' | 'parentNoteId' | 'isPinned' | 'isFavorite' | 'isLocked'>>) => {
    updateStore(prev => ({
      ...prev,
      notes: prev.notes.map((note: any) => {
        if (note.id !== noteId) return note
        return { ...note, ...updates, updatedAt: new Date().toISOString() }
      }),
    }))
  }

  const removeNote = (noteId: string) => {
    updateStore(prev => ({
      ...prev,
      notes: prev.notes.filter((note: any) => note.id !== noteId),
      pendingDeletes: [...(prev.pendingDeletes ?? []), { resource: 'notes', id: noteId }],
    }))
  }

  // ─── Lixeira ─────────────────────────────────────────────────────

  const softDeleteNote = (noteId: string) => {
    const now = new Date().toISOString()
    updateStore(prev => {
      const target = prev.notes.find((n: any) => n.id === noteId)
      if (target?.isLocked) return prev
      return {
        ...prev,
        notes: prev.notes.map((n: any) =>
          n.id === noteId
            ? { ...n, deletedAt: now, deletedFromFolderId: n.folderId, folderId: null }
            : n,
        ),
      }
    })
  }

  const softDeleteNoteFolder = (folderId: string) => {
    const now = new Date().toISOString()
    updateStore(prev => {
      const childFolderIds = new Set<string>([folderId])
      let added = true
      while (added) {
        added = false
        for (const f of prev.noteFolders) {
          if (f.parentId && childFolderIds.has(f.parentId) && !childFolderIds.has(f.id)) {
            childFolderIds.add(f.id)
            added = true
          }
        }
      }
      const noteFolders = prev.noteFolders.map((f: any) =>
        childFolderIds.has(f.id)
          ? { ...f, deletedAt: now, deletedFromParentId: f.parentId, parentId: null }
          : f,
      )
      const notes = prev.notes.map((n: any) =>
        n.folderId && childFolderIds.has(n.folderId)
          ? { ...n, deletedAt: now, deletedFromFolderId: n.folderId, folderId: null }
          : n,
      )
      return { ...prev, noteFolders, notes }
    })
  }

  const restoreNote = (noteId: string) => {
    updateStore(prev => {
      const target = prev.notes.find((n: any) => n.id === noteId)
      if (!target?.deletedAt) return prev
      return {
        ...prev,
        notes: prev.notes.map((n: any) =>
          n.id === noteId
            ? { ...n, deletedAt: undefined, folderId: n.deletedFromFolderId ?? null, deletedFromFolderId: undefined }
            : n,
        ),
      }
    })
  }

  const restoreNoteFolder = (folderId: string) => {
    updateStore(prev => {
      const target = prev.noteFolders.find((f: any) => f.id === folderId)
      if (!target?.deletedAt) return prev
      return {
        ...prev,
        noteFolders: prev.noteFolders.map((f: any) =>
          f.id === folderId
            ? { ...f, deletedAt: undefined, parentId: f.deletedFromParentId ?? null, deletedFromParentId: undefined }
            : f,
        ),
      }
    })
  }

  const permanentDeleteNote = (noteId: string) => {
    updateStore(prev => ({
      ...prev,
      notes: prev.notes.filter((n: any) => n.id !== noteId),
      pendingDeletes: [...(prev.pendingDeletes ?? []), { resource: 'notes', id: noteId }],
    }))
  }

  const permanentDeleteNoteFolder = (folderId: string) => {
    updateStore(prev => {
      const childFolderIds = new Set<string>([folderId])
      let added = true
      while (added) {
        added = false
        for (const f of prev.noteFolders) {
          if (f.parentId && childFolderIds.has(f.parentId) && !childFolderIds.has(f.id)) {
            childFolderIds.add(f.id)
            added = true
          }
        }
      }
      const noteFolders = prev.noteFolders.filter((f: any) => !childFolderIds.has(f.id))
      const notes = prev.notes.filter((n: any) => !(n.folderId && childFolderIds.has(n.folderId)))
      const pendingDeletes = [
        ...(prev.pendingDeletes ?? []),
        ...Array.from(childFolderIds).map((id: any) => ({ resource: 'note_folders' as const, id })),
      ]
      return { ...prev, noteFolders, notes, pendingDeletes }
    })
  }

  const emptyNotesTrash = () => {
    updateStore(prev => {
      const deletedNoteIds = prev.notes.filter((n: any) => n.deletedAt).map((n: any) => n.id)
      const deletedFolderIds = prev.noteFolders.filter((f: any) => f.deletedAt).map((f: any) => f.id)
      return {
        ...prev,
        notes: prev.notes.filter((n: any) => !n.deletedAt),
        noteFolders: prev.noteFolders.filter((f: any) => !f.deletedAt),
        pendingDeletes: [
          ...(prev.pendingDeletes ?? []),
          ...deletedNoteIds.map((id: any) => ({ resource: 'notes' as const, id })),
          ...deletedFolderIds.map((id: any) => ({ resource: 'note_folders' as const, id })),
        ],
      }
    })
  }

  return {
    addNoteFolder,
    updateNoteFolder,
    removeNoteFolder,
    reorderNoteFolders,
    addNote,
    updateNote,
    removeNote,
    softDeleteNote,
    softDeleteNoteFolder,
    restoreNote,
    restoreNoteFolder,
    permanentDeleteNote,
    permanentDeleteNoteFolder,
    emptyNotesTrash,
  }
}
