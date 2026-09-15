/**
 * useNotesDragDrop — slice de drag-and-drop da tree (Upgrade 10a refator).
 *
 * Mantem dragPayloadRef + dropTargetId + dragCount + handlers de drop em
 * pasta, nota e raiz. Helpers de cycle detection (isFolderDescendant,
 * isNoteDescendant, isNoteInsideAnyFolder) e buildDragPayload.
 */

import React, { useCallback, useRef, useState } from 'react'
import type { Note, NoteFolder } from '../../../../types'
import type { TreeItemKey, TreeItemKind } from '@types'
import { folderTreeKey, noteTreeKey, parseTreeKey } from '../../utils'

interface UseNotesDragDropParams {
  noteMap: Map<string, Note>
  folderMap: Map<string, NoteFolder>
  selectedTreeItems: Set<TreeItemKey>
  setSelectedTreeItems: React.Dispatch<React.SetStateAction<Set<TreeItemKey>>>
  setSelectionAnchor: React.Dispatch<React.SetStateAction<TreeItemKey | null>>
  setExpandedFolders: React.Dispatch<React.SetStateAction<Set<string>>>
  setExpandedNotes: React.Dispatch<React.SetStateAction<Set<string>>>
  onUpdateNote: (
    noteId: string,
    updates: Partial<Pick<Note, 'title' | 'folderId' | 'order' | 'isPinned' | 'isFavorite' | 'parentNoteId'>>,
  ) => void
  onUpdateFolder: (folderId: string, updates: Partial<Pick<NoteFolder, 'name' | 'parentId' | 'isHome'>>) => void
}

