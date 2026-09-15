import { useCallback, useEffect, useState } from 'react'
import type { AgendaCategory } from '../types'

const LS_KEY   = 'organon:agendaCategories'
const SYNC_EVT = 'organon:agendaCategoriesChanged'

const DEFAULT_CATEGORIES: AgendaCategory[] = [
  { id: 'work',     name: 'Trabalho',    color: 'var(--color-primary)' },
  { id: 'personal', name: 'Pessoal',     color: '#10b981' },
  { id: 'health',   name: 'Saúde',       color: '#f59e0b' },
]

function generateId(): string {
  return Math.random().toString(36).slice(2, 10)
}

function load(): AgendaCategory[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignorar */ }
  return DEFAULT_CATEGORIES
}

function save(cats: AgendaCategory[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(cats))
    window.dispatchEvent(new Event(SYNC_EVT))
  } catch { /* ignorar */ }
}

export function useAgendaCategories() {
  const [categories, setCategories] = useState<AgendaCategory[]>(load)

  useEffect(() => {
    const handle = () => setCategories(load())
    window.addEventListener(SYNC_EVT, handle)
    return () => window.removeEventListener(SYNC_EVT, handle)
  }, [])

  const addCategory = useCallback((input: Omit<AgendaCategory, 'id'>) => {
    setCategories(prev => {
      const next = [...prev, { ...input, id: generateId() }]
      save(next)
      return next
    })
  }, [])

  const editCategory = useCallback((id: string, updates: Partial<Omit<AgendaCategory, 'id'>>) => {
    setCategories(prev => {
      const next = prev.map(c => c.id === id ? { ...c, ...updates } : c)
      save(next)
      return next
    })
  }, [])

  const removeCategory = useCallback((id: string) => {
    setCategories(prev => {
      const next = prev.filter(c => c.id !== id)
      save(next)
      return next
    })
  }, [])

  return { categories, addCategory, editCategory, removeCategory }
}
