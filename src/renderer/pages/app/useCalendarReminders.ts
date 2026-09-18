import { useEffect, useRef } from 'react'
import type { CalendarEvent } from '@types'
import { expandCalendarEvents } from '@utils'

interface UseCalendarRemindersOptions {
  calendarEvents: CalendarEvent[]
}

export function useCalendarReminders({ calendarEvents }: UseCalendarRemindersOptions) {
  const reminderFiredRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (calendarEvents.length === 0) return

    const toISODate = (d: Date) => {
      const yyyy = d.getFullYear()
      const mm = String(d.getMonth() + 1).padStart(2, '0')
      const dd = String(d.getDate()).padStart(2, '0')
      return `${yyyy}-${mm}-${dd}`
    }
    const addDays = (iso: string, days: number) => {
      const d = new Date(iso + 'T00:00:00')
      d.setDate(d.getDate() + days)
      return toISODate(d)
    }
    const fire = (title: string, body: string) => {
      try {
        new Notification(title, { body })
      } catch {
        /* ignore */
      }
    }
    const tick = () => {
      const now = new Date()
      const nowMs = now.getTime()
      const windowMs = 60 * 1000
      const startISO = toISODate(now)
      const endISO = addDays(startISO, 2)
      const upcoming = expandCalendarEvents(calendarEvents, startISO, endISO)

      for (const ev of upcoming) {
        if (!ev.reminder?.enabled || !ev.time) continue
        const dt = new Date(`${ev.date}T${ev.time}:00`)
        const reminderAt = dt.getTime() - (ev.reminder.offsetMinutes || 0) * 60 * 1000
        const key = `${(ev as { sourceId?: string }).sourceId ?? ev.id}|${ev.date}|${ev.time}|${ev.reminder.offsetMinutes}`
        if (reminderAt <= nowMs && reminderAt > nowMs - windowMs) {
          if (reminderFiredRef.current.has(key)) continue
          reminderFiredRef.current.add(key)
          const when =
            ev.reminder.offsetMinutes === 0
              ? 'Agora'
              : ev.reminder.offsetMinutes === 60
              ? 'Em 1 hora'
              : ev.reminder.offsetMinutes === 120
              ? 'Em 2 horas'
              : ev.reminder.offsetMinutes === 1440
              ? 'Em 1 dia'
              : `Em ${ev.reminder.offsetMinutes} min`
          fire(`Lembrete: ${ev.title}`, `${when} • ${ev.date} ${ev.time}`)
        }
      }
    }

    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      void Notification.requestPermission().catch(() => {})
    }
    tick()
    const id = window.setInterval(tick, 30_000)
    return () => window.clearInterval(id)
  }, [calendarEvents])
}
