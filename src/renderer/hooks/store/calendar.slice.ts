/**
 * Calendar slice — funcoes puras de mutacao de calendar events.
 *
 * Definido no upgrade 07 sub-A. Ver hooks/store/README.md.
 */

import type { CalendarEvent, Store } from '../../types'
import { generateId } from '../../utils'

export function calendarAddEvent(
  prev: Store,
  input: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>,
): Store {
  const now = new Date().toISOString()
  const newEvent: CalendarEvent = {
    ...input,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  }
  return {
    ...prev,
    calendarEvents: [...prev.calendarEvents, newEvent],
  }
}

export function calendarUpdateEvent(
  prev: Store,
  eventId: string,
  updates: Partial<Omit<CalendarEvent, 'id' | 'createdAt'>>,
): Store {
  const now = new Date().toISOString()
  return {
    ...prev,
    calendarEvents: prev.calendarEvents.map((event) =>
      event.id === eventId ? { ...event, ...updates, updatedAt: now } : event,
    ),
  }
}

export function calendarRemoveEvent(prev: Store, eventId: string): Store {
  return {
    ...prev,
    calendarEvents: prev.calendarEvents.filter((event) => event.id !== eventId),
    pendingDeletes: [
      ...(prev.pendingDeletes ?? []),
      { resource: 'calendar_events', id: eventId },
    ],
  }
}
