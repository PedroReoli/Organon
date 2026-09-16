/**
 * useNotesSelection — slice de selecao multipla na tree (Upgrade 10a refator).
 *
 * Mantem Set de chaves selecionadas + anchor para shift-select de range.
 * Cleanup automatico de chaves invalidas quando notes/folders mudam.
 */

import React, { useCallback, useEffect, useState } from 'react'
import type { Note, NoteFolder, TreeItemKey } from '@types'
import { folderTreeKey, noteTreeKey } from '../../utils'

interface UseNotesSelectionParams {
  notes: Note[]
  folders: NoteFolder[]
  visibleTreeItemKeys: TreeItemKey[]
}

export function useNotesSelection({ notes, folders, visibleTreeItemKeys }: UseNotesSelectionParams) {
  const [selectedTreeItems, setSelectedTreeItems] = useState<Set<TreeItemKey>>(new Set())
  const [selectionAnchor, setSelectionAnchor] = useState<TreeItemKey | null>(null)

  // Cleanup: remove chaves de items que nao existem mais
  useEffect(() => {
    const validKeys = new Set<TreeItemKey>([
      ...notes.map((n) => noteTreeKey(n.id)),
      ...folders.map((f) => folderTreeKey(f.id)),
    ])
    setSelectedTreeItems((prev) => {
      const next = new Set<TreeItemKey>()
      let changed = false
      prev.forEach((key) => {
        if (validKeys.has(key)) next.add(key)
        else changed = true
      })
      return changed ? next : prev
    })
    setSelectionAnchor((prev) => (prev && validKeys.has(prev) ? prev : null))
  }, [folders, notes])

  const selectSingleTreeItem = useCallback((key: TreeItemKey) => {
    setSelectedTreeItems(new Set([key]))
    setSelectionAnchor(key)
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedTreeItems(new Set())
    setSelectionAnchor(null)
  }, [])

  const toggleTreeItemSelection = useCallback((key: TreeItemKey) => {
    setSelectedTreeItems((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
    setSelectionAnchor(key)
  }, [])

  const selectTreeItemRange = useCallback(
    (targetKey: TreeItemKey) => {
      const anchor = selectionAnchor ?? targetKey
      const ai = visibleTreeItemKeys.indexOf(anchor)
      const ti = visibleTreeItemKeys.indexOf(targetKey)
      if (ai < 0 || ti < 0) {
        selectSingleTreeItem(targetKey)
        return
      }
      const start = Math.min(ai, ti)
      const end = Math.max(ai, ti)
      setSelectedTreeItems(new Set(visibleTreeItemKeys.slice(start, end + 1)))
      setSelectionAnchor(anchor)
    },
    [selectionAnchor, visibleTreeItemKeys, selectSingleTreeItem],
  )

  const handleTreeRowSelection = useCallback(
    (key: TreeItemKey, e: React.MouseEvent): boolean => {
      if (e.shiftKey) {
        selectTreeItemRange(key)
        return true
      }
      if (e.ctrlKey || e.metaKey) {
        setSelectedTreeItems((prev) => {
          const next = new Set(prev)
          if (next.has(key)) next.delete(key)
          else next.add(key)
          return next
        })
        setSelectionAnchor(key)
        return true
      }
      return false
    },
    [selectTreeItemRange],
  )

  return {
    selectedTreeItems,
    setSelectedTreeItems,
    selectionAnchor,
    setSelectionAnchor,
    selectSingleTreeItem,
    clearSelection,
    toggleTreeItemSelection,
    handleTreeRowSelection,
  }
}
