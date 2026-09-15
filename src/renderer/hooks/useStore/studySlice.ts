import { useCallback } from 'react'
import type { StudyState } from '../../types'
import type { UpdateStoreFn } from './types'

export const createStudySlice = (updateStore: UpdateStoreFn) => {
  const updateStudy = useCallback((updater: (prev: StudyState) => StudyState) => {
    updateStore(prev => ({
      ...prev,
      study: updater(prev.study),
    }))
  }, [updateStore])

  return {
    updateStudy,
  }
}
