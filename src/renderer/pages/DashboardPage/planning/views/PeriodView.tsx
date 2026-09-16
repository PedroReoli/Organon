/**
 * PeriodView — Vista semanal dividida em 3 Períodos (Manhã, Tarde, Noite).
 *
 * Características:
 * - 7 colunas (Segunda a Domingo) x 3 linhas (Manhã, Tarde, Noite).
 * - Sem coluna de backlog lateral (aproveitamento total da tela).
 * - Suporte nativo a horários (cards com hora aparecem diretamente no período correspondente).
 * - Adição rápida com ou sem horário.
 * - Drag and Drop completo entre dias e períodos.
 * - Totalmente integrado aos tokens dinâmicos de tema (var(--color-primary), var(--color-surface), etc.).
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
import {
  Sun,
  Sunrise,
  Moon,
  Plus,
  Clock,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Sparkles
} from 'lucide-react'

interface PeriodViewProps {
  cards: Card[]
  projects?: Project[]
  weekOffset: number
  onPrevWeek: () => void
  onNextWeek: () => void
  onToday: () => void
  weekDates: Record<Day, string>
  onAddCard: (title: string, location: CardLocation, date: string | null, time?: string | null) => void
  onMoveCard: (cardId: string, location: CardLocation, date: string | null, time?: string | null) => void
  onOpenCard?: (card: Card) => void
}

const PERIODS: { id: Period; label: string; timeRange: string; icon: React.ReactNode }[] = [
  { id: 'morning', label: 'Manhã', timeRange: '06:00 – 12:00', icon: <Sunrise className="w-4 h-4" /> },
  { id: 'afternoon', label: 'Tarde', timeRange: '12:00 – 18:00', icon: <Sun className="w-4 h-4" /> },
  { id: 'night', label: 'Noite', timeRange: '18:00 – 00:00', icon: <Moon className="w-4 h-4" /> },
]

/**
 * Determina o período baseado no horário informado (HH:mm)
 */
const getPeriodForTime = (time: string): Period => {
  const match = time.match(/^(\d{1,2}):(\d{2})/)
  if (!match) return 'morning'
  const hour = parseInt(match[1], 10)
  if (hour < 12) return 'morning'
  if (hour < 18) return 'afternoon'
  return 'night'
}

interface CellProps {
  cellId: string
  day: Day
  period: Period
  date: string
  cards: Card[]
  projects?: Project[]
  isToday: boolean
  onOpenCard?: (card: Card) => void
  onSelectCard?: (card: Card) => void
  selectedCardId?: string | null
  onCellClick?: (cellId: string) => void
  onQuickAdd: (day: Day, period: Period, date: string) => void
}

