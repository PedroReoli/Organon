import type { SprintColumn, SprintColumnGroup, SprintColumnSection, SprintSwimLane, SprintBoardConfig, SprintMetadata, Store } from '../../types'
import type { UpdateStoreFn } from './types'
import { generateId } from '../../utils'
import { DEFAULT_SPRINT_BOARD_CONFIG, DEFAULT_SPRINT_COLUMNS } from '../../types'

export const createSprintSlice = (updateStore: UpdateStoreFn) => {
  const ensureSprintColumns = (prev: Store): SprintColumn[] =>
    prev.sprintColumns ?? DEFAULT_SPRINT_COLUMNS

  const addSprintColumn = (name: string, color = '#64748b') => {
    if (!name.trim()) return
    updateStore(prev => {
      const cols = ensureSprintColumns(prev)
      const newCol: SprintColumn = {
        id: generateId(),
        name: name.trim(),
        color,
        order: cols.length,
      }
      return { ...prev, sprintColumns: [...cols, newCol] }
    })
  }

  const updateSprintColumn = (columnId: string, updates: Partial<Pick<SprintColumn, 'name' | 'color' | 'groupId' | 'autoStatus'>>) => {
    updateStore(prev => ({
      ...prev,
      sprintColumns: ensureSprintColumns(prev).map(c =>
        c.id === columnId ? { ...c, ...updates } : c
      ),
    }))
  }

  const removeSprintColumn = (columnId: string) => {
    updateStore(prev => ({
      ...prev,
      sprintColumns: ensureSprintColumns(prev).filter(c => c.id !== columnId),
      sprintColumnSections: (prev.sprintColumnSections ?? []).filter(s => s.columnId !== columnId),
      cards: prev.cards.map(c =>
        c.sprintColumnId === columnId ? { ...c, sprintColumnId: null } : c
      ),
    }))
  }

  const reorderSprintColumns = (orderedIds: string[]) => {
    updateStore(prev => {
      const cols = ensureSprintColumns(prev)
      const map = new Map(cols.map(c => [c.id, c]))
      const reordered = orderedIds
        .map((id, idx) => {
          const col = map.get(id)
          return col ? { ...col, order: idx } : null
        })
        .filter((c): c is SprintColumn => c !== null)
      return { ...prev, sprintColumns: reordered }
    })
  }

  const addSprintColumnGroup = (name: string, color = 'var(--color-primary)') => {
    if (!name.trim()) return
    updateStore(prev => {
      const groups = prev.sprintColumnGroups ?? []
      const newGroup: SprintColumnGroup = {
        id: generateId(),
        name: name.trim(),
        color,
        order: groups.length,
      }
      return { ...prev, sprintColumnGroups: [...groups, newGroup] }
    })
  }

  const updateSprintColumnGroup = (groupId: string, updates: Partial<Pick<SprintColumnGroup, 'name' | 'color'>>) => {
    updateStore(prev => ({
      ...prev,
      sprintColumnGroups: (prev.sprintColumnGroups ?? []).map(g =>
        g.id === groupId ? { ...g, ...updates } : g
      ),
    }))
  }

  const removeSprintColumnGroup = (groupId: string) => {
    updateStore(prev => ({
      ...prev,
      sprintColumnGroups: (prev.sprintColumnGroups ?? []).filter(g => g.id !== groupId),
      sprintColumns: ensureSprintColumns(prev).map(c =>
        c.groupId === groupId ? { ...c, groupId: null } : c
      ),
    }))
  }

  const addSprintColumnSection = (columnId: string, name: string) => {
    if (!name.trim()) return
    updateStore(prev => {
      const sections = prev.sprintColumnSections ?? []
      const sameColumn = sections.filter(s => s.columnId === columnId)
      const newSection: SprintColumnSection = {
        id: generateId(),
        columnId,
        name: name.trim(),
        order: sameColumn.length,
      }
      return { ...prev, sprintColumnSections: [...sections, newSection] }
    })
  }

  const updateSprintColumnSection = (sectionId: string, updates: Partial<Pick<SprintColumnSection, 'name'>>) => {
    updateStore(prev => ({
      ...prev,
      sprintColumnSections: (prev.sprintColumnSections ?? []).map(s =>
        s.id === sectionId ? { ...s, ...updates } : s
      ),
    }))
  }

  const removeSprintColumnSection = (sectionId: string) => {
    updateStore(prev => ({
      ...prev,
      sprintColumnSections: (prev.sprintColumnSections ?? []).filter(s => s.id !== sectionId),
      pendingDeletes: [...(prev.pendingDeletes ?? []), { resource: 'sprint_column_sections', id: sectionId }],
    }))
  }

  const addSprintSwimLane = (name: string, color = '#a855f7') => {
    if (!name.trim()) return
    updateStore(prev => {
      const lanes = prev.sprintSwimLanes ?? []
      const newLane: SprintSwimLane = {
        id: generateId(),
        name: name.trim(),
        color,
        order: lanes.length,
      }
      return { ...prev, sprintSwimLanes: [...lanes, newLane] }
    })
  }

  const updateSprintSwimLane = (laneId: string, updates: Partial<Pick<SprintSwimLane, 'name' | 'color'>>) => {
    updateStore(prev => ({
      ...prev,
      sprintSwimLanes: (prev.sprintSwimLanes ?? []).map(l =>
        l.id === laneId ? { ...l, ...updates } : l
      ),
    }))
  }

  const removeSprintSwimLane = (laneId: string) => {
    updateStore(prev => ({
      ...prev,
      sprintSwimLanes: (prev.sprintSwimLanes ?? []).filter(l => l.id !== laneId),
      cards: prev.cards.map(c =>
        c.swimLaneId === laneId ? { ...c, swimLaneId: null } : c
      ),
    }))
  }

  const updateSprintBoardConfig = (updates: Partial<SprintBoardConfig>) => {
    updateStore(prev => ({
      ...prev,
      sprintBoardConfig: {
        ...DEFAULT_SPRINT_BOARD_CONFIG,
        ...(prev.sprintBoardConfig ?? {}),
        ...updates,
      },
    }))
  }

  const upsertSprintMetadata = (metadata: SprintMetadata) => {
    updateStore(prev => {
      const existing = prev.sprintMetadata ?? []
      const idx = existing.findIndex(m => m.id === metadata.id)
      if (idx === -1) {
        return { ...prev, sprintMetadata: [...existing, metadata] }
      }
      const next = [...existing]
      next[idx] = { ...next[idx], ...metadata }
      return { ...prev, sprintMetadata: next }
    })
  }

  const removeSprintMetadata = (sprintId: string) => {
    updateStore(prev => {
      const existing = prev.sprintMetadata ?? []
      // Se estamos removendo a sprint ativa, limpamos o activeSprintId
      const isRemovingActive = prev.sprintBoardConfig?.activeSprintId === sprintId
      const newConfig = isRemovingActive 
        ? { ...prev.sprintBoardConfig, activeSprintId: null } as SprintBoardConfig
        : prev.sprintBoardConfig
      
      return { 
        ...prev, 
        sprintMetadata: existing.filter(m => m.id !== sprintId),
        sprintCards: (prev.sprintCards ?? []).filter(c => c.sprintId !== sprintId),
        sprintBoardConfig: newConfig
      }
    })
  }

  const setActiveSprint = (sprintId: string | null) => {
    updateStore(prev => ({
      ...prev,
      sprintBoardConfig: {
        ...DEFAULT_SPRINT_BOARD_CONFIG,
        ...(prev.sprintBoardConfig ?? {}),
        activeSprintId: sprintId,
      },
    }))
  }

  const setCardSprint = (cardId: string, inSprint: boolean) => {
    updateStore(prev => ({
      ...prev,
      cards: prev.cards.map(c =>
        c.id === cardId ? { ...c, inSprint } : c
      ),
    }))
  }

  const setCardSprintColumn = (cardId: string, columnId: string | null) => {
    updateStore(prev => ({
      ...prev,
      cards: prev.cards.map(c =>
        c.id === cardId ? { ...c, sprintColumnId: columnId, inSprint: columnId !== null ? true : c.inSprint } : c
      ),
    }))
  }

  const setCardSprintSection = (cardId: string, sectionId: string | null) => {
    updateStore(prev => ({
      ...prev,
      cards: prev.cards.map(c =>
        c.id === cardId ? { ...c, sprintSectionId: sectionId } : c
      ),
    }))
  }

  const setCardSwimLane = (cardId: string, laneId: string | null) => {
    updateStore(prev => ({
      ...prev,
      cards: prev.cards.map(c =>
        c.id === cardId ? { ...c, swimLaneId: laneId } : c
      ),
    }))
  }

  return {
    addSprintColumn,
    updateSprintColumn,
    removeSprintColumn,
    reorderSprintColumns,
    addSprintColumnGroup,
    updateSprintColumnGroup,
    removeSprintColumnGroup,
    addSprintColumnSection,
    updateSprintColumnSection,
    removeSprintColumnSection,
    addSprintSwimLane,
    updateSprintSwimLane,
    removeSprintSwimLane,
    updateSprintBoardConfig,
    upsertSprintMetadata,
    removeSprintMetadata,
    setActiveSprint,
    setCardSprint,
    setCardSprintColumn,
    setCardSprintSection,
    setCardSwimLane,
  }
}
