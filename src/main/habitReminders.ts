import { Notification } from 'electron'
import { loadStore } from './store'
import type { Habit } from './types'

let reminderInterval: ReturnType<typeof setInterval> | null = null
let lastDailyReminderDate: string | null = null

function getTodayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function getCurrentHHMM(): string {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

function isHabitScheduledToday(habit: Habit): boolean {
  if (habit.frequency === 'daily') return true
  if (habit.weekDays.length === 0) return true
  const dow = new Date().getDay()
  return habit.weekDays.includes(dow)
}

function isHabitPaused(habit: Habit, today: string): boolean {
  if (!habit.pausedUntil) return false
  return today <= habit.pausedUntil
}

function checkReminders(): void {
  const store = loadStore()
  if (!store) return

  const today = getTodayISO()
  const currentTime = getCurrentHHMM()
  const habits = store.habits ?? []
  const entries = store.habitEntries ?? []
  const settings = store.settings as unknown as Record<string, unknown> | undefined

  for (const habit of habits) {
    if (habit.isArchived) continue
    if (isHabitPaused(habit, today)) continue
    if (!isHabitScheduledToday(habit)) continue
    if (!habit.reminderEnabled || !habit.reminderTime) continue
    if (habit.reminderTime !== currentTime) continue

    const entry = entries.find(e => e.habitId === habit.id && e.date === today)
    const isDone = entry && !entry.skipped && entry.value >= habit.target
    if (isDone) continue

    new Notification({
      title: 'Hora do habito',
      body: habit.name,
    }).show()
  }

  const dailyEnabled = settings?.habitDailyReminderEnabled as boolean | undefined
  const dailyTime = settings?.habitDailyReminderTime as string | undefined

  if (dailyEnabled && dailyTime && dailyTime === currentTime && lastDailyReminderDate !== today) {
    lastDailyReminderDate = today
    const pending = habits.filter(h => {
      if (h.isArchived) return false
      if (isHabitPaused(h, today)) return false
      if (!isHabitScheduledToday(h)) return false
      const entry = entries.find(e => e.habitId === h.id && e.date === today)
      if (entry && !entry.skipped && entry.value >= h.target) return false
      return true
    })

    if (pending.length > 0) {
      new Notification({
        title: 'Habitos pendentes',
        body: `Voce tem ${pending.length} habito${pending.length > 1 ? 's' : ''} pendente${pending.length > 1 ? 's' : ''} hoje.`,
      }).show()
    }
  }
}

export function startHabitReminders(): void {
  if (reminderInterval) return
  reminderInterval = setInterval(checkReminders, 60_000)
}

export function stopHabitReminders(): void {
  if (reminderInterval) {
    clearInterval(reminderInterval)
    reminderInterval = null
  }
}
