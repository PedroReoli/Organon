import { getDb } from '../schema'
import type { Note, NoteFolder } from '../../types'

export function getAllNotes(): Note[] {
  return getDb().getAllSync<Note & { folder_id: string | null; project_id: string | null; ord: number; created_at: string; updated_at: string }>(
    'SELECT * FROM notes ORDER BY ord ASC'
  ).map(r => ({
    id: r.id, title: r.title, content: r.content,
    folderId: r.folder_id, projectId: r.project_id,
    order: r.ord, createdAt: r.created_at, updatedAt: r.updated_at,
  }))
}

export function getAllNoteFolders(): NoteFolder[] {
  return getDb().getAllSync<{ id: string; name: string; parent_id: string | null; ord: number }>(
    'SELECT * FROM note_folders ORDER BY ord ASC'
  ).map(r => ({ id: r.id, name: r.name, parentId: r.parent_id, order: r.ord }))
}

export function upsertNote(note: Note): void {
  getDb().runSync(
    `INSERT OR REPLACE INTO notes (id, title, content, folder_id, project_id, ord, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [note.id, note.title, note.content, note.folderId, note.projectId, note.order, note.createdAt, note.updatedAt]
  )
}

export function deleteNote(id: string): void {
  getDb().runSync('DELETE FROM notes WHERE id = ?', [id])
}

export function upsertNoteFolder(folder: NoteFolder): void {
  getDb().runSync(
    `INSERT OR REPLACE INTO note_folders (id, name, parent_id, ord) VALUES (?, ?, ?, ?)`,
    [folder.id, folder.name, folder.parentId, folder.order]
  )
}

export function deleteNoteFolder(id: string): void {
  getDb().runSync('DELETE FROM note_folders WHERE id = ?', [id])
  getDb().runSync('UPDATE notes SET folder_id = NULL WHERE folder_id = ?', [id])
}
