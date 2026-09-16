import type { CanvasFolder, CanvasVersionEntry } from '../../types'
import type { UpdateStoreFn } from './types'
import { generateId } from '../../utils'
import { CANVAS_VERSIONS_LIMIT } from '../../types'

export const createCanvasSlice = (updateStore: UpdateStoreFn) => {
  const addCanvasFolder = (name: string, parentId: string | null = null) => {
    if (!name.trim()) return ''
    const id = generateId()
    const folder: CanvasFolder = {
      id,
      name: name.trim(),
      parentId,
      order: 0,
      createdAt: new Date().toISOString(),
    }
    updateStore(prev => {
      const folders = prev.canvasFolders ?? []
      return { ...prev, canvasFolders: [...folders, { ...folder, order: folders.length }] }
    })
    return id
  }

  const renameCanvasFolder = (folderId: string, name: string) => {
    if (!name.trim()) return
    updateStore(prev => ({
      ...prev,
      canvasFolders: (prev.canvasFolders ?? []).map((f: any) =>
        f.id === folderId ? { ...f, name: name.trim() } : f,
      ),
    }))
  }

  const removeCanvasFolder = (folderId: string) => {
    updateStore(prev => {
      const assignments = { ...(prev.canvasFolderAssignments ?? {}) }
      for (const key of Object.keys(assignments)) {
        if (assignments[key] === folderId) assignments[key] = null
      }
      return {
        ...prev,
        canvasFolders: (prev.canvasFolders ?? []).filter((f: any) => f.id !== folderId),
        canvasFolderAssignments: assignments,
      }
    })
  }

  const moveCanvasToFolder = (canvasId: string, folderId: string | null) => {
    updateStore(prev => ({
      ...prev,
      canvasFolderAssignments: { ...(prev.canvasFolderAssignments ?? {}), [canvasId]: folderId },
    }))
  }

  const snapshotCanvasVersion = (canvasId: string, snapshot: Record<string, unknown>, thumbnail?: string) => {
    updateStore(prev => {
      const allVersions = { ...(prev.canvasVersions ?? {}) }
      const existing = allVersions[canvasId] ?? []
      const entry: CanvasVersionEntry = {
        id: generateId(),
        createdAt: new Date().toISOString(),
        snapshot,
        thumbnail,
      }
      const next = [entry, ...existing].slice(0, CANVAS_VERSIONS_LIMIT)
      allVersions[canvasId] = next
      return { ...prev, canvasVersions: allVersions }
    })
  }

  const restoreCanvasVersion = (canvasId: string, versionId: string) => {
    updateStore(prev => {
      const allVersions = { ...(prev.canvasVersions ?? {}) }
      const versions = allVersions[canvasId] ?? []
      const version = versions.find((v: any) => v.id === versionId)
      if (!version) return prev
      return { ...prev, canvasVersions: allVersions }
    })
    return updateStore
  }

  const deleteCanvasVersion = (canvasId: string, versionId: string) => {
    updateStore(prev => {
      const allVersions = { ...(prev.canvasVersions ?? {}) }
      const versions = allVersions[canvasId] ?? []
      allVersions[canvasId] = versions.filter((v: any) => v.id !== versionId)
      return { ...prev, canvasVersions: allVersions }
    })
  }

  return {
    addCanvasFolder,
    renameCanvasFolder,
    removeCanvasFolder,
    moveCanvasToFolder,
    snapshotCanvasVersion,
    restoreCanvasVersion,
    deleteCanvasVersion,
  }
}