const Cell: React.FC<CellProps> = ({
  cellId,
  day,
  period,
  date,
  cards,
  projects,
  isToday,
  onOpenCard,
  onSelectCard,
  selectedCardId,
  onCellClick,
  onQuickAdd,
}) => {
  const { setNodeRef, isOver } = useDroppable({ id: cellId })

  return (
    <div
      ref={setNodeRef}
      style={{
        background: isOver
          ? 'color-mix(in srgb, var(--color-primary) 15%, var(--color-surface))'
          : isToday
            ? 'color-mix(in srgb, var(--color-primary) 4%, var(--color-surface))'
            : 'var(--color-surface)',
        borderColor: isOver
          ? 'var(--color-primary)'
          : isToday
            ? 'color-mix(in srgb, var(--color-primary) 25%, var(--color-border))'
            : 'var(--color-border)',
      }}
      className={`period-cell border transition-all rounded-lg p-2 flex flex-col justify-between group/cell relative min-h-[140px] ${
        isOver ? 'is-over' : ''
      } ${selectedCardId ? 'has-selected-target cursor-pointer' : ''}`}
      data-debug-name="PeriodView.Cell"
      data-debug-id={cellId}
      onClick={(e) => {
        if (selectedCardId) {
          e.stopPropagation()
          onCellClick?.(cellId)
        }
      }}
    >
      <div className="flex-1 flex flex-col gap-1.5 overflow-y-auto">
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
        </SortableContext>

        {cards.length === 0 && (
          <div
            onClick={() => onQuickAdd(day, period, date)}
            style={{
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-muted)',
            }}
            className="flex-1 flex flex-col items-center justify-center border border-dashed rounded-md p-4 text-center cursor-pointer hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] hover:bg-[color-mix(in_srgb,var(--color-primary)_6%,transparent)] transition-all select-none group/empty"
          >
            <Plus className="w-4 h-4 mb-1 group-hover/empty:scale-110 transition-transform" />
            <span className="text-[11px] font-medium">
              {selectedCardId ? 'Mover para cá' : 'Adicionar card'}
            </span>
          </div>
        )}
      </div>

      {/* Quick Add Button on Cell Footer when cards exist */}
      {cards.length > 0 && (
        <div className="pt-1.5 mt-1 border-t border-[var(--color-border)]/50 opacity-0 group-hover/cell:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onQuickAdd(day, period, date)
            }}
            style={{
              color: 'var(--color-primary)',
              background: 'color-mix(in srgb, var(--color-primary) 8%, transparent)',
            }}
            className="w-full py-1 px-2 rounded text-[10px] font-semibold flex items-center justify-center gap-1 hover:bg-[color-mix(in_srgb,var(--color-primary)_18%,transparent)] transition-colors"
          >
            <Plus className="w-3 h-3" />
            <span>Adicionar</span>
          </button>
        </div>
      )}
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
  const [quickAddModal, setQuickAddModal] = useState<{
    isOpen: boolean
    day: Day
    period: Period
    date: string
    title: string
    time: string
  } | null>(null)

  const zoomFactorRef = useRef(1)

  const handleSelectCard = useCallback((card: Card) => {
    setSelectedCardId((prev) => (prev === card.id ? null : card.id))
  }, [])

  const handleCellClick = useCallback((cellId: string) => {
    if (!selectedCardId) return

    if (cellId.startsWith('cell:')) {
      const [, day, period] = cellId.split(':') as [string, Day, Period]
      onMoveCard(selectedCardId, { day, period }, weekDates[day])
    }
    setSelectedCardId(null)
  }, [selectedCardId, onMoveCard, weekDates])

  // Desmarcar seleção ao apertar ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedCardId(null)
        setQuickAddModal(null)
      }
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

  // Hoje no formato ISO
  const todayISO = useMemo(() => new Date().toISOString().slice(0, 10), [])

  // Para cada célula (dia + período), lista de cards com ou sem horário
  const cellCards = useMemo(() => {
    const map = new Map<string, Card[]>()
    for (const day of DAYS_ORDER) {
      for (const period of PERIODS) {
        const targetDate = weekDates[day]
        const matched = cards.filter((c) => {
          if (!c.hasDate || c.date !== targetDate) return false

          // Se tiver período explícito, compara diretamente
          if (c.location.period) {
            return c.location.period === period.id
          }

          // Se tiver horário, mapeia automaticamente para o período
          if (c.time) {
            return getPeriodForTime(c.time) === period.id
          }

          // Fallback se não tiver período nem horário: Manhã
          return period.id === 'morning'
        }).sort((a, b) => {
          // Ordena primeiro por horário (se existir) e depois por ordem
          if (a.time && b.time) return a.time.localeCompare(b.time)
          if (a.time) return -1
          if (b.time) return 1
          return a.order - b.order
        })

        map.set(`${day}-${period.id}`, matched)
      }
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

    // Cell id format: "cell:{day}:{period}"
    if (overId.startsWith('cell:')) {
      const [, day, period] = overId.split(':') as [string, Day, Period]
      onMoveCard(cardId, { day, period }, weekDates[day])
      return
    }

    // Drop em outro card — mesmo cell do alvo
    const target = cards.find((c) => c.id === overId)
    if (target) {
      onMoveCard(cardId, target.location, target.date, target.time)
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

  const openQuickAddModal = (day: Day, period: Period, date: string) => {
    setQuickAddModal({
      isOpen: true,
      day,
      period,
      date,
      title: '',
      time: period === 'morning' ? '09:00' : period === 'afternoon' ? '14:00' : '19:00',
    })
  }

  const submitQuickAdd = () => {
    if (!quickAddModal || !quickAddModal.title.trim()) return
    onAddCard(
      quickAddModal.title.trim(),
      { day: quickAddModal.day, period: quickAddModal.period },
      quickAddModal.date,
      quickAddModal.time.trim() || null
    )
    setQuickAddModal(null)
  }

  // Formatador de range da semana
  const formattedWeekRange = useMemo(() => {
    const mon = weekDates.mon ? new Date(weekDates.mon + 'T00:00:00') : new Date()
    const sun = weekDates.sun ? new Date(weekDates.sun + 'T00:00:00') : new Date()
    const startStr = `${mon.getDate()} de ${mon.toLocaleDateString('pt-BR', { month: 'short' })}`
    const endStr = `${sun.getDate()} de ${sun.toLocaleDateString('pt-BR', { month: 'short' })} de ${sun.getFullYear()}`
    return `${startStr} a ${endStr}`
  }, [weekDates])

  return (
    <div
      style={{
        background: 'var(--color-background)',
        color: 'var(--color-text)',
      }}
      className="w-full h-full flex flex-col overflow-hidden p-3 gap-3 select-none"
      data-debug-name="planning/views/PeriodView"
    >
      {/* Top Toolbar */}
      <div
        style={{
          background: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
        }}
        className="flex items-center justify-between p-2.5 px-4 rounded-xl border shadow-xs shrink-0 gap-3"
      >
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={onPrevWeek}
            title="Semana anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <Button
            size="sm"
            variant="secondary"
            onClick={onToday}
            style={{
              borderColor: weekOffset === 0 ? 'var(--color-primary)' : 'var(--color-border)',
              color: weekOffset === 0 ? 'var(--color-primary)' : 'var(--color-text)',
              fontWeight: 600,
            }}
          >
            {weekOffset === 0 ? 'Esta semana' : `Semana ${weekOffset > 0 ? '+' : ''}${weekOffset}`}
          </Button>

          <Button
            size="sm"
            variant="secondary"
            onClick={onNextWeek}
            title="Próxima semana"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
          <span style={{ color: 'var(--color-text)' }} className="text-xs font-bold tracking-tight">
            {formattedWeekRange}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span
            style={{
              background: 'color-mix(in srgb, var(--color-primary) 12%, transparent)',
              color: 'var(--color-primary)',
              borderColor: 'color-mix(in srgb, var(--color-primary) 25%, transparent)',
            }}
            className="text-[11px] font-bold px-2.5 py-1 rounded-md border hidden sm:flex items-center gap-1"
          >
            <Sparkles className="w-3 h-3" />
            3 Períodos com Horas
          </span>
        </div>
      </div>

      {/* Grid 7 Colunas (Dias) x 3 Linhas (Períodos) — Sem backlog */}
      <DndContext
        sensors={sensors}
        collisionDetection={(args) => {
          const pointerHits = pointerWithin(args)
          if (pointerHits.length > 0) return pointerHits
          return closestCorners(args)
        }}
        measuring={measuring}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 flex flex-col overflow-auto min-h-0 border border-[var(--color-border)] rounded-xl bg-[var(--color-surface)] shadow-xs">
          {/* Day Headers (7 Colunas) */}
          <div className="grid grid-cols-[100px_repeat(7,1fr)] sticky top-0 z-10 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
            <div className="p-2 border-r border-[var(--color-border)] flex items-center justify-center font-bold text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">
              Período
            </div>

            {DAYS_ORDER.map((day) => {
              const isToday = weekDates[day] === todayISO
              const dateNum = weekDates[day]?.slice(8)

              // Total de cards no dia
              const totalDayCards = PERIODS.reduce((acc, p) => acc + (cellCards.get(`${day}-${p.id}`)?.length || 0), 0)

              return (
                <div
                  key={day}
                  style={{
                    background: isToday
                      ? 'color-mix(in srgb, var(--color-primary) 12%, var(--color-surface))'
                      : 'var(--color-surface)',
                    borderColor: 'var(--color-border)',
                  }}
                  className="p-2 text-center border-r last:border-r-0 flex items-center justify-center gap-2"
                >
                  <span
                    style={{
                      color: isToday ? 'var(--color-primary)' : 'var(--color-text-muted)',
                      fontWeight: isToday ? 800 : 700,
                    }}
                    className="text-xs uppercase tracking-wide"
                  >
                    {DAY_LABELS[day]}
                  </span>
                  <span
                    style={{
                      background: isToday ? 'var(--color-primary)' : 'color-mix(in srgb, var(--color-border) 60%, transparent)',
                      color: isToday ? '#ffffff' : 'var(--color-text)',
                    }}
                    className="text-xs font-extrabold px-1.5 py-0.5 rounded-md min-w-[20px]"
                  >
                    {dateNum}
                  </span>

                  {totalDayCards > 0 && (
                    <span
                      style={{
                        background: 'color-mix(in srgb, var(--color-primary) 15%, transparent)',
                        color: 'var(--color-primary)',
                      }}
                      className="text-[10px] font-bold px-1.5 py-0.2 rounded-full hidden md:inline-block"
                    >
                      {totalDayCards}
                    </span>
                  )}
                </div>
              )
            })}
          </div>

          {/* 3 Period Rows (Manhã, Tarde, Noite) */}
          <div className="flex-1 grid grid-rows-3 divide-y divide-[var(--color-border)] min-h-[500px]">
            {PERIODS.map((period) => {
              // Total de cards no período na semana inteira
              const totalPeriodCards = DAYS_ORDER.reduce(
                (acc, day) => acc + (cellCards.get(`${day}-${period.id}`)?.length || 0),
                0
              )

              return (
                <div key={period.id} className="grid grid-cols-[100px_repeat(7,1fr)]">
                  {/* Period Label Column */}
                  <div
                    style={{
                      background: 'color-mix(in srgb, var(--color-background) 60%, var(--color-surface))',
                      borderColor: 'var(--color-border)',
                    }}
                    className="p-3 border-r flex flex-col items-center justify-center text-center gap-1 select-none"
                  >
                    <div
                      style={{
                        background: 'color-mix(in srgb, var(--color-primary) 12%, transparent)',
                        color: 'var(--color-primary)',
                      }}
                      className="p-1.5 rounded-lg mb-0.5"
                    >
                      {period.icon}
                    </div>
                    <span style={{ color: 'var(--color-text)' }} className="text-xs font-bold uppercase tracking-wider">
                      {period.label}
                    </span>
                    <span style={{ color: 'var(--color-text-muted)' }} className="text-[9px] font-medium leading-tight">
                      {period.timeRange}
                    </span>
                    {totalPeriodCards > 0 && (
                      <span
                        style={{
                          background: 'color-mix(in srgb, var(--color-primary) 15%, transparent)',
                          color: 'var(--color-primary)',
                        }}
                        className="text-[9px] font-bold px-1.5 py-0.2 rounded-full mt-0.5"
                      >
                        {totalPeriodCards}
                      </span>
                    )}
                  </div>

                  {/* 7 Day Cells for this Period */}
                  {DAYS_ORDER.map((day) => {
                    const isToday = weekDates[day] === todayISO
                    const cellKey = `cell:${day}:${period.id}`
                    const list = cellCards.get(`${day}-${period.id}`) ?? []

                    return (
                      <div key={cellKey} className="p-1.5 border-r last:border-r-0 overflow-hidden flex flex-col">
                        <Cell
                          cellId={cellKey}
                          day={day}
                          period={period.id}
                          date={weekDates[day]}
                          cards={list}
                          projects={projects}
                          isToday={isToday}
                          onOpenCard={onOpenCard}
                          onSelectCard={handleSelectCard}
                          selectedCardId={selectedCardId}
                          onCellClick={handleCellClick}
                          onQuickAdd={openQuickAddModal}
                        />
                      </div>
                    )
                  })}
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
            sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.4' } } }),
          }}
        >
          {null}
        </DragOverlay>
      </DndContext>

      {/* Quick Add Card Modal with Time */}
      {quickAddModal && (
        <div
          style={{ background: 'rgba(0, 0, 0, 0.6)' }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setQuickAddModal(null)}
        >
          <div
            style={{
              background: 'var(--color-surface)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)',
            }}
            className="w-full max-w-md p-5 rounded-xl border shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <div className="flex items-center gap-2">
                <div
                  style={{
                    background: 'color-mix(in srgb, var(--color-primary) 15%, transparent)',
                    color: 'var(--color-primary)',
                  }}
                  className="p-1.5 rounded-lg"
                >
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Novo Card de Planejamento</h3>
                  <p style={{ color: 'var(--color-text-muted)' }} className="text-xs">
                    {DAY_LABELS[quickAddModal.day]} ({quickAddModal.date.slice(8)}/{quickAddModal.date.slice(5, 7)}) · {quickAddModal.period === 'morning' ? 'Manhã' : quickAddModal.period === 'afternoon' ? 'Tarde' : 'Noite'}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold block mb-1">Título da Tarefa</label>
                <input
                  type="text"
                  autoFocus
                  placeholder="Ex: Reunião de Alinhamento ou Entrega do Módulo"
                  value={quickAddModal.title}
                  onChange={(e) => setQuickAddModal({ ...quickAddModal, title: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') submitQuickAdd()
                  }}
                  style={{
                    background: 'var(--color-background)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)',
                  }}
                  className="w-full px-3 py-2 text-xs rounded-lg border focus:border-[var(--color-primary)] outline-hidden transition-colors"
                />
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" style={{ color: 'var(--color-primary)' }} />
                  Horário (Opcional)
                </label>
                <input
                  type="time"
                  value={quickAddModal.time}
                  onChange={(e) => setQuickAddModal({ ...quickAddModal, time: e.target.value })}
                  style={{
                    background: 'var(--color-background)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)',
                  }}
                  className="w-full px-3 py-2 text-xs rounded-lg border focus:border-[var(--color-primary)] outline-hidden transition-colors"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--color-border)]">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setQuickAddModal(null)}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={submitQuickAdd}
                disabled={!quickAddModal.title.trim()}
              >
                Criar Card
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
