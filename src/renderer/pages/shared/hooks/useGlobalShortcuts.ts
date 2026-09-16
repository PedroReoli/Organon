/**
 * Hook que registra os atalhos de teclado globais do app:
 *  - Reduced mode (toggle backlog/sidepanel) — so em views relevantes
 *  - Quick search (Ctrl+K)
 *  - Views navigator (Ctrl+G)
 *  - Clipboard quick modal (Ctrl+Shift+V)
 *  - Zoom da view atual (Ctrl++ / Ctrl+- / Ctrl+0)
 *
 * Extraido de App.tsx no upgrade 07 sub-G.
 */

import { useEffect } from 'react'
import type { AppView, KeyboardShortcut } from '@types'
import { getShortcutById, isElectron, matchesShortcut } from '@utils'

interface UseGlobalShortcutsOptions {
  activeView: AppView
  keyboardShortcuts: KeyboardShortcut[]
  setReduceModeSignal: (updater: (prev: number) => number) => void
  setShowShortcutSearch: (visible: boolean) => void
  setShowViewsNavigator: (visible: boolean) => void
  setShowClipboardModal: (visible: boolean) => void
  setViewZoom: (updater: (prev: Record<string, number>) => Record<string, number>) => void
}

const VIEWS_WITH_REDUCED_MODE: ReadonlySet<AppView> = new Set([
  'notes',
  'planner',
  'calendar',
  'agenda',
])

export function useGlobalShortcuts({
  activeView,
  keyboardShortcuts,
  setReduceModeSignal,
  setShowShortcutSearch,
  setShowViewsNavigator,
  setShowClipboardModal,
  setViewZoom,
}: UseGlobalShortcutsOptions): void {
  // ─── Atalhos nomeados (busca, navegador, etc) ─────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const tag = target?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || target?.isContentEditable) return

      const quickSearchShortcut = getShortcutById(keyboardShortcuts, 'quick-search')
      const reducedModeShortcut = getShortcutById(keyboardShortcuts, 'reduced-mode')

      if (reducedModeShortcut && matchesShortcut(e, reducedModeShortcut)) {
        if (VIEWS_WITH_REDUCED_MODE.has(activeView)) {
          e.preventDefault()
          setReduceModeSignal((prev) => prev + 1)
        }
        return
      }
      if (quickSearchShortcut && matchesShortcut(e, quickSearchShortcut)) {
        e.preventDefault()
        setShowShortcutSearch(true)
        return
      }

      const viewsNavShortcut = getShortcutById(keyboardShortcuts, 'views-navigator')
      const clipboardModalShortcut = getShortcutById(keyboardShortcuts, 'clipboard-modal')

      if (viewsNavShortcut && matchesShortcut(e, viewsNavShortcut)) {
        e.preventDefault()
        setShowViewsNavigator(true)
        return
      }
      if (clipboardModalShortcut && matchesShortcut(e, clipboardModalShortcut)) {
        e.preventDefault()
        setShowClipboardModal(true)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [
    activeView,
    keyboardShortcuts,
    setReduceModeSignal,
    setShowShortcutSearch,
    setShowViewsNavigator,
    setShowClipboardModal,
  ])

  // ─── Zoom da view atual via Ctrl + +/-/0 ────────────────────────
  useEffect(() => {
    const handleZoomKey = (e: KeyboardEvent) => {
      if (!e.ctrlKey) return
      const isZoomIn = e.key === '=' || e.key === '+'
      const isZoomOut = e.key === '-'
      const isReset = e.key === '0'
      if (!isZoomIn && !isZoomOut && !isReset) return

      e.preventDefault()
      // Neutraliza zoom nativo do Electron
      if (isElectron()) (window.electronAPI as any).setNativeZoom?.(1)

      setViewZoom((prev) => {
        const current = prev[activeView] ?? 1
        let next: number
        if (isReset) next = 1
        else if (isZoomIn) next = Math.min(2, Math.round((current + 0.1) * 10) / 10)
        else next = Math.max(0.5, Math.round((current - 0.1) * 10) / 10)
        const updated = { ...prev, [activeView]: next }
        try {
          localStorage.setItem('view-zoom', JSON.stringify(updated))
        } catch {
          // ignore
        }
        return updated
      })
    }
    document.addEventListener('keydown', handleZoomKey)
    return () => document.removeEventListener('keydown', handleZoomKey)
  }, [activeView, setViewZoom])
}
