/**
 * Hook puro de busca e filtros de contatos CRM.
 *
 * Aceita um filtro declarativo e retorna a lista filtrada, ja ordenada
 * por `order`. Busca textual em name/company/email/phone/description.
 * Zero side effects, totalmente testavel.
 *
 * Definido no upgrade 03 (foundations).
 */

import { useMemo } from 'react'
import type {
  CRMContact,
  CRMInteraction,
  CRMStageId,
} from '../types'
import { tokenizeSearchQuery } from '../utils/searchHighlight'

export interface CRMFilters {
  /** Busca textual bruta. */
  query: string
  /** Se definido, apenas contatos nessas stages. */
  stages: Set<CRMStageId>
  /** Se definido, apenas contatos com essas tags (OR). */
  tagIds: Set<string>
  /** Prioridade minima (P1-P4). null = todas. */
  priorities: Set<string>
  /** Apenas contatos com projectId vinculado. */
  hasProject: boolean
  /** Apenas contatos com pelo menos uma nota vinculada. */
  hasNote: boolean
  /** Apenas contatos com interacao nos ultimos N dias. 0 = sem filtro. */
  recentInteractionDays: number
}

export function createEmptyCRMFilters(): CRMFilters {
  return {
    query: '',
    stages: new Set(),
    tagIds: new Set(),
    priorities: new Set(),
    hasProject: false,
    hasNote: false,
    recentInteractionDays: 0,
  }
}

interface UseCRMFiltersOptions {
  contacts: CRMContact[]
  interactions: CRMInteraction[]
  filters: CRMFilters
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function matchesQuery(contact: CRMContact, terms: string[]): boolean {
  if (terms.length === 0) return true
  const plainDescription = (contact.description ?? '').replace(/<[^>]*>/g, ' ')
  const haystack = normalize(
    [
      contact.name,
      contact.company ?? '',
      contact.role ?? '',
      contact.email ?? '',
      contact.phone ?? '',
      contact.socialMedia ?? '',
      plainDescription,
      contact.context ?? '',
      contact.interests ?? '',
      contact.tags.join(' '),
    ].join(' '),
  )
  return terms.every((t) => haystack.includes(t))
}

function daysSince(iso: string, now: Date): number {
  const then = new Date(iso + 'T00:00:00').getTime()
  return Math.floor((now.getTime() - then) / 86_400_000)
}

export interface UseCRMFiltersResult {
  /** Contatos que passam em todos os filtros, ordenados por `order`. */
  results: CRMContact[]
  /** Quantos contatos foram filtrados (contagem total do store, antes de filtrar). */
  totalBeforeFilter: number
  /** True quando filtros ativos estao em uso (nao e apenas o default vazio). */
  hasActiveFilter: boolean
}

export function useCRMFilters(
  options: UseCRMFiltersOptions,
): UseCRMFiltersResult {
  const { contacts, interactions, filters } = options

  return useMemo(() => {
    const terms = tokenizeSearchQuery(filters.query)
    const now = new Date()

    const interactionsByContact = new Map<string, CRMInteraction[]>()
    for (const it of interactions) {
      const arr = interactionsByContact.get(it.contactId) ?? []
      arr.push(it)
      interactionsByContact.set(it.contactId, arr)
    }

    const results = contacts
      .filter((c) => {
        if (!matchesQuery(c, terms)) return false
        if (filters.stages.size > 0 && !filters.stages.has(c.stageId))
          return false
        if (
          filters.tagIds.size > 0 &&
          !c.tags.some((t) => filters.tagIds.has(t))
        )
          return false
        if (
          filters.priorities.size > 0 &&
          !filters.priorities.has(c.priority as string)
        )
          return false
        if (filters.hasProject && c.links.projectIds.length === 0) return false
        if (filters.hasNote && c.links.noteIds.length === 0) return false
        if (filters.recentInteractionDays > 0) {
          const its = interactionsByContact.get(c.id) ?? []
          const mostRecent = its
            .map((it) => daysSince(it.date, now))
            .reduce<number | null>(
              (lowest, d) => (lowest == null || d < lowest ? d : lowest),
              null,
            )
          if (mostRecent == null || mostRecent > filters.recentInteractionDays)
            return false
        }
        return true
      })
      .sort((a, b) => a.order - b.order)

    const hasActiveFilter =
      filters.query.length > 0 ||
      filters.stages.size > 0 ||
      filters.tagIds.size > 0 ||
      filters.priorities.size > 0 ||
      filters.hasProject ||
      filters.hasNote ||
      filters.recentInteractionDays > 0

    return { results, totalBeforeFilter: contacts.length, hasActiveFilter }
  }, [contacts, interactions, filters])
}
