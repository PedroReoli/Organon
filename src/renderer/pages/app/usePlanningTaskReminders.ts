import { useEffect, useRef, useState, useCallback } from 'react'
import type { Card, CardReminder } from '@types'
import { playSound } from '../../utils/audioAlert'

export interface ActiveTaskAlarm {
  card: Card
  reminder: CardReminder
  firedAt: string
  fireCount: number
}

interface UsePlanningTaskRemindersOptions {
  cards: Card[]
  onUpdateCard: (id: string, updates: Partial<Card>) => void
}

export function usePlanningTaskReminders({ cards, onUpdateCard }: UsePlanningTaskRemindersOptions) {
  const [activeAlarm, setActiveAlarm] = useState<ActiveTaskAlarm | null>(null)
  const firedKeysRef = useRef<Set<string>>(new Set())

  // Solicitar permissão de notificação do Windows
  useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      void Notification.requestPermission().catch(() => {})
    }
  }, [])

  const tick = useCallback(() => {
    if (!cards || cards.length === 0) return

    const now = new Date()
    const nowMs = now.getTime()
    const nowISO = now.toISOString()

    for (const card of cards) {
      // Ignora tarefas concluídas ou canceladas
      if (card.status === 'done' || card.status === 'cancelled') continue

      const reminder = card.reminder
      if (!reminder || !reminder.enabled) continue

      // Se já disparou e não for repetitivo
      if (reminder.hasFired && !reminder.repeatUntilDone && reminder.mode !== 'interval') continue

      // Calcular timestamp alvo
      let triggerMs: number | null = null

      if (reminder.snoozedUntil) {
        triggerMs = new Date(reminder.snoozedUntil).getTime()
      } else if (reminder.triggerAt) {
        triggerMs = new Date(reminder.triggerAt).getTime()
      } else if (reminder.mode === 'before' && card.time) {
        const targetDate = card.date || nowISO.slice(0, 10)
        const eventDt = new Date(`${targetDate}T${card.time}:00`)
        triggerMs = eventDt.getTime() - (reminder.offsetMinutes || 0) * 60 * 1000
      }

      if (!triggerMs || isNaN(triggerMs)) continue

      // Janela de disparo: se horário <= agora e ainda não foi disparado nesta chave de timestamp
      if (triggerMs <= nowMs) {
        const fireKey = `${card.id}_${triggerMs}`
        if (firedKeysRef.current.has(fireKey)) continue
        firedKeysRef.current.add(fireKey)

        const currentFireCount = (reminder.fireCount || 0) + 1

        // 1. Tocar som de áudio
        const soundToPlay = reminder.sound || 'bell'
        playSound(soundToPlay, 0.7)

        // 2. Notificação nativa do Windows (Toast OS)
        if (reminder.nativeToast !== false && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          try {
            const isRecurring = reminder.repeatUntilDone || reminder.mode === 'interval'
            const repeatTag = isRecurring ? ` (Repetindo a cada ${reminder.intervalMinutes || 10} min)` : ''
            const notif = new Notification(`⏰ Organon: ${card.title || 'Lembrete de Tarefa'}`, {
              body: `Prioridade: ${card.priority || 'Normal'} • ${card.time ? `Horário: ${card.time}` : 'Planejada'}${repeatTag}`,
              requireInteraction: reminder.alertType === 'alarm',
              icon: '/assets/favicon.png'
            })
            notif.onclick = () => {
              window.focus()
            }
          } catch (e) {
            console.warn('[Reminders] Falha ao emitir notificação nativa:', e)
          }
        }

        // 3. Ativar modal de alarme in-app
        setActiveAlarm({
          card,
          reminder,
          firedAt: nowISO,
          fireCount: currentFireCount
        })

        // 4. Atualizar estado do card no store
        if (reminder.repeatUntilDone || reminder.mode === 'interval') {
          const intervalMins = reminder.intervalMinutes || 10
          const nextTrigger = new Date(nowMs + intervalMins * 60 * 1000).toISOString()
          onUpdateCard(card.id, {
            reminder: {
              ...reminder,
              triggerAt: nextTrigger,
              snoozedUntil: null,
              fireCount: currentFireCount,
              hasFired: false
            }
          })
        } else {
          onUpdateCard(card.id, {
            reminder: {
              ...reminder,
              hasFired: true,
              fireCount: currentFireCount,
              snoozedUntil: null
            }
          })
        }
      }
    }
  }, [cards, onUpdateCard])

  useEffect(() => {
    tick()
    const timerId = window.setInterval(tick, 5000) // Avaliação rápida a cada 5s
    return () => window.clearInterval(timerId)
  }, [tick])

  const dismissAlarm = useCallback(() => {
    setActiveAlarm(null)
  }, [])

  const snoozeAlarm = useCallback((minutes: number) => {
    if (!activeAlarm) return
    const { card, reminder } = activeAlarm
    const now = Date.now()
    const snoozedUntil = new Date(now + minutes * 60 * 1000).toISOString()

    onUpdateCard(card.id, {
      reminder: {
        ...reminder,
        snoozedUntil,
        hasFired: false
      }
    })
    setActiveAlarm(null)
  }, [activeAlarm, onUpdateCard])

  const completeAlarmTask = useCallback(() => {
    if (!activeAlarm) return
    const { card, reminder } = activeAlarm

    onUpdateCard(card.id, {
      status: 'done',
      completedAt: new Date().toISOString(),
      reminder: reminder ? {
        ...reminder,
        enabled: false,
        hasFired: true
      } : null
    })
    setActiveAlarm(null)
  }, [activeAlarm, onUpdateCard])

  return {
    activeAlarm,
    dismissAlarm,
    snoozeAlarm,
    completeAlarmTask
  }
}
