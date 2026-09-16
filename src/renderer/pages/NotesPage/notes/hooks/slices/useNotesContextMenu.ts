/**
 * useNotesContextMenu — slice de context menu (Upgrade 10a refator).
 *
 * Mantem state do menu (posicao + alvo) + handler de abertura ja com
 * clamp pro viewport + auto-close em outside click ou Escape.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import type { Note, NoteFolder, SidebarCtxMenu } from '@types'

const PAD = 8

export function useNotesContextMenu(notes: Note[], folders: NoteFolder[]) {
  const [ctxMenu, setCtxMenu] = useState<SidebarCtxMenu | null>(null)
  const contextMenuRef = useRef<HTMLDivElement>(null)

  const openCtxMenu = useCallback((
    e: React.MouseEvent,
    target: { kind: 'note'; id: string } | { kind: 'folder'; id: string },
  ) => {
    e.preventDefault()
    e.stopPropagation()

    let x = Math.max(PAD, e.clientX)
    let y = Math.max(PAD, e.clientY)

    // Ancoragem ao botão/elemento clicado se for disparado por clique de botão (ex: três pontos)
    if (e.currentTarget && e.type === 'click') {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      if (rect && rect.width > 0 && rect.height > 0) {
        x = rect.right + 6
        y = rect.top - 4
        setCtxMenu({ ...target, x, y })
        return
      }
    }

    setCtxMenu({ ...target, x, y })
  }, [])

  const ctxNote =
    ctxMenu?.kind === 'note' ? notes.find((n) => n.id === ctxMenu.id) ?? null : null
  const ctxFolder =
    ctxMenu?.kind === 'folder' ? folders.find((f) => f.id === ctxMenu.id) ?? null : null

  useEffect(() => {
    if (!ctxMenu) return
    const onPointerDown = (e: PointerEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setCtxMenu(null)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCtxMenu(null)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [ctxMenu])

  return {
    ctxMenu,
    setCtxMenu,
    ctxNote,
    ctxFolder,
    contextMenuRef,
    openCtxMenu,
  }
}
