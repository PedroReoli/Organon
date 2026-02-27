import { getDb } from '../schema'
import type { Card, ChecklistItem, CardLocation } from '../../types'

interface CardRow {
  id: string; title: string; description_html: string
  location_day: string | null; location_period: string | null
  ord: number; date: string | null; time: string | null
  has_date: number; priority: string | null; status: string
  checklist: string; project_id: string | null
  created_at: string; updated_at: string
}

function rowToCard(row: CardRow): Card {
  return {
    id: row.id,
    title: row.title,
    descriptionHtml: row.description_html,
    location: { day: row.location_day as Card['location']['day'], period: row.location_period as Card['location']['period'] },
    order: row.ord,
    date: row.date,
    time: row.time,
    hasDate: row.has_date === 1,
    priority: row.priority as Card['priority'],
    status: row.status as Card['status'],
    checklist: JSON.parse(row.checklist || '[]') as ChecklistItem[],
    projectId: row.project_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function getAllCards(): Card[] {
  const db = getDb()
  const rows = db.getAllSync<CardRow>('SELECT * FROM cards ORDER BY ord ASC')
  return rows.map(rowToCard)
}

export function upsertCard(card: Card): void {
  const db = getDb()
  db.runSync(
    `INSERT OR REPLACE INTO cards
      (id, title, description_html, location_day, location_period, ord, date, time, has_date, priority, status, checklist, project_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      card.id, card.title, card.descriptionHtml,
      card.location.day, card.location.period,
      card.order, card.date, card.time,
      card.hasDate ? 1 : 0, card.priority, card.status,
      JSON.stringify(card.checklist), card.projectId,
      card.createdAt, card.updatedAt,
    ]
  )
}

export function deleteCard(id: string): void {
  getDb().runSync('DELETE FROM cards WHERE id = ?', [id])
}

export function getCardsByLocation(day: string | null, period: string | null): Card[] {
  const db = getDb()
  if (!day || !period) {
    const rows = db.getAllSync<CardRow>('SELECT * FROM cards WHERE location_day IS NULL ORDER BY ord ASC')
    return rows.map(rowToCard)
  }
  const rows = db.getAllSync<CardRow>(
    'SELECT * FROM cards WHERE location_day = ? AND location_period = ? ORDER BY ord ASC',
    [day, period]
  )
  return rows.map(rowToCard)
}

export function getCardsForDate(date: string): Card[] {
  const db = getDb()
  const rows = db.getAllSync<CardRow>('SELECT * FROM cards WHERE date = ? ORDER BY ord ASC', [date])
  return rows.map(rowToCard)
}
