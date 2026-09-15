/**
 * PeriodView — vista PRINCIPAL do Hub Planejamento.
 *
 * Layout: 7 colunas (dias da semana) × 3 linhas (manha/tarde/noite).
 * + Backlog lateral proprio (cards sem periodo + sem data).
 * Cards inSprint mostram badge S + borda esquerda colorida.
 * DnD: arrasta cards entre celulas e do/para backlog.
 *
 * Upgrade 01.
 */

import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react'
import {
  DndContext,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  closestCorners,
  pointerWithin,
  MeasuringStrategy,
  getClientRect,
  useSensor,
  useSensors,
  useDroppable,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { Card, CardLocation, Day, Period, Project } from '@types'
import { DAYS_ORDER, DAY_LABELS } from '@types'
import { Button } from '@shared/components/primitives'
import { SprintCardItem } from '../sprint/SprintCardItem'

interface PeriodViewProps {
  cards: Card[]
  projects?: Project[]
  weekOffset: number
  onPrevWeek: () => void
  onNextWeek: () => void
  onToday: () => void
  weekDates: Record<Day, string>
  onAddCard: (title: string, location: CardLocation, date: string | null) => void
  onMoveCard: (cardId: string, location: CardLocation, date: string | null) => void
  onOpenCard?: (card: Card) => void
}

const PERIODS: { id: Period; label: string }[] = [
  { id: 'morning', label: 'Manhã' },
  { id: 'afternoon', label: 'Tarde' },
  { id: 'night', label: 'Noite' },
]

interface CellProps {
  cellId: string
  cards: Card[]
  projects?: Project[]
  onOpenCard?: (card: Card) => void
  onSelectCard?: (card: Card) => void
  selectedCardId?: string | null
  onCellClick?: (cellId: string) => void
}

const Cell: React.FC<CellProps> = ({
  cellId,
  cards,
  projects,
  onOpenCard,
  onSelectCard,
  selectedCardId,
  onCellClick,
}) => {
  const { setNodeRef, isOver } = useDroppable({ id: cellId })
  return (
    <div
      ref={setNodeRef}
      className={`period-cell ${isOver ? 'is-over' : ''} ${selectedCardId ? 'has-selected-target' : ''}`}
      data-debug-name="PeriodView.Cell"
      data-debug-id={cellId}
      onClick={(e) => {
        if (selectedCardId) {
          e.stopPropagation()
          onCellClick?.(cellId)
        }
      }}
    >
      <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        {cards.map((card) => (
          <SprintCardItem
            key={card.id}
            card={card}
            project={projects?.find((p) => p.id === card.projectId)}
            onClick={onOpenCard}
            onSelectCard={onSelectCard}
            isSelected={selectedCardId === card.id}
            showSprintBadge
          />
        ))}
        {cards.length === 0 && (
          <div className="period-cell-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="12" y1="8" x2="12" y2="16" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
            <span>{selectedCardId ? 'Clique para mover o card selecionado' : 'Arraste ou Ctrl+Clique para mover'}</span>
          </div>
        )}
      </SortableContext>
    </div>
  )
}

export const PeriodView: React.FC<PeriodViewProps> = ({
  cards,
  projects,
  weekOffset,
  onPrevWeek,
  onNextWeek,
  onToday,
  weekDates,
  onAddCard,
  onMoveCard,
  onOpenCard,
}) => {
  const [activeCard, setActiveCard] = useState<Card | null>(null)
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [isBacklogCollapsed, setIsBacklogCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('organon:period-backlog-collapsed') === 'true'
    } catch {
      return false
    }
  })
  const [quickTitle, setQuickTitle] = useState('')
  const [tooltipDay, setTooltipDay] = useState<Day | null>(null)
  const zoomFactorRef = useRef(1)

  const toggleBacklog = useCallback(() => {
    setIsBacklogCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem('organon:period-backlog-collapsed', String(next))
      } catch {}
      return next
    })
  }, [])

  const handleSelectCard = useCallback((card: Card) => {
    setSelectedCardId((prev) => (prev === card.id ? null : card.id))
  }, [])

  const handleCellClick = useCallback((cellId: string) => {
    if (!selectedCardId) return

    if (cellId === 'period-backlog') {
      onMoveCard(selectedCardId, { day: null, period: null }, null)
    } else if (cellId.startsWith('cell:')) {
      const [, day, period] = cellId.split(':') as [string, Day, Period]
      onMoveCard(selectedCardId, { day, period }, weekDates[day])
    }
    setSelectedCardId(null)
  }, [selectedCardId, onMoveCard, weekDates])

  // Desmarcar selecao ao apertar ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedCardId(null)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 3 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
  )

  const zoomedClientRect = useCallback((element: HTMLElement) => {
    const rect = getClientRect(element)
    const zoom = zoomFactorRef.current
    if (!zoom || zoom === 1) return rect
    return {
      ...rect,
      top: rect.top * zoom,
      right: rect.right * zoom,
      bottom: rect.bottom * zoom,
      left: rect.left * zoom,
      width: rect.width * zoom,
      height: rect.height * zoom,
    }
  }, [])

  const measuring = useMemo(() => {
    return {
      draggable: { measure: zoomedClientRect },
      droppable: { strategy: MeasuringStrategy.Always, measure: zoomedClientRect },
      dragOverlay: { measure: zoomedClientRect },
    }
  }, [zoomedClientRect])

  // Backlog: cards sem location.day E sem location.period (cards "soltos")
  const backlogCards = useMemo(
    () => cards.filter((c) => !c.location.day && !c.location.period && !c.hasDate && !c.time),
    [cards],
  )

  // Para cada celula, lista de cards
  const cellCards = useMemo(() => {
    const map = new Map<string, Card[]>()
    for (const day of DAYS_ORDER) {
      for (const period of PERIODS) {
        const targetDate = weekDates[day]
        const matched = cards.filter((c) => {
          if (!c.hasDate || c.date !== targetDate) return false
          if (c.location.period !== period.id) return false
          if (c.time) return false
          return true
        }).sort((a, b) => a.order - b.order)
        map.set(`${day}-${period.id}`, matched)
      }
    }
    return map
  }, [cards, weekDates])

  // Cards horarios por dia (para badge de mencoes)
  const hourlyByDay = useMemo(() => {
    const map = new Map<Day, Card[]>()
    for (const day of DAYS_ORDER) {
      const targetDate = weekDates[day]
      map.set(day, cards.filter((c) => c.hasDate && c.date === targetDate && c.time)
        .sort((a, b) => (a.time ?? '').localeCompare(b.time ?? '')))
    }
    return map
  }, [cards, weekDates])

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const card = cards.find((c) => c.id === event.active.id)
    setActiveCard(card ?? null)
    try {
      zoomFactorRef.current = (window.electronAPI as any)?.getNativeZoom?.() ?? 1
    } catch {
      zoomFactorRef.current = 1
    }
  }, [cards])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    setActiveCard(null)
    if (!over) return
    const cardId = active.id as string
    const overId = over.id as string

    if (overId === 'period-backlog') {
      onMoveCard(cardId, { day: null, period: null }, null)
      return
    }

    // Cell id format: "cell:{day}:{period}"
    if (overId.startsWith('cell:')) {
      const [, day, period] = overId.split(':') as [string, Day, Period]
      onMoveCard(cardId, { day, period }, weekDates[day])
      return
    }

    // Drop em outro card — mesmo cell do alvo
    const target = cards.find((c) => c.id === overId)
    if (target) {
      onMoveCard(cardId, target.location, target.date)
    }
  }, [cards, onMoveCard, weekDates])

  useEffect(() => {
    if (!activeCard) return
    const prevBodyCursor = document.body.style.cursor
    const prevHtmlCursor = document.documentElement.style.cursor
    document.body.style.cursor = 'grabbing'
    document.documentElement.style.cursor = 'grabbing'
    return () => {
      document.body.style.cursor = prevBodyCursor
      document.documentElement.style.cursor = prevHtmlCursor
    }
  }, [activeCard])

  const handleQuickAdd = () => {
    const title = quickTitle.trim()
    if (!title) return
    onAddCard(title, { day: null, period: null }, null)
    setQuickTitle('')
  }

  return (
    <div className="period-view" data-debug-name="planning/views/PeriodView">
      <div className="period-view-toolbar">
        <div className="period-view-nav">
          <Button size="sm" variant="secondary" onClick={onPrevWeek}>‹</Button>
          <Button size="sm" variant="secondary" onClick={onToday}>
            {weekOffset === 0 ? 'Esta semana' : `Semana ${weekOffset > 0 ? '+' : ''}${weekOffset}`}
          </Button>
          <Button size="sm" variant="secondary" onClick={onNextWeek}>›</Button>
        </div>
        <div className="period-view-info">
          {weekDates.mon} a {weekDates.sun}
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={(args) => {
          const pointerHits = pointerWithin(args)
          if (pointerHits.length > 0) return pointerHits
          return closestCorners(args)
        }}
        measuring={{
          droppable: {
            strategy: MeasuringStrategy.Always,
          },
        }}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="period-view-body">
          {/* Backlog lateral */}
          <aside
            className={`period-backlog ${isBacklogCollapsed ? 'is-collapsed' : ''}`}
            onClick={isBacklogCollapsed ? toggleBacklog : undefined}
            title={isBacklogCollapsed ? 'Clique para expandir o Backlog' : undefined}
          >
            <div className="period-backlog-header">
              <div className="period-backlog-header-title">
                <span>Backlog</span>
                <span className="period-backlog-count">{backlogCards.length}</span>
              </div>
              <button
                type="button"
                className="period-backlog-toggle-btn"
                onClick={(e) => {
                  if (isBacklogCollapsed) e.stopPropagation()
                  toggleBacklog()
                }}
                title={isBacklogCollapsed ? 'Expandir Backlog' : 'Recolher Backlog'}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                  {isBacklogCollapsed ? (
                    <polyline points="9 18 15 12 9 6" />
                  ) : (
                    <polyline points="15 18 9 12 15 6" />
                  )}
                </svg>
              </button>
            </div>
            {!isBacklogCollapsed && (
              <div className="period-backlog-quick">
                <input
                  type="text"
                  className="form-input"
                  placeholder="+ Card"
                  value={quickTitle}
                  onChange={(e) => setQuickTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleQuickAdd()
                  }}
                />
              </div>
            )}
            <Cell
              cellId="period-backlog"
              cards={backlogCards}
              projects={projects}
              onOpenCard={onOpenCard}
              onSelectCard={handleSelectCard}
              selectedCardId={selectedCardId}
              onCellClick={handleCellClick}
            />
          </aside>

          {/* Grid 7 dias x 3 periodos */}
          <div className="period-grid">
            <div className="period-grid-header">
              <div className="period-grid-corner" />
              {DAYS_ORDER.map((day) => {
                const hourlyCards = hourlyByDay.get(day) ?? []
                const hasHourly = hourlyCards.length > 0
                return (
                  <div key={day} className="period-grid-day-header">
                    <div className="period-day-row">
                      <span className="period-grid-day-name">{DAY_LABELS[day]}</span>
                      <span className="period-day-sep">-</span>
                      <span className="period-grid-day-date">{weekDates[day]?.slice(8)}</span>
                      {hasHourly && (
                        <button
                          type="button"
                          className="period-hourly-badge"
                          onMouseEnter={() => setTooltipDay(day)}
                          onMouseLeave={() => setTooltipDay(null)}
                          onClick={() => setTooltipDay(tooltipDay === day ? null : day)}
                        >
                          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="12" height="12">
                            <circle cx="8" cy="8" r="6" />
                            <polyline points="8 4.5 8 8 10.5 10" />
                          </svg>
                          <span>{hourlyCards.length}</span>
                        </button>
                      )}
                    </div>
                    {tooltipDay === day && hasHourly && (
                      <div className="period-hourly-tooltip">
                        <div className="period-hourly-tooltip-title">Cards com horario</div>
                        {hourlyCards.map((c) => (
                          <div key={c.id} className="period-hourly-tooltip-item">
                            <span className="period-hourly-tooltip-time">{c.time}</span>
                            <span className="period-hourly-tooltip-name">{c.title || 'Sem titulo'}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            {PERIODS.map((period) => {
              // Calcular total de cards nesse periodo (soma de todos os dias)
              const totalCardsInPeriod = DAYS_ORDER.reduce((acc, day) => {
                const dayCards = cellCards.get(`${day}-${period.id}`) ?? []
                return acc + dayCards.length
              }, 0)

              return (
                <div key={period.id} className="period-grid-row">
                  <div className="period-grid-row-label">
                    {period.label}
                    {totalCardsInPeriod > 0 && <span className="period-row-count">{totalCardsInPeriod}</span>}
                  </div>
                  {DAYS_ORDER.map((day) => (
                    <Cell
                      key={`${day}-${period.id}`}
                      cellId={`cell:${day}:${period.id}`}
                      cards={cellCards.get(`${day}-${period.id}`) ?? []}
                      projects={projects}
                      onOpenCard={onOpenCard}
                      onSelectCard={handleSelectCard}
                      selectedCardId={selectedCardId}
                      onCellClick={handleCellClick}
                    />
                  ))}
                </div>
              )
            })}
          </div>
        </div>

        <DragOverlay 
          zIndex={9999}
          dropAnimation={{
            duration: 250,
            easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
            sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.4' } } })
          }}
        >
          {null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
