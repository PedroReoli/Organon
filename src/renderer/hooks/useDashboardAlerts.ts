/**
 * Hook que agrega alertas de varias fontes para a tela principal.
 *
 * Define um tipo comum `DashboardAlert` e retorna uma lista ordenada
 * por urgencia (menos tempo restante primeiro). Zero side effects,
 * puramente derivado dos dados passados por parametro.
 */

import { useMemo } from 'react'
import type { Bill, CalendarEvent, Card } from '../types'
import { expandCalendarEvents, getTodayISO } from '../utils'

export type DashboardAlertKind =
  | 'overdue-card'
  | 'upcoming-event'
  | 'due-bill'

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
  /** Janela (min) para considerar um evento "proximo". Default: 60. */
  upcomingWindowMinutes?: number
}

function timeToMinutes(time: string | null): number | null {
  if (!time) return null
  const [h, m] = time.split(':').map(Number)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null
  return h * 60 + m
}

function formatRelative(minutes: number): string {
  const abs = Math.abs(minutes)
  const sign = minutes < 0 ? 'ha ' : 'em '
  if (abs < 60) return `${sign}${abs}min`
  const h = Math.floor(abs / 60)
  const m = abs % 60
  return m === 0 ? `${sign}${h}h` : `${sign}${h}h${m}m`
}

export function getOverdueCards(cards: Card[], todayISO: string): DashboardAlert[] {
  return cards
    .filter((c) => c.status !== 'done' && c.date && c.date < todayISO)
    .map((c) => {
      const daysOverdue = Math.max(
        1,
        Math.floor(
          (new Date(todayISO).getTime() - new Date(c.date!).getTime()) /
            (1000 * 60 * 60 * 24),
        ),
      )
      return {
        id: `overdue-card-${c.id}`,
        kind: 'overdue-card' as const,
        title: c.title,
        subtitle: `atrasado ha ${daysOverdue}d (${c.date})`,
        minutesRemaining: -daysOverdue * 1440,
        sourceId: c.id,
      }
    })
}

export function getUpcomingEvents(
  events: CalendarEvent[],
  todayISO: string,
  now: Date,
  windowMinutes: number,
): DashboardAlert[] {
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const expanded = expandCalendarEvents(events, todayISO, todayISO)

  return expanded
    .filter((e) => e.date === todayISO && e.time)
    .map((e) => {
      const eventMinutes = timeToMinutes(e.time)!
      const diff = eventMinutes - currentMinutes
      return { event: e, diff }
    })
    .filter(({ diff }) => diff >= -15 && diff <= windowMinutes)
    .map(({ event: e, diff }) => ({
      id: `upcoming-event-${e.id}-${e.date}`,
      kind: 'upcoming-event' as const,
      title: e.title,
      subtitle: `${e.time} (${formatRelative(diff)})`,
      minutesRemaining: diff,
      sourceId: e.id,
    }))
}

export function getDueBills(bills: Bill[], now: Date): DashboardAlert[] {
  const currentDay = now.getDate()
  return bills
    .filter((b) => !b.isPaid)
    .map((b) => {
      const daysDiff = b.dueDay - currentDay
      return { bill: b, daysDiff }
    })
    .filter(({ daysDiff }) => daysDiff >= -3 && daysDiff <= 3)
    .map(({ bill: b, daysDiff }) => {
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

export interface UseDashboardAlertsResult {
  alerts: DashboardAlert[]
  overdueCards: DashboardAlert[]
  upcomingEvents: DashboardAlert[]
  dueBills: DashboardAlert[]
}

export function useDashboardAlerts(
  options: UseDashboardAlertsOptions,
): UseDashboardAlertsResult {
  const {
    cards,
    calendarEvents,
    bills,
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

    const alerts = [
      ...overdueCards,
      ...upcomingEvents,
      ...dueBills,
    ].sort((a, b) => a.minutesRemaining - b.minutesRemaining)

    return { alerts, overdueCards, upcomingEvents, dueBills }
  }, [cards, calendarEvents, bills, upcomingWindowMinutes])
}
