import { useCallback } from 'react'
import type { UpdateStoreFn } from './types'

export const createMiscSlice = (updateStore: UpdateStoreFn) => {
  // Quick Access
  const addQuickAccess = useCallback((item: any) => {
    updateStore(prev => ({
      ...prev,
      quickAccess: [...prev.quickAccess, item],
    }))
  }, [updateStore])

  const removeQuickAccess = useCallback((itemId: string) => {
    updateStore(prev => ({
      ...prev,
      quickAccess: prev.quickAccess.filter((i: any) => i.id !== itemId),
    }))
  }, [updateStore])

  const reorderQuickAccess = useCallback((orderedIds: string[]) => {
    updateStore(prev => ({
      ...prev,
      quickAccess: orderedIds.map((id, idx) => {
        const item = prev.quickAccess.find((i: any) => i.id === id)
        return item ? { ...item, order: idx } : null
      }).filter(Boolean) as any[],
    }))
  }, [updateStore])

  // Reset
  const resetStore = useCallback(() => {
    updateStore(() => ({} as any))
  }, [updateStore])

  const clearUserData = useCallback(() => {
    updateStore(prev => ({
      ...prev,
      cards: [],
      notes: [],
      projects: [],
      habits: [],
      bills: [],
      expenses: [],
    }))
  }, [updateStore])

  return {
    addQuickAccess,
    removeQuickAccess,
    reorderQuickAccess,
    resetStore,
    clearUserData,
  }
}
