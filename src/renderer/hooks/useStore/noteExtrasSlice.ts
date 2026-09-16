import type { UpdateStoreFn } from './types'

export const createNoteExtrasSlice = (updateStore: UpdateStoreFn, getStore: () => any) => {
  const toggleNoteFavorite = (noteId: string) => {
    const store = getStore()
    const note = store.notes.find((n: any) => n.id === noteId)
    if (note && !note.isLocked) {
      updateStore(prev => ({
        ...prev,
        notes: prev.notes.map((n: any) =>
          n.id === noteId ? { ...n, isFavorite: !n.isFavorite } : n
        ),
      }))
    }
  }

  const toggleNotePinned = (noteId: string) => {
    const store = getStore()
    const note = store.notes.find((n: any) => n.id === noteId)
    if (note && !note.isLocked) {
      updateStore(prev => ({
        ...prev,
        notes: prev.notes.map((n: any) =>
          n.id === noteId ? { ...n, isPinned: !n.isPinned } : n
        ),
      }))
    }
  }

  const toggleNoteLock = (noteId: string) => {
    updateStore(prev => ({
      ...prev,
      notes: prev.notes.map((n: any) =>
        n.id === noteId ? { ...n, isLocked: !n.isLocked } : n
      ),
    }))
  }

  const reorderNotes = (orderedIds: string[]) => {
    updateStore(prev => ({
      ...prev,
      notes: prev.notes.map((note: any) => {
        const idx = orderedIds.indexOf(note.id)
        if (idx === -1) return note
        return { ...note, order: idx }
      }),
    }))
  }

  const softDeleteNote = (noteId: string) => {
    updateStore(prev => ({
      ...prev,
      notes: prev.notes.map((n: any) =>
        n.id === noteId ? { ...n, deletedAt: new Date().toISOString() } : n
      ),
    }))
  }

  const softDeleteNoteFolder = (folderId: string) => {
    const now = new Date().toISOString()
    updateStore(prev => ({
      ...prev,
      noteFolders: prev.noteFolders.map((f: any) =>
        f.id === folderId ? { ...f, deletedAt: now } : f
      ),
      notes: prev.notes.map((n: any) =>
        n.folderId === folderId ? { ...n, deletedAt: now } : n
      ),
    }))
  }

  const restoreNote = (noteId: string) => {
    updateStore(prev => ({
      ...prev,
      notes: prev.notes.map((n: any) =>
        n.id === noteId ? { ...n, deletedAt: undefined } : n
      ),
    }))
  }

  const restoreNoteFolder = (folderId: string) => {
    updateStore(prev => ({
      ...prev,
      noteFolders: prev.noteFolders.map((f: any) =>
        f.id === folderId ? { ...f, deletedAt: undefined } : f
      ),
    }))
  }

  const purgeNote = (noteId: string) => {
    updateStore(prev => ({
      ...prev,
      notes: prev.notes.filter((n: any) => n.id !== noteId),
      pendingDeletes: [...(prev.pendingDeletes ?? []), { resource: 'notes', id: noteId }],
    }))
  }

  const purgeNoteFolder = (folderId: string) => {
    updateStore(prev => ({
      ...prev,
      noteFolders: prev.noteFolders.filter((f: any) => f.id !== folderId),
      pendingDeletes: [...(prev.pendingDeletes ?? []), { resource: 'note_folders', id: folderId }],
    }))
  }

  const purgeOldTrash = () => {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 30)
    const cutoffISO = cutoff.toISOString()
    updateStore(prev => {
      const expiredNoteIds = prev.notes
        .filter((n: any) => n.deletedAt && n.deletedAt < cutoffISO)
        .map((n: any) => n.id)
      const expiredFolderIds = prev.noteFolders
        .filter((f: any) => f.deletedAt && f.deletedAt < cutoffISO)
        .map((f: any) => f.id)
      return {
        ...prev,
        notes: prev.notes.filter((n: any) => !expiredNoteIds.includes(n.id)),
        noteFolders: prev.noteFolders.filter((f: any) => !expiredFolderIds.includes(f.id)),
        pendingDeletes: [
          ...(prev.pendingDeletes ?? []),
          ...expiredNoteIds.map((id: any) => ({ resource: 'notes', id })),
          ...expiredFolderIds.map((id: any) => ({ resource: 'note_folders', id })),
        ],
      }
    })
  }

  return {
    toggleNoteFavorite,
    toggleNotePinned,
    toggleNoteLock,
    reorderNotes,
    softDeleteNote,
    softDeleteNoteFolder,
    restoreNote,
    restoreNoteFolder,
    purgeNote,
    purgeNoteFolder,
    purgeOldTrash,
  }
}
