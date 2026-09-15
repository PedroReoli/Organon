import type { NoteTemplate, NoteBookmark } from '../../types'
import type { UpdateStoreFn } from './types'
import { generateId } from '../../utils'

export const createNoteTemplatesSlice = (updateStore: UpdateStoreFn) => {
  const addNoteTemplate = (input: Omit<NoteTemplate, 'id' | 'order' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString()
    const id = generateId()
    updateStore(prev => {
      const existing = prev.noteTemplates ?? []
      const template: NoteTemplate = {
        ...input,
        id,
        order: existing.length,
        createdAt: now,
        updatedAt: now,
      }
      return { ...prev, noteTemplates: [...existing, template] }
    })
    return id
  }

  const updateNoteTemplate = (templateId: string, updates: Partial<Pick<NoteTemplate, 'name' | 'description' | 'category' | 'icon' | 'content' | 'variables' | 'isDefaultDaily'>>) => {
    const now = new Date().toISOString()
    updateStore(prev => ({
      ...prev,
      noteTemplates: (prev.noteTemplates ?? []).map(t =>
        t.id === templateId ? { ...t, ...updates, updatedAt: now } : t,
      ),
    }))
  }

  const removeNoteTemplate = (templateId: string) => {
    updateStore(prev => ({
      ...prev,
      noteTemplates: (prev.noteTemplates ?? []).filter(t => t.id !== templateId),
    }))
  }

  const setNoteBookmarks = (noteId: string, bookmarks: NoteBookmark[]) => {
    updateStore(prev => ({
      ...prev,
      notes: prev.notes.map(n => (n.id === noteId ? { ...n, bookmarks } : n)),
    }))
  }

  return {
    addNoteTemplate,
    updateNoteTemplate,
    removeNoteTemplate,
    setNoteBookmarks,
  }
}
