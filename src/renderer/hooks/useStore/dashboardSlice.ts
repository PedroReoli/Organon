import { useCallback } from 'react'
import type { UpdateStoreFn } from './types'

export const createDashboardSlice = (updateStore: UpdateStoreFn) => {
  const updateDashboardLayout = useCallback((layout: any) => {
    updateStore(prev => ({
      ...prev,
      settings: { ...prev.settings, dashboardLayout: layout },
    }))
  }, [updateStore])

  const updateDashboardWidgets = useCallback((widgets: any[]) => {
    updateStore(prev => ({
      ...prev,
      settings: { ...prev.settings, dashboardWidgets: widgets },
    }))
  }, [updateStore])

  const saveDashboardTemplate = useCallback((name: string, layout: any, widgets: any[]) => {
    updateStore(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        dashboardTemplates: [
          ...(prev.settings.dashboardTemplates ?? []),
          { id: Date.now().toString(), name, layout, widgets },
        ],
      },
    }))
  }, [updateStore])

  const deleteDashboardTemplate = useCallback((templateId: string) => {
    updateStore(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        dashboardTemplates: (prev.settings.dashboardTemplates ?? []).filter(t => t.id !== templateId),
      },
    }))
  }, [updateStore])

  return {
    updateDashboardLayout,
    updateDashboardWidgets,
    saveDashboardTemplate,
    deleteDashboardTemplate,
  }
}
