/**
 * HourlyView — vista horaria com toggle Semana/Dia.
 *
 * Cards posicionados por horario com duracao visual (spanam multiplos slots).
 * Resize via drag na borda inferior do card.
 * Colunas lado a lado para cards sobrepostos (padrao Google Calendar).
 * Modal de conflito ao soltar card em slot ja ocupado.
 * Backlog lateral proprio.
 */

import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react'
import {
  DndContext,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  pointerWithin,
  closestCenter,
  useSensor,
  useSensors,
  useDroppable,
  useDndContext,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core'
import type { CollisionDetection, Modifier, PointerSensorOptions } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { Card, CardLocation, Day, Period, Project, PlannerPreferences } from '@types'
import { DAYS_ORDER, DAY_LABELS } from '@types'
import { Button } from '@shared/components/primitives'
import { SprintCardItem } from '../sprint/SprintCardItem'
import { CompactCard } from '../../planner/CompactCard'
import { TimeSlotAxis } from '../../planner/TimeSlotAxis'
import { usePlannerResize } from '../dnd/usePlannerResize'

/** Sensor que ignora elementos com data-no-dnd (resize handle). */
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

const SLOT_HEIGHT = 48
const START_HOUR = 6
const END_HOUR = 23

const snapToCursor: Modifier = ({ activatorEvent, draggingNodeRect, transform }) => {
  if (!activatorEvent || !draggingNodeRect) return transform
  const evt = activatorEvent as PointerEvent | MouseEvent
  if (!('clientX' in evt)) return transform
  return {
    ...transform,
    x: evt.clientX - draggingNodeRect.left - draggingNodeRect.width / 2 + transform.x,
    y: evt.clientY - draggingNodeRect.top - draggingNodeRect.height / 2 + transform.y,
  }
}

interface HourlyViewProps {
  cards: Card[]
  projects?: Project[]
  weekOffset: number
  onPrevWeek: () => void
  onNextWeek: () => void
  onToday: () => void
  weekDates: Record<Day, string>
  prefs: PlannerPreferences
  onAddCard: (title: string, location: CardLocation, date: string | null, time?: string | null) => void
  onMoveCard: (cardId: string, location: CardLocation, date: string | null, time: string | null) => void
  onEditCard?: (cardId: string, updates: Partial<Card>) => void
  onOpenCard?: (card: Card) => void
}

function getPeriodFromHour(hour: number): Period {
  if (hour < 12) return 'morning'
  if (hour < 18) return 'afternoon'
  return 'night'
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

function minutesToTime(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/* ── Calculo de overlap (colunas lado a lado) ───────────────── */

interface LayoutEntry {
  card: Card
  startMin: number
  endMin: number
  col: number
  totalCols: number
}

function computeOverlapLayout(dayCards: Card[], interval: number): LayoutEntry[] {
  if (dayCards.length === 0) return []

  const entries = dayCards
    .filter((c) => c.time)
    .map((card) => {
      const start = timeToMinutes(card.time!)
      const duration = card.durationMinutes ?? interval
      return { card, startMin: start, endMin: start + duration }
    })
    .sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin)

  // Agrupar cards que se sobrepoem
  const groups: typeof entries[] = []
  let current: typeof entries = []

  for (const entry of entries) {
    if (current.length === 0 || entry.startMin < Math.max(...current.map((e) => e.endMin))) {
      current.push(entry)
    } else {
      groups.push(current)
      current = [entry]
    }
  }
  if (current.length > 0) groups.push(current)

  // Atribuir colunas dentro de cada grupo
  const result: LayoutEntry[] = []
  for (const group of groups) {
    const cols: number[] = [] // endMin de cada coluna
    for (const entry of group) {
      let placed = false
      for (let c = 0; c < cols.length; c++) {
        if (entry.startMin >= cols[c]) {
          cols[c] = entry.endMin
          result.push({ ...entry, col: c, totalCols: 0 })
          placed = true
          break
        }
      }
      if (!placed) {
        cols.push(entry.endMin)
        result.push({ ...entry, col: cols.length - 1, totalCols: 0 })
      }
    }
    const totalCols = cols.length
    for (const r of result) {
      if (group.some((e) => e.card.id === r.card.id)) {
        r.totalCols = totalCols
      }
    }
  }

  return result
}

/* ── Modal de conflito ──────────────────────────────────────── */

interface ConflictInfo {
  movingCardId: string
  existingCards: Card[]
  targetDay: Day
  targetSlot: string
  targetDate: string
}

interface ConflictModalProps {
  conflict: ConflictInfo
  onResolve: (action: 'keep' | 'shift' | 'cancel') => void
}

const ConflictModal: React.FC<ConflictModalProps> = ({ conflict, onResolve }) => {
  return (
    <div className="hc-overlay" onClick={() => onResolve('cancel')}>
      <div className="hc-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="hc-header">
          <div className="hc-header-icon">
            <svg viewBox="0 0 20 20" fill="none" width="20" height="20">
              <path d="M10 1.5 L18.5 17 H1.5 Z" stroke="#f59e0b" strokeWidth="1.5" strokeLinejoin="round" fill="rgba(245,158,11,0.12)" />
              <line x1="10" y1="7" x2="10" y2="11.5" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round" />
              <circle cx="10" cy="14" r="0.9" fill="#f59e0b" />
            </svg>
          </div>
          <span className="hc-title">Conflito de horario</span>
          <button type="button" className="hc-close" onClick={() => onResolve('cancel')} title="Fechar">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="14" height="14">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>

        {/* Conteudo */}
        <p className="hc-text">
          {conflict.existingCards.length === 1 ? 'Ja existe um card' : `Ja existem ${conflict.existingCards.length} cards`} em <strong>{conflict.targetSlot}</strong>
        </p>

        <div className="hc-cards">
          {conflict.existingCards.map((c) => (
            <div key={c.id} className="hc-card-row">
              <svg viewBox="0 0 16 16" fill="none" stroke="var(--color-text-muted)" strokeWidth="1.5" width="12" height="12">
                <rect x="2" y="2" width="12" height="12" rx="2" />
                <path d="M5 6h6M5 9h4" />
              </svg>
              <span>{c.title || 'Sem titulo'}</span>
            </div>
          ))}
        </div>

        {/* Acoes */}
        <div className="hc-actions">
          <button type="button" className="hc-action hc-action--primary" onClick={() => onResolve('keep')}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14">
              <path d="M3 8h4v5H3zM9 3h4v10H9z" />
            </svg>
            Manter ambos
          </button>
          <button type="button" className="hc-action hc-action--secondary" onClick={() => onResolve('shift')}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14">
              <path d="M8 3v10M8 3l3 3M8 3L5 6" />
            </svg>
            Deslocar +1h
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Backlog cell ───────────────────────────────────────────── */

const BacklogCell: React.FC<{
  cards: Card[]
  projects?: Project[]
  onOpenCard?: (card: Card) => void
}> = ({ cards, projects, onOpenCard }) => {
  const { setNodeRef, isOver } = useDroppable({ id: 'hourly-backlog' })
  return (
    <div ref={setNodeRef} className={`hourly-backlog-list ${isOver ? 'is-over' : ''}`}>
      <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        {cards.map((card) => (
          <SprintCardItem
            key={card.id}
            card={card}
            project={projects?.find((p) => p.id === card.projectId)}
            onClick={onOpenCard}
            showSprintBadge
          />
        ))}
      </SortableContext>
    </div>
  )
}

/* ── Drop zone invisivel por slot ───────────────────────────── */

function DroppableSlot({ day, minutes, top, height, onQuickAdd }: { day: Day; minutes: number; top: number; height: number; onQuickAdd: () => void }) {
  const id = `hslot:${day}:${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
  const { setNodeRef, isOver } = useDroppable({ id })
  const { active } = useDndContext()
  
  let activeHeight = height
  if (isOver && active && active.data.current?.card) {
    const card = active.data.current.card as Card
    if (card.durationMinutes) {
      activeHeight = Math.max(1, Math.round(card.durationMinutes / 30)) * height
    }
  }

  return (
    <div
      ref={setNodeRef}
      className={`hourly-drop-zone${isOver ? ' is-over' : ''}`}
      style={{ top, height }}
    >
      <button className="hourly-quick-add-btn" title="Adicionar card rápido" onClick={onQuickAdd}>
        +
      </button>
      {isOver && active && (
        <div 
          className="drop-preview-ghost"
          style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            width: '100%', 
            height: activeHeight, 
            background: 'var(--color-primary-alpha)', 
            border: '2px dashed var(--color-primary)', 
            borderRadius: '6px', 
            pointerEvents: 'none', 
            zIndex: 10 
          }}
        />
      )}
    </div>
  )
}

/* ── Componente principal ───────────────────────────────────── */

export const HourlyView: React.FC<HourlyViewProps> = ({
  cards,
  projects,
  weekOffset,
  onPrevWeek,
  onNextWeek,
  onToday,
  weekDates,
  prefs,
  onAddCard,
  onMoveCard,
  onEditCard,
  onOpenCard,
}) => {
  const [mode, setMode] = useState<'week' | 'day'>('week')
  const [selectedDay, setSelectedDay] = useState<Day>('mon')
  const [activeCard, setActiveCard] = useState<Card | null>(null)
  const [quickTitle, setQuickTitle] = useState('')
  const [conflict, setConflict] = useState<ConflictInfo | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const interval = prefs.plannerInterval
  const startMin = START_HOUR * 60
  const endMin = END_HOUR * 60
  const totalMin = endMin - startMin
  const totalSlots = totalMin / interval
  const gridHeight = totalSlots * SLOT_HEIGHT
  const hourHeight = (60 / interval) * SLOT_HEIGHT

  /* Resize */
  const { resizePreview, handleResizePointerDown, getCardDurationMinutes } = usePlannerResize({
    prefs: { ...prefs, plannerEndHour: END_HOUR },
    onEditCard: onEditCard ?? (() => {}),
  })

  /* Scroll para hora atual ao montar */
  const [nowMinutes, setNowMinutes] = useState(() => {
    const d = new Date()
    return d.getHours() * 60 + d.getMinutes()
  })

  useEffect(() => {
    const tick = () => { const d = new Date(); setNowMinutes(d.getHours() * 60 + d.getMinutes()) }
    const timer = setInterval(tick, 60_000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!scrollRef.current) return
    const offsetMin = nowMinutes - startMin
    if (offsetMin < 0 || offsetMin > totalMin) return
    scrollRef.current.scrollTop = Math.max(0, (offsetMin / interval) * SLOT_HEIGHT - 120)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const nowTop = weekOffset === 0 && nowMinutes >= startMin && nowMinutes <= endMin
    ? ((nowMinutes - startMin) / interval) * SLOT_HEIGHT
    : null

  const sensors = useSensors(
    useSensor(SmartPointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  )

  const collisionDetection = useCallback<CollisionDetection>((args) => {
    const hits = pointerWithin(args)
    if (hits.length > 0) {
      const slotHit = hits.find((h) => (h.id as string).startsWith('hslot:'))
      if (slotHit) return [slotHit]
      const backlogHit = hits.find((h) => (h.id as string) === 'hourly-backlog')
      if (backlogHit) return [backlogHit]
      return [hits[0]]
    }
    return closestCenter(args)
  }, [])

  const visibleDays = useMemo(
    () => (mode === 'week' ? DAYS_ORDER : [selectedDay]),
    [mode, selectedDay],
  )

  const backlogCards = useMemo(
    () => cards.filter((c) => !c.location.day && !c.location.period && !c.hasDate && !c.time),
    [cards],
  )

  /* Cards por dia (com horario) */
  const cardsByDay = useMemo(() => {
    const map = new Map<Day, Card[]>()
    for (const day of visibleDays) {
      const targetDate = weekDates[day]
      const dayCards = cards.filter((c) => c.hasDate && c.date === targetDate && c.time)
        .sort((a, b) => (a.time ?? '').localeCompare(b.time ?? '') || a.order - b.order)
      map.set(day, dayCards)
    }
    return map
  }, [cards, weekDates, visibleDays])

  /* Layout com overlap por dia */
  const layoutByDay = useMemo(() => {
    const map = new Map<Day, LayoutEntry[]>()
    for (const day of visibleDays) {
      map.set(day, computeOverlapLayout(cardsByDay.get(day) ?? [], interval))
    }
    return map
  }, [cardsByDay, visibleDays, interval])

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const card = cards.find((c) => c.id === event.active.id)
    setActiveCard(card ?? null)
  }, [cards])

  /* Executa o move efetivo */
  const executeMove = useCallback((cardId: string, day: Day, slot: string) => {
    const hour = parseInt(slot.slice(0, 2), 10)
    const period = getPeriodFromHour(hour)
    onMoveCard(cardId, { day, period }, weekDates[day], slot)
  }, [onMoveCard, weekDates])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    setActiveCard(null)
    if (!over) return
    const cardId = active.id as string
    const overId = over.id as string

    if (overId === 'hourly-backlog') {
      onMoveCard(cardId, { day: null, period: null }, null, null)
      return
    }

    if (overId.startsWith('hslot:')) {
      const parts = overId.split(':')
      const day = parts[1] as Day
      const slot = `${parts[2]}:${parts[3]}`
      const targetDate = weekDates[day]

      // Verificar conflito
      const slotMin = timeToMinutes(slot)
      const movingCard = cards.find((c) => c.id === cardId)
      const movingDuration = movingCard?.durationMinutes ?? interval
      const movingEnd = slotMin + movingDuration

      const existing = (cardsByDay.get(day) ?? []).filter((c) => {
        if (c.id === cardId) return false
        if (!c.time) return false
        const cStart = timeToMinutes(c.time)
        const cEnd = cStart + (c.durationMinutes ?? interval)
        return cStart < movingEnd && cEnd > slotMin
      })

      if (existing.length > 0) {
        setConflict({
          movingCardId: cardId,
          existingCards: existing,
          targetDay: day,
          targetSlot: slot,
          targetDate,
        })
        return
      }

      executeMove(cardId, day, slot)
      return
    }

    const target = cards.find((c) => c.id === overId)
    if (target) {
      onMoveCard(cardId, target.location, target.date, target.time)
    }
  }, [cards, cardsByDay, onMoveCard, weekDates, interval, executeMove])

  /* Resolver conflito */
  const handleConflictResolve = useCallback((action: 'keep' | 'shift' | 'cancel') => {
    if (!conflict) return

    if (action === 'cancel') {
      setConflict(null)
      return
    }

    if (action === 'keep') {
      executeMove(conflict.movingCardId, conflict.targetDay, conflict.targetSlot)
      setConflict(null)
      return
    }

    if (action === 'shift' && onEditCard) {
      // Deslocar cards existentes +1h
      for (const existing of conflict.existingCards) {
        if (!existing.time) continue
        const newMin = timeToMinutes(existing.time) + 60
        if (newMin < END_HOUR * 60) {
          onEditCard(existing.id, { time: minutesToTime(newMin) })
        }
      }
      executeMove(conflict.movingCardId, conflict.targetDay, conflict.targetSlot)
      setConflict(null)
    }
  }, [conflict, executeMove, onEditCard])

  const handleQuickAdd = () => {
    const title = quickTitle.trim()
    if (!title) return
    onAddCard(title, { day: null, period: null }, null)
    setQuickTitle('')
  }

  return (
    <div className="hourly-view">
      <div className="hourly-view-toolbar">
        <div className="hourly-view-mode-toggle">
          <button
            type="button"
            className={`hourly-mode-btn ${mode === 'week' ? 'is-active' : ''}`}
            onClick={() => setMode('week')}
          >
            Semana
          </button>
          <button
            type="button"
            className={`hourly-mode-btn ${mode === 'day' ? 'is-active' : ''}`}
            onClick={() => setMode('day')}
          >
            Dia
          </button>
        </div>
        {mode === 'day' && (
          <select
            className="form-input hourly-day-select"
            value={selectedDay}
            onChange={(e) => setSelectedDay(e.target.value as Day)}
          >
            {DAYS_ORDER.map((d) => (
              <option key={d} value={d}>{DAY_LABELS[d]} {weekDates[d]?.slice(8)}</option>
            ))}
          </select>
        )}
        <div className="hourly-view-nav">
          <Button size="sm" variant="secondary" onClick={onPrevWeek}>&#8249;</Button>
          <Button size="sm" variant="secondary" onClick={onToday}>
            {weekOffset === 0 ? 'Esta semana' : `${weekOffset > 0 ? '+' : ''}${weekOffset}`}
          </Button>
          <Button size="sm" variant="secondary" onClick={onNextWeek}>&#8250;</Button>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="hourly-view-body">
          <aside className="hourly-backlog">
            <div className="hourly-backlog-header">
              <span>Backlog</span>
              <span className="hourly-backlog-count">{backlogCards.length}</span>
            </div>
            <div className="hourly-backlog-quick">
              <input
                type="text"
                className="form-input"
                placeholder="+ Card"
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleQuickAdd() }}
              />
            </div>
            <BacklogCell cards={backlogCards} projects={projects} onOpenCard={onOpenCard} />
          </aside>

          <div className={`hourly-grid ${mode === 'day' ? 'is-day' : 'is-week'}`}>
            <div className="hourly-week-header">
              <div className="hourly-axis-corner" />
              {visibleDays.map((day) => (
                <div key={day} className="hourly-day-header">
                  <span className="hourly-day-label">{DAY_LABELS[day]}</span>
                  <span className="hourly-day-date">{weekDates[day]?.slice(8)}</span>
                </div>
              ))}
            </div>

            <div className="hourly-week-body" ref={scrollRef}>
              <TimeSlotAxis
                startHour={START_HOUR}
                endHour={END_HOUR}
                interval={interval}
                slotHeight={SLOT_HEIGHT}
              />

              {visibleDays.map((day) => {
                const layout = layoutByDay.get(day) ?? []

                return (
                  <div key={day} className="hourly-day-col" style={{ 
                    height: gridHeight,
                    '--slot-height': `${SLOT_HEIGHT}px`,
                    '--hour-height': `${hourHeight}px`
                  } as React.CSSProperties}>
                    {/* The lines are now rendered efficiently via background-image in CSS */}
                    {Array.from({ length: totalSlots }, (_, i) => {
                      const slotMinutes = startMin + i * interval
                      return (
                        <DroppableSlot
                          key={`${day}-${slotMinutes}`}
                          day={day}
                          minutes={slotMinutes}
                          top={i * SLOT_HEIGHT}
                          height={SLOT_HEIGHT}
                          onQuickAdd={() => {
                            const time = minutesToTime(slotMinutes)
                            onAddCard('Nova Tarefa', { day, period: getPeriodFromHour(Math.floor(slotMinutes / 60)) }, weekDates[day], time)
                          }}
                        />
                      )
                    })}

                    {weekOffset === 0 && nowTop !== null && (
                      <div className="hourly-now-line" style={{ top: nowTop }}>
                        <span className="hourly-now-dot" />
                        <span className="hourly-now-badge">AGORA</span>
                      </div>
                    )}

                    {/* Cards com layout de overlap */}
                    {layout.map((entry) => {
                      const offsetMin = entry.startMin - startMin
                      if (offsetMin < 0 || offsetMin >= totalMin) return null
                      const top = (offsetMin / interval) * SLOT_HEIGHT
                      const widthPct = 100 / entry.totalCols
                      const leftPct = entry.col * widthPct

                      // Ajuste: day <= selectedDay logic não é tão simples, então se usa a data real ou simplifica por weekOffset e nowMinutes
                      const isToday = weekDates[day] === new Date().toISOString().slice(0, 10);
                      const reallyPast = (weekOffset < 0) || (weekOffset === 0 && (weekDates[day] < new Date().toISOString().slice(0, 10) || (isToday && entry.endMin <= nowMinutes)));

                      return (
                        <div
                          key={entry.card.id}
                          className={`hourly-card-wrapper ${reallyPast ? 'is-past' : ''}`}
                          style={{
                            top,
                            left: entry.totalCols > 1 ? `calc(${leftPct}% + 3px)` : '3px',
                            right: entry.totalCols > 1 ? `calc(${100 - leftPct - widthPct}% + 3px)` : '3px',
                          }}
                        >
                          <CompactCard
                            card={entry.card}
                            slotHeight={SLOT_HEIGHT}
                            interval={interval}
                            onClick={onOpenCard ?? (() => {})}
                            onContextMenu={() => {}}
                            onResizePointerDown={handleResizePointerDown}
                            previewDurationMinutes={getCardDurationMinutes(entry.card) ?? undefined}
                            isResizing={resizePreview?.cardId === entry.card.id}
                          />
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <DragOverlay 
          dropAnimation={{
            duration: 250,
            easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
            sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.4' } } })
          }} 
          modifiers={[snapToCursor]}
        >
          {activeCard ? <SprintCardItem card={activeCard} draggable={false} showSprintBadge /> : null}
        </DragOverlay>
      </DndContext>

      {/* Modal de conflito */}
      {conflict && (
        <ConflictModal conflict={conflict} onResolve={handleConflictResolve} />
      )}
    </div>
  )
}
