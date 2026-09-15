import { useMemo, useState } from 'react'
import type { AppItem } from '../types'

/**
 * Hook para busca fuzzy de apps.
 * Busca por nome, caminho, tags e descrição.
 */
export const useAppSearch = (apps: AppItem[]) => {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredApps = useMemo(() => {
    if (!searchQuery.trim()) return apps

    const query = searchQuery.toLowerCase().trim()
    const terms = query.split(/\s+/)

    return apps.filter(app => {
      const searchableText = [
        app.name,
        app.exePath,
        app.description || '',
        ...(app.tags || []),
      ].join(' ').toLowerCase()

      // Fuzzy match: todos os termos devem estar presentes
      return terms.every(term => searchableText.includes(term))
    })
  }, [apps, searchQuery])

  return {
    searchQuery,
    setSearchQuery,
    filteredApps,
    hasSearch: searchQuery.trim().length > 0,
  }
}
