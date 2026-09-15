/**
 * Hook unificado de Drag-and-Drop do Planner.
 *
 * Encapsula:
 * - SmartPointerSensor (ignora data-no-dnd)
 * - useSensors
 * - collisionDetection em cascata (sprint-col > hourly-slot > rect > center)
 * - Estado activeCard + overTargetId (para feedback visual)
 * - onDragStart / onDragOver / onDragEnd que despacham para handlers puros
 *
 * Definido no upgrade 01.
 */

import { useCallback, useState } from 'react'
import {
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin,
  rectIntersection,
  closestCenter,
} from '@dnd-kit/core'
import type {
  CollisionDetection,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensorOptions,
} from '@dnd-kit/core'
import type React from 'react'
import type { Card, Day, Period, PlannerPreferences } from '@types'
import { parseDndId, isHourlySlotId, isSprintColId, isCardId } from './dndIds'
import { dropOnSprintColumn } from './handlers/dropOnSprintColumn'
import { dropOnBacklog } from './handlers/dropOnBacklog'
import { dropOnHourlySlot } from './handlers/dropOnHourlySlot'

// Sensor que ignora elementos com data-no-dnd (handles de resize, etc)
class SmartPointerSensor extends PointerSensor {
  static activators = [
    {
      eventName: 'onPointerDown' as const,
      handler: (
        { nativeEvent: event }: React.PointerEvent,
        _opts: PointerSensorOptions,
      ): boolean => {
        if (!event.isPrimary) return false
        if ((event.target as Element).closest('[data-no-dnd]')) return false
        return true
      },
    },
  ]
}

interface UsePlannerDndOptions {
  cards: Card[]
  weekDates: Record<Day, string>
  prefs: PlannerPreferences
  onMoveCard: (
    cardId: string,
    newLocation: { day: Day | null; period: Period | null },
    newIndex: number,
    displayedWeekDates?: Record<Day, string>,
  ) => void
  onReorderCard: (
    day: Day | null,
    period: Period | null,
    orderedIds: string[],
  ) => void
  onEditCard: (cardId: string, updates: Partial<Card>) => void
  /** Opcional: callback para mostrar toast quando handler retorna reject */
  onReject?: (reason: string) => void
}

export interface UsePlannerDndResult {
  contextProps: {
    sensors: ReturnType<typeof useSensors>
    collisionDetection: CollisionDetection
    onDragStart: (event: DragStartEvent) => void
    onDragOver: (event: DragOverEvent) => void
    onDragEnd: (event: DragEndEvent) => void
  }
  activeCard: Card | null
  overTargetId: string | null
}

