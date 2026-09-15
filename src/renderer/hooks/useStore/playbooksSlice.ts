import type { Playbook, PlaybookDialog, PlaybookFolder, PlaybookVersion } from '../../types'
import type { UpdateStoreFn } from './types'
import { generateId } from '../../utils'
import { PLAYBOOK_VERSIONS_LIMIT } from '../../types'

export const createPlaybooksSlice = (updateStore: UpdateStoreFn) => {
  const snapshotPlaybookVersion = (playbookId: string) => {
    const now = new Date().toISOString()
    updateStore(prev => ({
      ...prev,
      playbooks: prev.playbooks.map(pb => {
        if (pb.id !== playbookId) return pb
        const snapshot: PlaybookVersion = {
          id: generateId(),
          createdAt: now,
          content: pb.content,
          dialogs: pb.dialogs.map(d => ({ ...d })),
        }
        const prevVersions = Array.isArray(pb.versions) ? pb.versions : []
        const nextVersions = [snapshot, ...prevVersions].slice(0, PLAYBOOK_VERSIONS_LIMIT)
        return { ...pb, versions: nextVersions }
      }),
    }))
  }

  const restorePlaybookVersion = (playbookId: string, versionId: string) => {
    const now = new Date().toISOString()
    updateStore(prev => ({
      ...prev,
      playbooks: prev.playbooks.map(pb => {
        if (pb.id !== playbookId) return pb
        const version = (pb.versions ?? []).find(v => v.id === versionId)
        if (!version) return pb
        const currentSnapshot: PlaybookVersion = {
          id: generateId(),
          createdAt: now,
          content: pb.content,
          dialogs: pb.dialogs.map(d => ({ ...d })),
        }
        const nextVersions = [
          currentSnapshot,
          ...(pb.versions ?? []).filter(v => v.id !== versionId),
        ].slice(0, PLAYBOOK_VERSIONS_LIMIT)
        return {
          ...pb,
          content: version.content,
          dialogs: version.dialogs.map(d => ({ ...d })),
          versions: nextVersions,
          updatedAt: now,
        }
      }),
    }))
  }

  const addPlaybook = (input: Omit<Playbook, 'id' | 'order' | 'createdAt' | 'updatedAt' | 'dialogs' | 'isFavorite' | 'isArchived' | 'folderId' | 'viewCount' | 'versions'>) => {
    const now = new Date().toISOString()
    const id = generateId()
    const newPlaybook: Playbook = {
      ...input,
      id,
      dialogs: [],
      order: Date.now(),
      createdAt: now,
      updatedAt: now,
      isFavorite: false,
      isArchived: false,
      folderId: null,
      viewCount: 0,
      versions: [],
    }
    updateStore(prev => ({
      ...prev,
      playbooks: [...prev.playbooks, newPlaybook],
    }))
    return id
  }

  const updatePlaybook = (playbookId: string, updates: Partial<Pick<Playbook, 'title' | 'sector' | 'category' | 'summary' | 'content' | 'isFavorite' | 'isArchived' | 'folderId'>>) => {
    const now = new Date().toISOString()
    updateStore(prev => ({
      ...prev,
      playbooks: prev.playbooks.map(pb =>
        pb.id === playbookId ? { ...pb, ...updates, updatedAt: now } : pb
      ),
    }))
  }

  const removePlaybook = (playbookId: string) => {
    updateStore(prev => ({
      ...prev,
      playbooks: prev.playbooks.filter(pb => pb.id !== playbookId),
      pendingDeletes: [...(prev.pendingDeletes ?? []), { resource: 'playbooks', id: playbookId }],
    }))
  }

  const reorderPlaybooks = (orderedIds: string[]) => {
    updateStore(prev => ({
      ...prev,
      playbooks: prev.playbooks.map(pb => {
        const idx = orderedIds.indexOf(pb.id)
        if (idx === -1) return pb
        return { ...pb, order: idx }
      }),
    }))
  }

  const incrementPlaybookViewCount = (playbookId: string) => {
    updateStore(prev => ({
      ...prev,
      playbooks: prev.playbooks.map(pb =>
        pb.id === playbookId ? { ...pb, viewCount: (pb.viewCount ?? 0) + 1 } : pb
      ),
    }))
  }

  const addPlaybookDialog = (playbookId: string, input: Omit<PlaybookDialog, 'id' | 'order' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString()
    const id = generateId()
    updateStore(prev => ({
      ...prev,
      playbooks: prev.playbooks.map(pb => {
        if (pb.id !== playbookId) return pb
        const newDialog: PlaybookDialog = {
          ...input,
          id,
          order: pb.dialogs.length,
          createdAt: now,
          updatedAt: now,
        }
        return { ...pb, dialogs: [...pb.dialogs, newDialog], updatedAt: now }
      }),
    }))
    return id
  }

  const updatePlaybookDialog = (playbookId: string, dialogId: string, updates: Partial<Pick<PlaybookDialog, 'title' | 'text' | 'variables' | 'tags'>>) => {
    const now = new Date().toISOString()
    updateStore(prev => ({
      ...prev,
      playbooks: prev.playbooks.map(pb => {
        if (pb.id !== playbookId) return pb
        return {
          ...pb,
          dialogs: pb.dialogs.map(d =>
            d.id === dialogId ? { ...d, ...updates, updatedAt: now } : d
          ),
          updatedAt: now,
        }
      }),
    }))
  }

  const removePlaybookDialog = (playbookId: string, dialogId: string) => {
    const now = new Date().toISOString()
    updateStore(prev => ({
      ...prev,
      playbooks: prev.playbooks.map(pb => {
        if (pb.id !== playbookId) return pb
        return {
          ...pb,
          dialogs: pb.dialogs.filter(d => d.id !== dialogId),
          updatedAt: now,
        }
      }),
    }))
  }

  const reorderPlaybookDialogs = (playbookId: string, orderedIds: string[]) => {
    const now = new Date().toISOString()
    updateStore(prev => ({
      ...prev,
      playbooks: prev.playbooks.map(pb => {
        if (pb.id !== playbookId) return pb
        return {
          ...pb,
          dialogs: pb.dialogs.map(d => {
            const idx = orderedIds.indexOf(d.id)
            if (idx === -1) return d
            return { ...d, order: idx }
          }),
          updatedAt: now,
        }
      }),
    }))
  }

  const duplicatePlaybookDialog = (playbookId: string, dialogId: string) => {
    const now = new Date().toISOString()
    const newId = generateId()
    updateStore(prev => ({
      ...prev,
      playbooks: prev.playbooks.map(pb => {
        if (pb.id !== playbookId) return pb
        const source = pb.dialogs.find(d => d.id === dialogId)
        if (!source) return pb
        const copy: PlaybookDialog = {
          ...source,
          id: newId,
          title: `${source.title} (copia)`,
          order: pb.dialogs.length,
          createdAt: now,
          updatedAt: now,
          copyCount: 0,
          copyCountByMonth: {},
        }
        return { ...pb, dialogs: [...pb.dialogs, copy], updatedAt: now }
      }),
    }))
    return newId
  }

  const incrementDialogCopyCount = (playbookId: string, dialogId: string) => {
    const now = new Date().toISOString()
    const monthKey = now.slice(0, 7)
    updateStore(prev => ({
      ...prev,
      playbooks: prev.playbooks.map(pb => {
        if (pb.id !== playbookId) return pb
        return {
          ...pb,
          dialogs: pb.dialogs.map(d => {
            if (d.id !== dialogId) return d
            const copyCountByMonth = d.copyCountByMonth ?? {}
            return {
              ...d,
              copyCount: (d.copyCount ?? 0) + 1,
              copyCountByMonth: {
                ...copyCountByMonth,
                [monthKey]: (copyCountByMonth[monthKey] ?? 0) + 1,
              },
            }
          }),
        }
      }),
    }))
  }

  const addPlaybookFolder = (name: string, color = '#6b7280') => {
    const now = new Date().toISOString()
    const id = generateId()
    updateStore(prev => {
      const folders = prev.playbookFolders ?? []
      const newFolder: PlaybookFolder = {
        id,
        name: name.trim(),
        color,
        order: folders.length,
        createdAt: now,
      }
      return { ...prev, playbookFolders: [...folders, newFolder] }
    })
    return id
  }

  const updatePlaybookFolder = (folderId: string, updates: Partial<Pick<PlaybookFolder, 'name' | 'color'>>) => {
    updateStore(prev => ({
      ...prev,
      playbookFolders: (prev.playbookFolders ?? []).map(f =>
        f.id === folderId ? { ...f, ...updates } : f
      ),
    }))
  }

  const removePlaybookFolder = (folderId: string) => {
    updateStore(prev => ({
      ...prev,
      playbookFolders: (prev.playbookFolders ?? []).filter(f => f.id !== folderId),
      playbooks: prev.playbooks.map(pb =>
        pb.folderId === folderId ? { ...pb, folderId: null } : pb
      ),
    }))
  }

  const reorderPlaybookFolders = (orderedIds: string[]) => {
    updateStore(prev => ({
      ...prev,
      playbookFolders: (prev.playbookFolders ?? []).map(f => {
        const idx = orderedIds.indexOf(f.id)
        if (idx === -1) return f
        return { ...f, order: idx }
      }),
    }))
  }

  return {
    snapshotPlaybookVersion,
    restorePlaybookVersion,
    addPlaybook,
    updatePlaybook,
    removePlaybook,
    reorderPlaybooks,
    incrementPlaybookViewCount,
    addPlaybookDialog,
    updatePlaybookDialog,
    removePlaybookDialog,
    reorderPlaybookDialogs,
    duplicatePlaybookDialog,
    incrementDialogCopyCount,
    addPlaybookFolder,
    updatePlaybookFolder,
    removePlaybookFolder,
    reorderPlaybookFolders,
  }
}
