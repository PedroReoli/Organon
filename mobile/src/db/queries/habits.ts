import { getDb } from '../schema'
import type { Habit, HabitEntry } from '../../types'

export function getAllHabits(): Habit[] {
  return getDb().getAllSync<{
    id: string; name: string; type: string; target: number
    frequency: string; weekly_target: number; week_days: string
    trigger: string; reason: string; minimum_target: number
    color: string; ord: number; created_at: string
  }>('SELECT * FROM habits ORDER BY ord ASC').map(r => ({
    id: r.id, name: r.name, type: r.type as Habit['type'],
    target: r.target, frequency: r.frequency as Habit['frequency'],
    weeklyTarget: r.weekly_target,
    weekDays: JSON.parse(r.week_days || '[]') as number[],
    trigger: r.trigger, reason: r.reason,
    minimumTarget: r.minimum_target, color: r.color,
    order: r.ord, createdAt: r.created_at,
  }))
}

export function upsertHabit(habit: Habit): void {
  getDb().runSync(
    `INSERT OR REPLACE INTO habits
      (id, name, type, target, frequency, weekly_target, week_days, trigger, reason, minimum_target, color, ord, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      habit.id, habit.name, habit.type, habit.target,
      habit.frequency, habit.weeklyTarget, JSON.stringify(habit.weekDays),
      habit.trigger, habit.reason, habit.minimumTarget,
      habit.color, habit.order, habit.createdAt,
    ]
  )
}

export function deleteHabit(id: string): void {
  getDb().runSync('DELETE FROM habits WHERE id = ?', [id])
  getDb().runSync('DELETE FROM habit_entries WHERE habit_id = ?', [id])
}

export function getAllHabitEntries(): HabitEntry[] {
  return getDb().getAllSync<{
    id: string; habit_id: string; date: string
    value: number; skipped: number; skip_reason: string
  }>('SELECT * FROM habit_entries').map(r => ({
    id: r.id, habitId: r.habit_id, date: r.date,
    value: r.value, skipped: r.skipped === 1, skipReason: r.skip_reason,
  }))
}

export function upsertHabitEntry(entry: HabitEntry): void {
  getDb().runSync(
    `INSERT OR REPLACE INTO habit_entries (id, habit_id, date, value, skipped, skip_reason)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [entry.id, entry.habitId, entry.date, entry.value, entry.skipped ? 1 : 0, entry.skipReason]
  )
}

export function getHabitEntriesForDate(date: string): HabitEntry[] {
  return getDb().getAllSync<{
    id: string; habit_id: string; date: string
    value: number; skipped: number; skip_reason: string
  }>('SELECT * FROM habit_entries WHERE date = ?', [date]).map(r => ({
    id: r.id, habitId: r.habit_id, date: r.date,
    value: r.value, skipped: r.skipped === 1, skipReason: r.skip_reason,
  }))
}
