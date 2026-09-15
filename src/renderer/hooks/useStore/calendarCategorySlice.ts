import type { AgendaCategory } from '../../types'
import type { UpdateStoreFn } from './types'
import { generateId } from '../../utils'

export const createCalendarCategorySlice = (updateStore: UpdateStoreFn) => {
  const addCalendarCategory = (name: string, color: string): string | null => {
    if (!name.trim()) return null
    const id = generateId()
    updateStore(prev => ({
      ...prev,
      calendarCategories: [...(prev.calendarCategories ?? []), { id, name: name.trim(), color }],
    }))
    return id
  }

  const updateCalendarCategory = (catId: string, updates: Partial<Omit<AgendaCategory, 'id'>>) => {
    updateStore(prev => ({
      ...prev,
      calendarCategories: (prev.calendarCategories ?? []).map(c =>
        c.id === catId ? { ...c, ...updates } : c
      ),
    }))
  }

  const removeCalendarCategory = (catId: string) => {
    updateStore(prev => ({
      ...prev,
      calendarCategories: (prev.calendarCategories ?? []).filter(c => c.id !== catId),
      calendarEvents: prev.calendarEvents.map(e =>
        e.categoryId === catId ? { ...e, categoryId: null } : e
      ),
    }))
  }

  return {
    addCalendarCategory,
    updateCalendarCategory,
    removeCalendarCategory,
  }
}
