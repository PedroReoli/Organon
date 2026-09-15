import type { QuickAccessItem } from '../../types'
import type { UpdateStoreFn } from './types'
import { generateId } from '../../utils'

export const createQuickAccessSlice = (updateStore: UpdateStoreFn, getStore: () => { quickAccess: QuickAccessItem[] }) => {
  const addQuickAccess = (view: string, label: string) => {
    const store = getStore()
    const existing = store.quickAccess.find(qa => qa.view === view)
    if (existing) return

    const maxOrder = store.quickAccess.length > 0
      ? Math.max(...store.quickAccess.map(qa => qa.order))
      : -1

    const newQuickAccess: QuickAccessItem = {
      id: generateId(),
      view,
      label,
      order: maxOrder + 1,
    }

    updateStore(prev => ({
      ...prev,
      quickAccess: [...prev.quickAccess, newQuickAccess],
    }))
  }

  const removeQuickAccess = (id: string) => {
    updateStore(prev => ({
      ...prev,
      quickAccess: prev.quickAccess.filter(qa => qa.id !== id),
    }))
  }

  const reorderQuickAccess = (orderedIds: string[]) => {
    updateStore(prev => ({
      ...prev,
      quickAccess: prev.quickAccess.map(qa => {
        const idx = orderedIds.indexOf(qa.id)
        if (idx === -1) return qa
        return { ...qa, order: idx }
      }),
    }))
  }

  return {
    addQuickAccess,
    removeQuickAccess,
    reorderQuickAccess,
  }
}