export function useNotesDragDrop({
  noteMap,
  folderMap,
  selectedTreeItems,
  setSelectedTreeItems,
  setSelectionAnchor,
  setExpandedFolders,
  setExpandedNotes,
  onUpdateNote,
  onUpdateFolder,
}: UseNotesDragDropParams) {
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)
  const [dragCount, setDragCount] = useState(0)
  const dragPayloadRef = useRef<{ noteIds: string[]; folderIds: string[] }>({
    noteIds: [],
    folderIds: [],
  })

  const isFolderDescendant = useCallback(
    (candidateId: string, ancestorId: string) => {
      let cur = folderMap.get(candidateId)?.parentId ?? null
      while (cur) {
        if (cur === ancestorId) return true
        cur = folderMap.get(cur)?.parentId ?? null
      }
      return false
    },
    [folderMap],
  )

  const isNoteDescendant = useCallback(
    (candidateId: string, ancestorId: string) => {
      let cur = noteMap.get(candidateId)?.parentNoteId ?? null
      while (cur) {
        if (cur === ancestorId) return true
        cur = noteMap.get(cur)?.parentNoteId ?? null
      }
      return false
    },
    [noteMap],
  )

  const isNoteInsideAnyFolder = useCallback(
    (noteId: string, folderIds: Set<string>) => {
      let cur = noteMap.get(noteId)?.folderId ?? null
      while (cur) {
        if (folderIds.has(cur)) return true
        cur = folderMap.get(cur)?.parentId ?? null
      }
      return false
    },
    [folderMap, noteMap],
  )

  const updateDescendantFolders = useCallback(
    (rootNoteId: string, folderId: string | null) => {
      const pendingIds = [rootNoteId]
      const visitedIds = new Set(pendingIds)

      while (pendingIds.length > 0) {
        const parentNoteId = pendingIds.shift()
        noteMap.forEach((note) => {
          if (note.parentNoteId !== parentNoteId || visitedIds.has(note.id)) return
          visitedIds.add(note.id)
          pendingIds.push(note.id)
          onUpdateNote(note.id, { folderId })
        })
      }
    },
    [noteMap, onUpdateNote],
  )

  const buildDragPayload = useCallback(
    (dragKind: TreeItemKind, dragId: string) => {
      const draggedKey = dragKind === 'note' ? noteTreeKey(dragId) : folderTreeKey(dragId)
      let base = selectedTreeItems
      if (!base.has(draggedKey)) {
        base = new Set([draggedKey])
        setSelectedTreeItems(new Set([draggedKey]))
        setSelectionAnchor(draggedKey)
      }
      const folderIds: string[] = []
      const noteIds: string[] = []
      base.forEach((key) => {
        const p = parseTreeKey(key)
        if (!p) return
        ;(p.kind === 'folder' ? folderIds : noteIds).push(p.id)
      })
      const selectedFolderSet = new Set(folderIds)
      const uniqueFolderIds = folderIds.filter((fid) => {
        let p = folderMap.get(fid)?.parentId ?? null
        while (p) {
          if (selectedFolderSet.has(p)) return false
          p = folderMap.get(p)?.parentId ?? null
        }
        return true
      })
      const uniqueFolderSet = new Set(uniqueFolderIds)
      const selectedNoteSet = new Set(noteIds)
      const uniqueNoteIds = noteIds.filter((nid) => {
        const note = noteMap.get(nid)
        if (!note) return false
        let p = note.parentNoteId
        while (p) {
          if (selectedNoteSet.has(p)) return false
          p = noteMap.get(p)?.parentNoteId ?? null
        }
        return !isNoteInsideAnyFolder(nid, uniqueFolderSet)
      })
      return { noteIds: uniqueNoteIds, folderIds: uniqueFolderIds }
    },
    [folderMap, isNoteInsideAnyFolder, noteMap, selectedTreeItems, setSelectedTreeItems, setSelectionAnchor],
  )

  const handleDragEnd = useCallback(() => {
    dragPayloadRef.current = { noteIds: [], folderIds: [] }
    setDragCount(0)
    setDropTargetId(null)
  }, [])

  const startTreeDrag = useCallback(
    (e: React.DragEvent, kind: TreeItemKind, id: string) => {
      e.stopPropagation()
      const payload = buildDragPayload(kind, id)
      const count = payload.noteIds.length + payload.folderIds.length
      if (count === 0) {
        e.preventDefault()
        return
      }
      dragPayloadRef.current = payload
      setDragCount(count)
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData('text/plain', `${kind}:${id}`)
    },
    [buildDragPayload],
  )

  const handleDropOnFolder = useCallback(
    (folderId: string) => {
      const { noteIds, folderIds } = dragPayloadRef.current
      folderIds
        .filter((id) => id !== folderId && !isFolderDescendant(folderId, id))
        .forEach((id) => onUpdateFolder(id, { parentId: folderId }))
      noteIds.forEach((id) => {
        onUpdateNote(id, { folderId, parentNoteId: null })
        updateDescendantFolders(id, folderId)
      })
      if (folderIds.length > 0 || noteIds.length > 0) {
        setExpandedFolders((prev) => new Set([...prev, folderId]))
      }
      handleDragEnd()
    },
    [
      handleDragEnd,
      isFolderDescendant,
      onUpdateFolder,
      onUpdateNote,
      setExpandedFolders,
      updateDescendantFolders,
    ],
  )

  const handleDropOnNote = useCallback(
    (targetNote: Note) => {
      const movedIds = dragPayloadRef.current.noteIds.filter(
        (id) => id !== targetNote.id && !isNoteDescendant(targetNote.id, id),
      )
      movedIds.forEach((id) => {
        onUpdateNote(id, { folderId: targetNote.folderId, parentNoteId: targetNote.id })
        updateDescendantFolders(id, targetNote.folderId)
      })
      if (movedIds.length > 0) {
        setExpandedNotes((prev) => new Set([...prev, targetNote.id]))
      }
      handleDragEnd()
    },
    [handleDragEnd, isNoteDescendant, onUpdateNote, setExpandedNotes, updateDescendantFolders],
  )

  const handleDropOnRoot = useCallback(() => {
    const { noteIds, folderIds } = dragPayloadRef.current
    folderIds.forEach((id) => onUpdateFolder(id, { parentId: null }))
    noteIds.forEach((id) => {
      onUpdateNote(id, { folderId: null, parentNoteId: null })
      updateDescendantFolders(id, null)
    })
    handleDragEnd()
  }, [handleDragEnd, onUpdateFolder, onUpdateNote, updateDescendantFolders])

  return {
    dropTargetId,
    setDropTargetId,
    dragCount,
    dragPayloadRef,
    startTreeDrag,
    handleDragEnd,
    handleDropOnFolder,
    handleDropOnNote,
    handleDropOnRoot,
    isFolderDescendant,
    isNoteDescendant,
  }
}
