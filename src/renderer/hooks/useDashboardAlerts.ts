/**
 * Hook que agrega alertas de varias fontes para a tela principal.
 *
 * Define um tipo comum `DashboardAlert` e retorna uma lista ordenada
 * por urgencia (menos tempo restante primeiro). Zero side effects,
 * puramente derivado dos dados passados por parametro.
 *
 * Definido no upgrade 05. Consumido pelo `AlertsWidget`.
 */

import { useMemo } from 'react'
import type { Bill, CalendarEvent, Card, Habit, HabitEntry } from '../types'
import { expandCalendarEvents, getTodayISO } from '../utils'

export type DashboardAlertKind =
  | 'overdue-card'
  | 'upcoming-event'
  | 'due-bill'
  | 'missed-habit'

export interface DashboardAlert {
  id: string
  kind: DashboardAlertKind
  title: string
  subtitle: string
  /** Minutos ate o deadline. Negativo = ja passou. Usado para ordenacao. */
  minutesRemaining: number
  /** Id do item de origem — para navegacao ao clicar. */
  sourceId: string
}

interface UseDashboardAlertsOptions {
  cards: Card[]
  calendarEvents: CalendarEvent[]
  bills: Bill[]
  habits: Habit[]
  habitEntries: HabitEntry[]
  /** Janela (min) para considerar um evento "proximo". Default: 60. */
  upcomingWindowMinutes?: number
}

function timeToMinutes(time: string | null): number | null {
  if (!time) return null
  const [h, m] = time.split(':').map(Number)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null
  return h * 60 + m
}

function currentMinutesSinceMidnight(now: Date): number {
  return now.getHours() * 60 + now.getMinutes()
}

function formatRelative(minutes: number): string {
  const abs = Math.abs(minutes)
  const sign = minutes < 0 ? 'ha ' : 'em '
  if (abs < 60) return `${sign}${abs}min`
  const h = Math.floor(abs / 60)
  const m = abs % 60
  return m === 0 ? `${sign}${h}h` : `${sign}${h}h${m}m`
}

/**
 * Cards P1/P2 com data anterior a hoje e status diferente de done.
 */
export function getOverdueCards(cards: Card[], todayISO: string): DashboardAlert[] {
  return cards
    .filter(
      (c): c is Card & { date: string } =>
        c.hasDate &&
        c.date != null &&
        c.date < todayISO &&
        c.status !== 'done' &&
        (c.priority === 'P1' || c.priority === 'P2'),
    )
    .map((c) => {
      const diffDays = Math.floor(
        (new Date(todayISO + 'T00:00:00').getTime() -
          new Date(c.date + 'T00:00:00').getTime()) /
          86_400_000,
      )
      return {
        id: `overdue-card-${c.id}`,
        kind: 'overdue-card' as const,
        title: c.title,
        subtitle: `${c.priority} atrasado ${diffDays}d`,
        minutesRemaining: -diffDays * 1440,
        sourceId: c.id,
      }
    })
}

/**
 * Eventos dentro da janela de `upcomingWindowMinutes` minutos a partir de agora.
 * Usa expansao de recorrencias.
 */
export function getUpcomingEvents(
  calendarEvents: CalendarEvent[],
  todayISO: string,
  now: Date,
  windowMinutes: number,
): DashboardAlert[] {
  const expanded = expandCalendarEvents(calendarEvents, todayISO, todayISO)
  const nowMin = currentMinutesSinceMidnight(now)

  return expanded
    .map((e) => {
      const startMin = timeToMinutes(e.time)
      if (startMin == null) return null
      const delta = startMin - nowMin
      if (delta < 0 || delta > windowMinutes) return null
      return {
        id: `upcoming-event-${e.id}`,
        kind: 'upcoming-event' as const,
        title: e.title,
        subtitle: `${e.time} — ${formatRelative(delta)}`,
        minutesRemaining: delta,
        sourceId:
          (e as CalendarEvent & { sourceId?: string }).sourceId ?? e.id,
      }
    })
    .filter((a): a is NonNullable<typeof a> => a !== null) as DashboardAlert[]
}

/**
 * Contas com dueDay <= dia atual no mes corrente e nao pagas.
 */
export function getDueBills(bills: Bill[], now: Date): DashboardAlert[] {
  const today = now.getDate()
  return bills
    .filter((b) => !b.isPaid && b.dueDay <= today + 3)
    .map((b) => {
      const daysDiff = b.dueDay - today
      const subtitle =
        daysDiff < 0
          ? `vencida ha ${Math.abs(daysDiff)}d`
          : daysDiff === 0
            ? 'vence hoje'
            : `vence em ${daysDiff}d`
      return {
        id: `due-bill-${b.id}`,
        kind: 'due-bill' as const,
        title: b.name,
        subtitle: `R$ ${b.amount.toFixed(2)} — ${subtitle}`,
        minutesRemaining: daysDiff * 1440,
        sourceId: b.id,
      }
    })
}

/**
 * Habitos agendados para hoje e ainda nao marcados (nem skipped).
 */
export function getMissedHabits(
  habits: Habit[],
  entries: HabitEntry[],
  todayISO: string,
  now: Date,
): DashboardAlert[] {
  const dayOfWeek = now.getDay()
  const entriesToday = entries.filter((e) => e.date === todayISO)
  const hourMin = currentMinutesSinceMidnight(now)

  return habits
    .filter((h) => {
      if (h.frequency === 'weekly' && h.weekDays.length > 0) {
        return h.weekDays.includes(dayOfWeek)
      }
      return true
    })
    .filter((h) => {
      const entry = entriesToday.find((e) => e.habitId === h.id)
      if (!entry) return true
      if (entry.skipped) return false
      return entry.value < h.target
    })
    .filter(() => hourMin >= 12 * 60)
    .map((h) => ({
      id: `missed-habit-${h.id}`,
      kind: 'missed-habit' as const,
      title: h.name,
      subtitle: 'ainda nao marcado hoje',
      minutesRemaining: 0,
      sourceId: h.id,
    }))
}

export interface UseDashboardAlertsResult {
  alerts: DashboardAlert[]
  overdueCards: DashboardAlert[]
  upcomingEvents: DashboardAlert[]
  dueBills: DashboardAlert[]
  missedHabits: DashboardAlert[]
}

export function useDashboardAlerts(
  options: UseDashboardAlertsOptions,
): UseDashboardAlertsResult {
  const {
    cards,
    calendarEvents,
    bills,
    habits,
    habitEntries,
    upcomingWindowMinutes = 60,
  } = options

  return useMemo(() => {
    const now = new Date()
    const todayISO = getTodayISO()

    const overdueCards = getOverdueCards(cards, todayISO)
    const upcomingEvents = getUpcomingEvents(
      calendarEvents,
      todayISO,
      now,
      upcomingWindowMinutes,
    )
    const dueBills = getDueBills(bills, now)
    const missedHabits = getMissedHabits(habits, habitEntries, todayISO, now)

    const alerts = [
      ...overdueCards,
      ...upcomingEvents,
      ...dueBills,
      ...missedHabits,
    ].sort((a, b) => a.minutesRemaining - b.minutesRemaining)

    return { alerts, overdueCards, upcomingEvents, dueBills, missedHabits }
  }, [cards, calendarEvents, bills, habits, habitEntries, upcomingWindowMinutes])
}