export function usePlannerDnd(options: UsePlannerDndOptions): UsePlannerDndResult {
  const { cards, weekDates, prefs, onMoveCard, onReorderCard, onEditCard, onReject } = options

  const sensors = useSensors(
    useSensor(SmartPointerSensor, { activationConstraint: { distance: 5 } }),
  )

  const [activeCard, setActiveCard] = useState<Card | null>(null)
  const [overTargetId, setOverTargetId] = useState<string | null>(null)

  // Collision detection em cascata: prioriza targets pequenos (slots) e
  // depois alvos maiores (colunas), com fallback geometrico no final.
  const collisionDetection = useCallback<CollisionDetection>((args) => {
    const pointerHits = pointerWithin(args)
    if (pointerHits.length > 0) {
      // 1. Slots horarios tem prioridade (alvos pequenos)
      const slotHit = pointerHits.find((h) => isHourlySlotId(h.id as string))
      if (slotHit) return [slotHit]
      // 2. Colunas do sprint board (alvos medios)
      const colHit = pointerHits.find((h) => isSprintColId(h.id as string))
      if (colHit) return [colHit]
      // 3. Card individual (para reorder)
      const cardHit = pointerHits.find((h) => isCardId(h.id as string))
      if (cardHit) return [cardHit]
      // 4. Qualquer hit
      return [pointerHits[0]]
    }
    const rectHits = rectIntersection(args)
    if (rectHits.length > 0) return rectHits
    return closestCenter(args)
  }, [])

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const id = event.active.id as string
      // active.id pode ser cardId ou prefixed (card:uuid) — extrai
      const cardId = id.startsWith('card:') ? id.slice('card:'.length) : id
      const card = cards.find((c) => c.id === cardId)
      if (card?.isLocked) {
        // Locked nao bloqueia o drag inteiro porque pode ser reorder
        // dentro do mesmo dia. O handler que rejeita movimentos para
        // outro dia.
      }
      if (card) setActiveCard(card)
    },
    [cards],
  )

  const handleDragOver = useCallback((event: DragOverEvent) => {
    setOverTargetId((event.over?.id as string) ?? null)
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      setActiveCard(null)
      setOverTargetId(null)
      if (!over) return

      const activeId = active.id as string
      const cardId = activeId.startsWith('card:')
        ? activeId.slice('card:'.length)
        : activeId

      const overId = over.id as string
      const target = parseDndId(overId)

      if (!target) return

      switch (target.kind) {
        case 'backlog': {
          const result = dropOnBacklog({ cardId, cards })
          if (result.kind === 'reject') {
            onReject?.(result.reason)
          } else if (result.kind === 'move') {
            onMoveCard(result.cardId, result.newLocation, result.newIndex)
          }
          break
        }

        case 'sprint-col': {
          const result = dropOnSprintColumn({
            cardId,
            targetDay: target.day,
            cards,
            weekDates,
          })
          if (result.kind === 'reject') {
            onReject?.(result.reason)
          } else if (result.kind === 'move') {
            onMoveCard(result.cardId, result.newLocation, result.newIndex, result.weekDates)
          }
          break
        }

        case 'hourly-slot': {
          const result = dropOnHourlySlot({
            cardId,
            targetDay: target.day,
            minutes: target.minutes,
            cards,
            weekDates,
            prefs,
          })
          if (result.kind === 'reject') {
            onReject?.(result.reason)
          } else if (result.kind === 'move-and-edit') {
            onMoveCard(result.cardId, result.newLocation, result.newIndex, result.weekDates)
            onEditCard(result.cardId, result.edits)
          } else if (result.kind === 'edit-only') {
            onEditCard(result.cardId, result.edits)
          }
          break
        }

        case 'card': {
          const overCard = cards.find((c) => c.id === target.cardId)
          if (!overCard) return
          const activeCardObj = cards.find((c) => c.id === cardId)
          if (!activeCardObj) return

          const isSameCell =
            activeCardObj.location.day === overCard.location.day &&
            activeCardObj.location.period === overCard.location.period

          const cellCards = cards
            .filter(
              (c) =>
                c.location.day === overCard.location.day &&
                c.location.period === overCard.location.period,
            )
            .sort((a, b) => a.order - b.order)

          if (isSameCell) {
            const oldIndex = cellCards.findIndex((c) => c.id === cardId)
            const newIndex = cellCards.findIndex((c) => c.id === target.cardId)
            if (oldIndex === -1 || newIndex === -1) return

            const next = [...cellCards]
            const [moved] = next.splice(oldIndex, 1)
            next.splice(newIndex, 0, moved)
            onReorderCard(
              overCard.location.day,
              overCard.location.period,
              next.map((c) => c.id),
            )
          } else {
            // Mover para celula diferente na posicao exata do card alvo
            const targetIndex = cellCards.findIndex((c) => c.id === target.cardId)
            const newIndex = targetIndex >= 0 ? targetIndex : cellCards.length

            onMoveCard(
              cardId,
              { day: overCard.location.day, period: overCard.location.period },
              newIndex,
              weekDates,
            )
          }
          break
        }

        default:
          break
      }
    },
    [cards, weekDates, prefs, onMoveCard, onReorderCard, onEditCard, onReject],
  )

  return {
    contextProps: {
      sensors,
      collisionDetection,
      onDragStart: handleDragStart,
      onDragOver: handleDragOver,
      onDragEnd: handleDragEnd,
    },
    activeCard,
    overTargetId,
  }
}
