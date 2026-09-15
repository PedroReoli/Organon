/**
 * Hook puro de insights de um habito.
 *
 * Calcula streak atual, melhor streak historico, best day of week,
 * taxa de conclusao mensal/anual e, quando o habito e uma serie (ABC),
 * distribuicao de labels. Zero side effects.
 *
 * Definido no upgrade 13.
 */

import { useMemo } from 'react'
import type { Habit, HabitEntry } from '../types'

export interface HabitInsightsResult {
  /** Streak atual em dias (continuo ate hoje ou ontem se hoje ainda nao foi marcado). */
  currentStreak: number
  /** Maior streak historico. */
  bestStreak: number
  /** Dia da semana mais consistente (0=dom, 6=sab), -1 se sem dados. */
  bestWeekday: number
  /** Taxa de conclusao dos ultimos 30 dias, 0-1. */
  completionRate30d: number
  /** Taxa de conclusao dos ultimos 365 dias, 0-1. */
  completionRate365d: number
  /** Total de marcacoes feitas (lifetime). */
  totalDone: number
  /** Distribuicao por label da serie (ex: { A: 12, B: 10, C: 8 }). Apenas para type='series'. */
  seriesDistribution: Record<string, number>
  /** Proxima label sugerida com base na ultima marcacao. Apenas para type='series'. */
  nextSuggestedLabel: string | null
  /** Ultima label marcada. Apenas para type='series'. */
  lastLabel: string | null
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function addDaysISO(iso: string, delta: number): string {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + delta)
  return toISODate(d)
}

function isEntryDone(entry: HabitEntry, habit: Habit): boolean {
  if (entry.skipped) return false
  if (habit.type === 'check' || habit.type === 'routine') return entry.value >= 1
  return entry.value >= habit.target
}

/** Calcula streak continuo ate `todayISO`, andando pra tras pelos dias. */
export function computeCurrentStreak(
  entriesByDate: Map<string, HabitEntry>,
  habit: Habit,
  todayISO: string,
): number {
  let streak = 0
  let cursor = todayISO

  // Se hoje ainda nao foi marcado, comeca de ontem.
  const todayEntry = entriesByDate.get(todayISO)
  if (!todayEntry || !isEntryDone(todayEntry, habit)) {
    cursor = addDaysISO(todayISO, -1)
  }

  while (true) {
    const entry = entriesByDate.get(cursor)
    if (!entry || !isEntryDone(entry, habit)) break
    streak += 1
    cursor = addDaysISO(cursor, -1)
    // Limite de seguranca
    if (streak > 10000) break
  }
  return streak
}

export function computeBestStreak(entries: HabitEntry[], habit: Habit): number {
  if (entries.length === 0) return 0
  const dates = entries
    .filter((e) => isEntryDone(e, habit))
    .map((e) => e.date)
    .sort()
  if (dates.length === 0) return 0

  let best = 1
  let current = 1
  for (let i = 1; i < dates.length; i++) {
    const prev = dates[i - 1]
    const curr = dates[i]
    if (addDaysISO(prev, 1) === curr) {
      current += 1
      if (current > best) best = current
    } else {
      current = 1
    }
  }
  return best
}

export function computeBestWeekday(entries: HabitEntry[], habit: Habit): number {
  const counts = [0, 0, 0, 0, 0, 0, 0]
  for (const e of entries) {
    if (!isEntryDone(e, habit)) continue
    const day = new Date(e.date + 'T00:00:00').getDay()
    counts[day] += 1
  }
  let best = -1
  let max = 0
  for (let i = 0; i < 7; i++) {
    if (counts[i] > max) {
      max = counts[i]
      best = i
    }
  }
  return best
}

export function computeCompletionRate(
  entries: HabitEntry[],
  habit: Habit,
  todayISO: string,
  days: number,
): number {
  if (days <= 0) return 0
  const start = addDaysISO(todayISO, -(days - 1))
  const inRange = entries.filter((e) => e.date >= start && e.date <= todayISO)
  if (inRange.length === 0) return 0
  const done = inRange.filter((e) => isEntryDone(e, habit)).length
  return done / days
}

export function computeSeriesInsights(
  entries: HabitEntry[],
  habit: Habit,
): {
  distribution: Record<string, number>
  lastLabel: string | null
  nextSuggestedLabel: string | null
} {
  if (habit.type !== 'routine' || !habit.seriesLabels || habit.seriesLabels.length === 0) {
    return { distribution: {}, lastLabel: null, nextSuggestedLabel: null }
  }

  const distribution: Record<string, number> = {}
  for (const label of habit.seriesLabels) distribution[label] = 0

  const sorted = entries
    .filter((e) => e.seriesLabel && !e.skipped)
    .sort((a, b) => (a.date < b.date ? 1 : -1)) // mais recente primeiro

  for (const e of sorted) {
    if (e.seriesLabel && distribution[e.seriesLabel] !== undefined) {
      distribution[e.seriesLabel] += 1
    }
  }

  const lastLabel = sorted[0]?.seriesLabel ?? null

  // Proxima label sugerida: rotating avanca pro proximo; manual mostra
  // a label menos usada.
  let nextSuggestedLabel: string | null = null
  if (habit.seriesPattern === 'rotating' && lastLabel) {
    const idx = habit.seriesLabels.indexOf(lastLabel)
    if (idx >= 0) {
      nextSuggestedLabel = habit.seriesLabels[(idx + 1) % habit.seriesLabels.length]
    }
  } else if (habit.seriesLabels.length > 0) {
    // Manual: proxima = label menos usada
    let min = Number.MAX_SAFE_INTEGER
    for (const label of habit.seriesLabels) {
      if (distribution[label] < min) {
        min = distribution[label]
        nextSuggestedLabel = label
      }
    }
  }

  return { distribution, lastLabel, nextSuggestedLabel }
}

interface UseHabitInsightsOptions {
  habit: Habit
  entries: HabitEntry[]
  /** Data base (ISO). Default: hoje. */
  today?: string
}

export function useHabitInsights(
  options: UseHabitInsightsOptions,
): HabitInsightsResult {
  const { habit, entries, today = toISODate(new Date()) } = options

  return useMemo(() => {
    const filtered = entries.filter((e) => e.habitId === habit.id)
    const byDate = new Map<string, HabitEntry>()
    for (const e of filtered) byDate.set(e.date, e)

    const currentStreak = computeCurrentStreak(byDate, habit, today)
    const bestStreak = computeBestStreak(filtered, habit)
    const bestWeekday = computeBestWeekday(filtered, habit)
    const completionRate30d = computeCompletionRate(filtered, habit, today, 30)
    const completionRate365d = computeCompletionRate(filtered, habit, today, 365)
    const totalDone = filtered.filter((e) => isEntryDone(e, habit)).length

    const seriesInsights = computeSeriesInsights(filtered, habit)

    return {
      currentStreak,
      bestStreak,
      bestWeekday,
      completionRate30d,
      completionRate365d,
      totalDone,
      seriesDistribution: seriesInsights.distribution,
      lastLabel: seriesInsights.lastLabel,
      nextSuggestedLabel: seriesInsights.nextSuggestedLabel,
    }
  }, [habit, entries, today])
}
