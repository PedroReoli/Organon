import type { SprintCard } from '../../types'
import type { UpdateStoreFn } from './types'
import { generateId } from '../../utils'

export const createSprintCardsSlice = (updateStore: UpdateStoreFn) => {
  const addSprintCard = (title: string, columnId: string | null = null, explicitSprintId?: string | null): string | null => {
    if (!title.trim()) return null
    const now = new Date().toISOString()
    const id = generateId()
    
    updateStore(prev => {
      const activeSprintId = explicitSprintId !== undefined ? explicitSprintId : (prev.sprintBoardConfig?.activeSprintId ?? null)
      const card: SprintCard = {
        id,
        title: title.trim(),
        description: '',
        priority: null,
        status: 'todo',
        checklist: [],
        columnId,
        sectionId: null,
        sprintId: activeSprintId,
        order: Date.now(),
        createdAt: now,
        updatedAt: now,
      }
      return {
        ...prev,
        sprintCards: [...(prev.sprintCards ?? []), card],
      }
    })
    return id
  }

  const editSprintCard = (cardId: string, updates: Partial<Omit<SprintCard, 'id' | 'createdAt'>>) => {
    updateStore(prev => ({
      ...prev,
      sprintCards: (prev.sprintCards ?? []).map(c =>
        c.id === cardId ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
      ),
    }))
  }

  const removeSprintCard = (cardId: string) => {
    updateStore(prev => ({
      ...prev,
      sprintCards: (prev.sprintCards ?? []).filter(c => c.id !== cardId),
      pendingDeletes: [...(prev.pendingDeletes ?? []), { resource: 'sprint_cards', id: cardId }],
    }))
  }

  const moveSprintCard = (cardId: string, columnId: string | null, sectionId: string | null = null) => {
    updateStore(prev => ({
      ...prev,
      sprintCards: (prev.sprintCards ?? []).map(c =>
        c.id === cardId ? { ...c, columnId, sectionId, updatedAt: new Date().toISOString() } : c
      ),
    }))
  }

  return {
    addSprintCard,
    editSprintCard,
    removeSprintCard,
    moveSprintCard,
  }
}
