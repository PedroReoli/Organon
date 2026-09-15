import { useCallback } from 'react'
import type { Settings } from '../../types'
import type { UpdateStoreFn } from './types'

export const createSettingsSlice = (updateStore: UpdateStoreFn) => {
  const updateSettings = useCallback((updates: Partial<Settings>) => {
    updateStore(prev => ({
      ...prev,
      settings: { ...prev.settings, ...updates },
    }))
  }, [updateStore])

  return {
    updateSettings,
  }
}
