import { useCallback, useEffect } from 'react'
import type { ClipboardItem } from '../../types'
import { generateId, createClipboardCategory } from '../../utils'
import { classifyClipboardContent } from '@Clipboard/clipboard/clipboardClassifier'
import type { UpdateStoreFn } from './types'

function hashClipboardContent(content: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < content.length; i++) {
    h ^= content.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16)
}

export const createClipboardSlice = (updateStore: UpdateStoreFn) => {
  const addClipboardCategory = useCallback((name: string) => {
    const newCategory = createClipboardCategory(name)
    updateStore(prev => ({
      ...prev,
      clipboardCategories: [...prev.clipboardCategories, newCategory],
    }))
  }, [updateStore])

  const renameClipboardCategory = useCallback((categoryId: string, name: string) => {
    if (!name.trim()) return
    updateStore(prev => ({
      ...prev,
      clipboardCategories: prev.clipboardCategories.map((cat: any) =>
        cat.id === categoryId ? { ...cat, name: name.trim() } : cat
      ),
    }))
  }, [updateStore])

  const removeClipboardCategory = useCallback((categoryId: string) => {
    updateStore(prev => ({
      ...prev,
      clipboardCategories: prev.clipboardCategories.filter((cat: any) => cat.id !== categoryId),
      clipboardItems: prev.clipboardItems.map((item: any) =>
        item.categoryId === categoryId ? { ...item, categoryId: null } : item
      ),
    }))
  }, [updateStore])

  const reorderClipboardCategories = useCallback((orderedIds: string[]) => {
    updateStore(prev => ({
      ...prev,
      clipboardCategories: prev.clipboardCategories.map((cat: any) => {
        const idx = orderedIds.indexOf(cat.id)
        if (idx === -1) return cat
        return { ...cat, order: idx }
      }),
    }))
  }, [updateStore])

  const addClipboardItem = useCallback((content: string, title?: string, categoryId?: string | null) => {
    const now = new Date().toISOString()
    const hash = hashClipboardContent(content)
    updateStore(prev => {
      const existing = prev.clipboardItems.find((i: any) => i.contentHash === hash)
      if (existing) {
        return {
          ...prev,
          clipboardItems: prev.clipboardItems.map((i: any) =>
            i.id === existing.id
              ? { ...i, copyCount: (i.copyCount ?? 0) + 1, order: Date.now(), updatedAt: now }
              : i,
          ),
        }
      }
      const newItem: ClipboardItem = {
        id: generateId(),
        title: title ?? content.slice(0, 60).replace(/\n/g, ' '),
        content,
        isPinned: false,
        categoryId: categoryId ?? null,
        createdAt: now,
        updatedAt: now,
        order: Date.now(),
        copyCount: 1,
        contentType: classifyClipboardContent(content),
        isSnippet: false,
        contentHash: hash,
      }
      return { ...prev, clipboardItems: [...prev.clipboardItems, newItem] }
    })
  }, [updateStore])

  const toggleClipboardSnippet = useCallback((itemId: string) => {
    updateStore(prev => ({
      ...prev,
      clipboardItems: prev.clipboardItems.map((i: any) =>
        i.id === itemId ? { ...i, isSnippet: !i.isSnippet, updatedAt: new Date().toISOString() } : i,
      ),
    }))
  }, [updateStore])

  const purgeExpiredClipboard = useCallback((retentionDays: number) => {
    if (retentionDays <= 0) return 0
    const cutoff = Date.now() - retentionDays * 86_400_000
    let removed = 0
    updateStore(prev => {
      const next = prev.clipboardItems.filter((i: any) => {
        if (i.isSnippet || i.isPinned) return true
        const created = new Date(i.createdAt).getTime()
        if (created < cutoff) {
          removed += 1
          return false
        }
        return true
      })
      if (removed === 0) return prev
      return { ...prev, clipboardItems: next }
    })
    return removed
  }, [updateStore])

  const updateClipboardItem = useCallback((itemId: string, updates: Partial<Pick<ClipboardItem, 'title' | 'isPinned' | 'categoryId'>>) => {
    updateStore(prev => ({
      ...prev,
      clipboardItems: prev.clipboardItems.map((item: any) => {
        if (item.id !== itemId) return item
        return { ...item, ...updates, updatedAt: new Date().toISOString() }
      }),
    }))
  }, [updateStore])

  const removeClipboardItem = useCallback((itemId: string) => {
    updateStore(prev => ({
      ...prev,
      clipboardItems: prev.clipboardItems.filter((item: any) => item.id !== itemId),
    }))
  }, [updateStore])

  const moveClipboardItemToCategory = useCallback((itemId: string, categoryId: string | null) => {
    updateStore(prev => ({
      ...prev,
      clipboardItems: prev.clipboardItems.map((item: any) =>
        item.id === itemId ? { ...item, categoryId, updatedAt: new Date().toISOString() } : item
      ),
    }))
  }, [updateStore])

  const incrementClipboardCopyCount = useCallback((itemId: string) => {
    updateStore(prev => ({
      ...prev,
      clipboardItems: prev.clipboardItems.map((item: any) =>
        item.id === itemId ? { ...item, copyCount: (item.copyCount ?? 0) + 1 } : item
      ),
    }))
  }, [updateStore])

  const useClipboardMonitor = () => {
    useEffect(() => {
      if (typeof window === 'undefined' || !window.electronAPI?.onClipboardContent) return
      const handler = (_event: unknown, text: string) => {
        if (!text?.trim()) return
        updateStore(prev => {
          const hash = hashClipboardContent(text)
          const existing = prev.clipboardItems.find((i: any) => i.contentHash === hash)
          if (existing) {
            return {
              ...prev,
              clipboardItems: prev.clipboardItems.map((i: any) =>
                i.id === existing.id
                  ? { ...i, copyCount: (i.copyCount ?? 0) + 1, order: Date.now() }
                  : i,
              ),
            }
          }
          const now = new Date().toISOString()
          const newItem: ClipboardItem = {
            id: generateId(),
            title: text.slice(0, 60).replace(/\n/g, ' '),
            content: text,
            isPinned: false,
            categoryId: null,
            createdAt: now,
            updatedAt: now,
            order: Date.now(),
            copyCount: 1,
            contentType: classifyClipboardContent(text),
            isSnippet: false,
            contentHash: hash,
          }
          return { ...prev, clipboardItems: [...prev.clipboardItems, newItem] }
        })
      }
      window.electronAPI.onClipboardContent(handler)
      return () => window.electronAPI.offClipboardContent(handler)
    }, [updateStore])
  }

  return {
    addClipboardCategory,
    renameClipboardCategory,
    removeClipboardCategory,
    reorderClipboardCategories,
    addClipboardItem,
    toggleClipboardSnippet,
    purgeExpiredClipboard,
    updateClipboardItem,
    removeClipboardItem,
    moveClipboardItemToCategory,
    incrementClipboardCopyCount,
    useClipboardMonitor,
  }
}
