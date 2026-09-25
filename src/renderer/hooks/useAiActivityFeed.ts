import { useState, useEffect, useCallback } from 'react'
import { isElectron } from '@utils'
import { playSound } from '../utils/audioAlert'

export interface AiActivityNotification {
  id: string
  timestamp: string
  agent: 'Antigravity' | 'Claude' | 'Gemini' | 'CLI Organon' | 'Sistema'
  category: 'task' | 'note' | 'project' | 'study' | 'sync'
  type: 'created' | 'updated' | 'deleted' | 'reordered'
  title: string
  description: string
  targetId?: string
  targetType?: 'card' | 'note' | 'project' | 'folder'
  previousSnapshot?: any
  currentSnapshot?: any
  read: boolean
}

const STORAGE_KEY = 'organon-ai-activity-feed'
const MUTE_STORAGE_KEY = 'organon-ai-sound-muted'

export const useAiActivityFeed = (
  onNavigateView?: (view: string) => void,
  onSelectNote?: (noteId: string) => void
) => {
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    try {
      return localStorage.getItem(MUTE_STORAGE_KEY) === 'true'
    } catch {
      return false
    }
  })

  const [notifications, setNotifications] = useState<AiActivityNotification[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  })
  const [isOpen, setIsOpen] = useState(false)
  const [diffModalItem, setDiffModalItem] = useState<AiActivityNotification | null>(null)

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev
      try {
        localStorage.setItem(MUTE_STORAGE_KEY, String(next))
      } catch {}
      return next
    })
  }, [])

  // Salvar no localStorage sempre que mudar
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications.slice(0, 100)))
    } catch {
      // Ignore storage error
    }
  }, [notifications])

  // Carregar histórico inicial do processo principal
  useEffect(() => {
    if (isElectron() && window.electronAPI?.getCliRecentEvents) {
      window.electronAPI.getCliRecentEvents().then((events) => {
        if (Array.isArray(events) && events.length > 0) {
          setNotifications((prev) => {
            const existingIds = new Set(prev.map((n) => n.id))
            const newOnes = events
              .filter((e) => !existingIds.has(e.id))
              .map((e) => ({ ...e, read: false }))
            return [...newOnes, ...prev].slice(0, 100)
          })
        }
      })
    }
  }, [])

  // Escutar eventos de sincronização em tempo real
  useEffect(() => {
    const handleExternalChanges = (event: Event) => {
      const customEvent = event as CustomEvent<{ changes: any[]; timestamp: string }>
      const changes = customEvent.detail?.changes || []

      if (changes.length > 0) {
        if (!isMuted) {
          try {
            playSound('gentle', 0.2)
          } catch {
            // Ignore audio error
          }
        }

        const newItems: AiActivityNotification[] = changes.map((c) => ({
          ...c,
          read: false,
        }))

        setNotifications((prev) => {
          const combined = [...newItems, ...prev]
          return combined.slice(0, 100)
        })
      }
    }

    window.addEventListener('organon:external-changes', handleExternalChanges)
    return () => {
      window.removeEventListener('organon:external-changes', handleExternalChanges)
    }
  }, [isMuted])

  const unreadCount = notifications.filter((n) => !n.read).length

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }, [])

  const clearAll = useCallback(() => {
    setNotifications([])
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {}
  }, [])

  const openItem = useCallback(
    (item: AiActivityNotification) => {
      // Marcar item específico como lido
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, read: true } : n))
      )

      if (item.targetType === 'card' || item.category === 'task') {
        onNavigateView?.('planner')
        setIsOpen(false)
      } else if (item.targetType === 'note' || item.category === 'note') {
        if (item.targetId) {
          onSelectNote?.(item.targetId)
        }
        onNavigateView?.('notes')
        setIsOpen(false)
      } else if (item.category === 'project') {
        onNavigateView?.('projects')
        setIsOpen(false)
      }
    },
    [onNavigateView, onSelectNote]
  )

  const rollback = useCallback(async (item: AiActivityNotification) => {
    if (!item.id || !isElectron() || !window.electronAPI?.rollbackCliAction) return false
    const ok = await window.electronAPI.rollbackCliAction(item.id)
    if (ok) {
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === item.id
            ? { ...n, title: `[Revertido] ${n.title}`, read: true }
            : n
        )
      )
    }
    return ok
  }, [])

  return {
    notifications,
    unreadCount,
    isOpen,
    setIsOpen,
    isMuted,
    toggleMute,
    diffModalItem,
    setDiffModalItem,
    markAllAsRead,
    clearAll,
    openItem,
    rollback,
  }
}
