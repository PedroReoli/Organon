import { useCallback, useEffect, useRef, useState } from 'react'
import type { CardReminderItem } from '@types'
import { soundSynthesizer } from '../../../services/audio/SoundSynthesizer'
import type { PlanningTask } from '../types/planning.types'

export interface ActivePlanningReminder {
  task: PlanningTask
  reminder: CardReminderItem
  firedAt: string
}

interface UsePlanningRemindersOptions {
  tasks: PlanningTask[]
  onUpdateTask: (id: string, updates: Partial<PlanningTask>) => void
  volume?: number
}

const includesSound = (channel: CardReminderItem['channel']) => channel === 'all' || channel === 'sound-only'
const includesToast = (channel: CardReminderItem['channel']) => channel === 'all' || channel === 'toast-only'
const includesBanner = (channel: CardReminderItem['channel']) => channel === 'all' || channel === 'banner-only'

export const usePlanningReminders = ({ tasks, onUpdateTask, volume = 0.65 }: UsePlanningRemindersOptions) => {
  const firedKeysRef = useRef<Set<string>>(new Set())
  const [activeAlert, setActiveAlert] = useState<ActivePlanningReminder | null>(null)

  useEffect(() => {
    soundSynthesizer.setVolume(volume)
  }, [volume])

  useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      void Notification.requestPermission().catch(() => undefined)
    }
  }, [])

  const replaceReminder = useCallback((task: PlanningTask, reminderId: string, next: CardReminderItem) => {
    onUpdateTask(task.id, {
      reminders: (task.reminders || []).map((reminder) => reminder.id === reminderId ? next : reminder),
    })
  }, [onUpdateTask])

  const tick = useCallback(() => {
    const now = Date.now()
    for (const task of tasks) {
      if (task.status === 'done' || task.status === 'cancelled') continue
      let changed = false
      const nextReminders = (task.reminders || []).map((reminder) => {
        if (reminder.hasFired && !reminder.repeatEveryMinutes) return reminder
        const effectiveAt = reminder.snoozedUntil || reminder.triggerAt
        const triggerAt = new Date(effectiveAt).getTime()
        if (!Number.isFinite(triggerAt) || triggerAt > now) return reminder
        const fireKey = `${task.id}:${reminder.id}:${effectiveAt}`
        if (firedKeysRef.current.has(fireKey)) return reminder
        firedKeysRef.current.add(fireKey)
        changed = true

        if (includesSound(reminder.channel)) soundSynthesizer.play(reminder.sound)
        if (includesToast(reminder.channel) && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          try {
            const notification = new Notification(`Organon · ${task.title}`, {
              body: reminder.label || 'Lembrete de tarefa. Abra o Organon para concluir ou adiar por 10 minutos.',
              requireInteraction: true,
              icon: '/assets/favicon.png',
            })
            notification.onclick = () => window.focus()
          } catch (error) {
            console.warn('[Planning reminders] Falha ao criar toast nativo:', error)
          }
        }
        if (includesBanner(reminder.channel)) {
          setActiveAlert({ task, reminder, firedAt: new Date(now).toISOString() })
        }

        if (reminder.repeatEveryMinutes) {
          return {
            ...reminder,
            triggerAt: new Date(now + reminder.repeatEveryMinutes * 60_000).toISOString(),
            snoozedUntil: null,
            hasFired: false,
          }
        }
        return { ...reminder, snoozedUntil: null, hasFired: true }
      })
      if (changed) onUpdateTask(task.id, { reminders: nextReminders })
    }
  }, [onUpdateTask, tasks])

  useEffect(() => {
    tick()
    const timerId = window.setInterval(tick, 5000)
    return () => window.clearInterval(timerId)
  }, [tick])

  const dismissAlert = useCallback(() => setActiveAlert(null), [])

  const snoozeAlert = useCallback((minutes = 10) => {
    if (!activeAlert) return
    replaceReminder(activeAlert.task, activeAlert.reminder.id, {
      ...activeAlert.reminder,
      snoozedUntil: new Date(Date.now() + minutes * 60_000).toISOString(),
      hasFired: false,
    })
    setActiveAlert(null)
  }, [activeAlert, replaceReminder])

  const completeAlertTask = useCallback(() => {
    if (!activeAlert) return
    onUpdateTask(activeAlert.task.id, {
      status: 'done',
      completedAt: new Date().toISOString(),
      reminders: (activeAlert.task.reminders || []).map((reminder) => ({ ...reminder, hasFired: true, snoozedUntil: null })),
    })
    setActiveAlert(null)
  }, [activeAlert, onUpdateTask])

  return { activeAlert, dismissAlert, snoozeAlert, completeAlertTask }
}
