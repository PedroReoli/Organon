/**
 * Hook puro de agregacoes para relatorios do CRM.
 *
 * Calcula:
 * - Distribuicao de contatos por stage.
 * - Distribuicao por tag (top N).
 * - Contagem de interacoes nos ultimos N dias.
 * - Contatos "stuck" (sem interacao ha mais de X dias).
 *
 * Zero side effects, memoizado. Definido no upgrade 03 (foundations).
 */

import { useMemo } from 'react'
import type {
  CRMContact,
  CRMInteraction,
  CRMStageId,
  CRMTag,
} from '../types'
import { CRM_STAGES } from '../types'

export interface StageDistribution {
  stageId: CRMStageId
  label: string
  count: number
  percent: number
}

export interface TagDistribution {
  tagId: string
  name: string
  color: string
  count: number
}

export interface StuckContact {
  contact: CRMContact
  daysSinceLastInteraction: number | null
}

export interface InteractionSeriesPoint {
  /** YYYY-MM-DD */
  date: string
  count: number
}

interface UseCRMReportsOptions {
  contacts: CRMContact[]
  interactions: CRMInteraction[]
  tags: CRMTag[]
  /** Janela para serie de interacoes (dias). Default: 30. */
  windowDays?: number
  /** Threshold para considerar "stuck". Default: 14. */
  stuckThresholdDays?: number
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function diffDays(iso: string, today: string): number {
  const a = new Date(iso + 'T00:00:00').getTime()
  const b = new Date(today + 'T00:00:00').getTime()
  return Math.floor((b - a) / 86_400_000)
}

function subDaysISO(iso: string, n: number): string {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

export interface UseCRMReportsResult {
  totalContacts: number
  totalActive: number
  stageDistribution: StageDistribution[]
  topTags: TagDistribution[]
  stuckContacts: StuckContact[]
  interactionsLastWindow: number
  interactionSeries: InteractionSeriesPoint[]
}

export function useCRMReports(
  options: UseCRMReportsOptions,
): UseCRMReportsResult {
  const {
    contacts,
    interactions,
    tags,
    windowDays = 30,
    stuckThresholdDays = 14,
  } = options

  return useMemo(() => {
    const today = todayISO()
    const windowStart = subDaysISO(today, windowDays)

    const totalContacts = contacts.length
    const totalActive = contacts.filter((c) => c.stageId !== 'perdeu').length

    const stageCounts = new Map<CRMStageId, number>()
    for (const c of contacts) {
      stageCounts.set(c.stageId, (stageCounts.get(c.stageId) ?? 0) + 1)
    }
    const stageDistribution: StageDistribution[] = CRM_STAGES.map((s) => {
      const count = stageCounts.get(s.id) ?? 0
      return {
        stageId: s.id,
        label: s.label,
        count,
        percent: totalContacts === 0 ? 0 : (count / totalContacts) * 100,
      }
    })

    const tagMap = new Map<string, CRMTag>(tags.map((t) => [t.id, t]))
    const tagCounts = new Map<string, number>()
    for (const c of contacts) {
      for (const tagId of c.tags) {
        tagCounts.set(tagId, (tagCounts.get(tagId) ?? 0) + 1)
      }
    }
    const topTags: TagDistribution[] = Array.from(tagCounts.entries())
      .map(([tagId, count]) => {
        const tag = tagMap.get(tagId)
        return {
          tagId,
          name: tag?.name ?? tagId,
          color: tag?.color ?? '#888',
          count,
        }
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    const lastInteractionByContact = new Map<string, string>()
    for (const it of interactions) {
      const prev = lastInteractionByContact.get(it.contactId)
      if (!prev || it.date > prev) {
        lastInteractionByContact.set(it.contactId, it.date)
      }
    }

    const stuckContacts: StuckContact[] = contacts
      .filter((c) => c.stageId !== 'perdeu' && c.stageId !== 'cliente-ativo')
      .map((c) => {
        const last = lastInteractionByContact.get(c.id)
        const days = last == null ? null : diffDays(last, today)
        return { contact: c, daysSinceLastInteraction: days }
      })
      .filter((s) => s.daysSinceLastInteraction == null || s.daysSinceLastInteraction >= stuckThresholdDays)
      .sort((a, b) => {
        const da = a.daysSinceLastInteraction ?? Number.MAX_SAFE_INTEGER
        const db = b.daysSinceLastInteraction ?? Number.MAX_SAFE_INTEGER
        return db - da
      })

    const recentInteractions = interactions.filter(
      (it) => it.date >= windowStart && it.date <= today,
    )
    const interactionsLastWindow = recentInteractions.length

    const seriesMap = new Map<string, number>()
    for (const it of recentInteractions) {
      seriesMap.set(it.date, (seriesMap.get(it.date) ?? 0) + 1)
    }
    const interactionSeries: InteractionSeriesPoint[] = Array.from(
      seriesMap.entries(),
    )
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }))

    return {
      totalContacts,
      totalActive,
      stageDistribution,
      topTags,
      stuckContacts,
      interactionsLastWindow,
      interactionSeries,
    }
  }, [contacts, interactions, tags, windowDays, stuckThresholdDays])
}
