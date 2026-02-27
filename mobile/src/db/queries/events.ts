import { getDb } from '../schema'
import type { CalendarEvent } from '../../types'

interface EventRow {
  id: string; title: string; date: string; time: string | null
  recurrence: string | null; reminder: string | null
  description: string; color: string
  created_at: string; updated_at: string
}

function rowToEvent(row: EventRow): CalendarEvent {
  return {
    id: row.id, title: row.title, date: row.date, time: row.time,
    recurrence: row.recurrence ? JSON.parse(row.recurrence) : null,
    reminder: row.reminder ? JSON.parse(row.reminder) : null,
    description: row.description, color: row.color,
    createdAt: row.created_at, updatedAt: row.updated_at,
  }
}

export function getAllEvents(): CalendarEvent[] {
  const rows = getDb().getAllSync<EventRow>('SELECT * FROM calendar_events ORDER BY date ASC')
  return rows.map(rowToEvent)
}

export function getEventsForDate(date: string): CalendarEvent[] {
  const rows = getDb().getAllSync<EventRow>(
    'SELECT * FROM calendar_events WHERE date = ? ORDER BY time ASC',
    [date]
  )
  return rows.map(rowToEvent)
}

export function upsertEvent(event: CalendarEvent): void {
  getDb().runSync(
    `INSERT OR REPLACE INTO calendar_events
      (id, title, date, time, recurrence, reminder, description, color, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      event.id, event.title, event.date, event.time,
      event.recurrence ? JSON.stringify(event.recurrence) : null,
      event.reminder ? JSON.stringify(event.reminder) : null,
      event.description, event.color, event.createdAt, event.updatedAt,
    ]
  )
}

export function deleteEvent(id: string): void {
  getDb().runSync('DELETE FROM calendar_events WHERE id = ?', [id])
}
