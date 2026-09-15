/**
 * Hook isolado de resize manual de cards no modo horario.
 *
 * Extraido de PlannerView.tsx no upgrade 01. O resize permite
 * arrastar a borda inferior do card para mudar a duracao em
 * incrementos do plannerInterval.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type React from 'react'
import type { Card, PlannerPreferences } from '@types'

const HOURLY_SLOT_HEIGHT = 48

export interface ResizePreviewState {
  cardId: string
  durationMinutes: number
}

interface ResizeSession {
  cardId: string
  startY: number
  startDurationMinutes: number
  maxDurationMinutes: number
}

interface UsePlannerResizeOptions {
  prefs: PlannerPreferences
  onEditCard: (cardId: string, updates: Partial<Card>) => void
}

export interface UsePlannerResizeResult {
  resizePreview: ResizePreviewState | null
  handleResizePointerDown: (card: Card, event: React.PointerEvent<HTMLDivElement>) => void
  getCardDurationMinutes: (card: Card) => number | null
}

function timeToMinutes(time: string | null): number | null {
  if (!time) return null
  const [hours, minutes] = time.split(':').map(Number)
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null
  return hours * 60 + minutes
}

export function usePlannerResize(options: UsePlannerResizeOptions): UsePlannerResizeResult {
  const { prefs, onEditCard } = options

  const [resizePreview, setResizePreview] = useState<ResizePreviewState | null>(null)
  const resizeSessionRef = useRef<ResizeSession | null>(null)
  const resizeCleanupRef = useRef<(() => void) | null>(null)
  const resizePreviewRef = useRef<ResizePreviewState | null>(null)

  useEffect(() => {
    resizePreviewRef.current = resizePreview
  }, [resizePreview])

  useEffect(() => () => resizeCleanupRef.current?.(), [])

  const getCardDurationMinutes = useCallback(
    (card: Card): number | null => {
      if (resizePreview?.cardId === card.id) return resizePreview.durationMinutes
      return card.durationMinutes
    },
    [resizePreview],
  )

  const handleResizePointerDown = useCallback(
    (card: Card, event: React.PointerEvent<HTMLDivElement>) => {
      if (!card.time || card.isLocked) return

      const cardStartMinutes = timeToMinutes(card.time)
      if (cardStartMinutes == null) return

      const maxDurationMinutes = Math.max(
        prefs.plannerInterval,
        prefs.plannerEndHour * 60 - cardStartMinutes,
      )
      const initialDuration = Math.min(
        maxDurationMinutes,
        Math.max(
          prefs.plannerInterval,
          card.durationMinutes ?? prefs.plannerInterval,
        ),
      )

      resizeCleanupRef.current?.()

      const applyPreviewFromClientY = (clientY: number) => {
        const session = resizeSessionRef.current
        if (!session) return
        const deltaSlots = Math.round((clientY - session.startY) / HOURLY_SLOT_HEIGHT)
        const nextDuration = Math.min(
          session.maxDurationMinutes,
          Math.max(
            prefs.plannerInterval,
            session.startDurationMinutes + deltaSlots * prefs.plannerInterval,
          ),
        )
        setResizePreview({ cardId: session.cardId, durationMinutes: nextDuration })
      }

      const finishResize = (shouldPersist: boolean) => {
        const session = resizeSessionRef.current
        const preview = resizePreviewRef.current
        resizeSessionRef.current = null
        resizeCleanupRef.current?.()
        resizeCleanupRef.current = null

        if (!session || !preview || preview.cardId !== session.cardId) {
          setResizePreview(null)
          return
        }

        if (shouldPersist && preview.durationMinutes !== card.durationMinutes) {
          onEditCard(card.id, { durationMinutes: preview.durationMinutes })
        }
        setResizePreview(null)
      }

      const handlePointerMove = (e: PointerEvent) => {
        e.preventDefault()
        applyPreviewFromClientY(e.clientY)
      }
      const handlePointerUp = () => finishResize(true)
      const handlePointerCancel = () => finishResize(false)

      resizeSessionRef.current = {
        cardId: card.id,
        startY: event.clientY,
        startDurationMinutes: initialDuration,
        maxDurationMinutes,
      }
      setResizePreview({ cardId: card.id, durationMinutes: initialDuration })

      document.body.style.userSelect = 'none'
      document.body.style.cursor = 'ns-resize'

      window.addEventListener('pointermove', handlePointerMove)
      window.addEventListener('pointerup', handlePointerUp, { once: true })
      window.addEventListener('pointercancel', handlePointerCancel, { once: true })

      resizeCleanupRef.current = () => {
        window.removeEventListener('pointermove', handlePointerMove)
        window.removeEventListener('pointerup', handlePointerUp)
        window.removeEventListener('pointercancel', handlePointerCancel)
        document.body.style.userSelect = ''
        document.body.style.cursor = ''
      }
    },
    [onEditCard, prefs.plannerInterval, prefs.plannerEndHour],
  )

  return { resizePreview, handleResizePointerDown, getCardDurationMinutes }
}
