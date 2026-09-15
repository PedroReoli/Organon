import { useCallback } from 'react'
import type { RegisteredIDE } from '../../types'
import { createRegisteredIDE } from '../../utils'
import type { UpdateStoreFn } from './types'

export const createProjectsSlice = (updateStore: UpdateStoreFn) => {
  const addProject = useCallback((_input: unknown) => undefined, [])
  const updateProject = useCallback((_id: string, _updates: unknown) => {}, [])
  const removeProject = useCallback((_id: string) => {}, [])
  const toggleProjectArchived = useCallback((_id: string) => {}, [])
  const reorderProjects = useCallback((_ids: string[]) => {}, [])

  const addRegisteredIDE = useCallback((input: { name: string; exePath: string; iconDataUrl?: string | null; args?: string }) => {
    if (!input.name.trim() || !input.exePath.trim()) return
    const newIDE = createRegisteredIDE(input)
    updateStore(prev => ({
      ...prev,
      registeredIDEs: [...prev.registeredIDEs, newIDE],
    }))
    return newIDE.id
  }, [updateStore])

  const updateRegisteredIDE = useCallback((ideId: string, updates: Partial<Pick<RegisteredIDE, 'name' | 'exePath' | 'iconDataUrl' | 'args'>>) => {
    updateStore(prev => ({
      ...prev,
      registeredIDEs: prev.registeredIDEs.map(ide =>
        ide.id !== ideId ? ide : { ...ide, ...updates }
      ),
    }))
  }, [updateStore])

  const removeRegisteredIDE = useCallback((ideId: string) => {
    updateStore(prev => ({
      ...prev,
      registeredIDEs: prev.registeredIDEs.filter(ide => ide.id !== ideId),
    }))
  }, [updateStore])

  return {
    addProject,
    updateProject,
    removeProject,
    toggleProjectArchived,
    reorderProjects,
    addRegisteredIDE,
    updateRegisteredIDE,
    removeRegisteredIDE,
  }
}
