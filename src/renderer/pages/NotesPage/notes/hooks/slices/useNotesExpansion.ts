/**
 * useNotesExpansion — slice de expansao de pastas e notas (Upgrade 10a refator).
 *
 * Mantem 2 Sets (expandedFolders, expandedNotes) e helpers de toggle.
 * Sem deps externas — completamente isolado.
 */

import React, { useCallback, useState } from 'react'

export function useNotesExpansion() {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set())

  const toggleFolder = useCallback((folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev)
      if (next.has(folderId)) next.delete(folderId)
      else next.add(folderId)
      return next
    })
  }, [])

  const toggleNote = useCallback((noteId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setExpandedNotes((prev) => {
      const next = new Set(prev)
      if (next.has(noteId)) next.delete(noteId)
      else next.add(noteId)
      return next
    })
  }, [])

  const collapseAll = useCallback(() => {
    setExpandedFolders(new Set())
    setExpandedNotes(new Set())
  }, [])

  return {
    expandedFolders,
    setExpandedFolders,
    expandedNotes,
    setExpandedNotes,
    toggleFolder,
    toggleNote,
    collapseAll,
  }
}
