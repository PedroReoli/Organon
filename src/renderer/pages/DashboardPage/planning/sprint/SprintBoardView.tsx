/**
 * SprintBoardView — Kanban moderno com backlog lateral + 4 colunas + subgrupos/lanes.
 *
 * Inclui:
 * - Painel de métricas e progresso da sprint (% concluído, horas estimadas, prioridades).
 * - Barra de busca e filtros por texto e prioridade.
 * - Suporte a drag-and-drop refinado com indicadores visuais claros.
 * - Modal completo de edição de card (SprintCardModal).
 * - Gerenciamento e visualização compacta de lanes/subgrupos.
 */

import React, { useMemo, useState, useCallback } from 'react'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  pointerWithin,
  closestCenter,
  useSensor,
  useSensors,
  useDroppable,
  defaultDropAnimationSideEffects,
  type CollisionDetection,
  type Modifier,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { SprintCard, SprintColumnSection, SprintMetadata, CardPriority } from '@types'
import { STATUS_COLORS, PRIORITY_COLORS, PRIORITY_LABELS } from '@types'
import { getCurrentSprintId, getSprintRange } from './sprintWeek'
import { useStore } from '../../../shared/hooks/useStore'
import { SprintCardModal } from './SprintCardModal'

/* ── Colunas fixas ──────────────────────────────────────────── */

interface FixedColumn { id: string; name: string; color: string }

const COLUMNS: FixedColumn[] = [
  { id: 'col-todo', name: 'A fazer', color: 'var(--color-primary)' },
  { id: 'col-doing', name: 'Em progresso', color: '#f59e0b' },
  { id: 'col-review', name: 'Review', color: '#a855f7' },
  { id: 'col-done', name: 'Concluido', color: '#22c55e' },
]

const COLUMN_IDS = new Set(COLUMNS.map((c) => c.id))

/* ── Modifier DragOverlay ───────────────────────────────────── */

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

/* ── Props ──────────────────────────────────────────────────── */

export interface SprintBoardViewProps {
  sprintCards: SprintCard[]
  sections: SprintColumnSection[]
  metadata: SprintMetadata[]
  onAddSprintCard: (title: string, columnId: string | null) => string | null
  onEditSprintCard: (cardId: string, updates: Partial<Omit<SprintCard, 'id' | 'createdAt'>>) => void
  onRemoveSprintCard: (cardId: string) => void
  onMoveSprintCard: (cardId: string, columnId: string | null, sectionId?: string | null) => void
  onOpenSprintCard?: (card: SprintCard) => void
  onAddSprintColumnSection: (columnId: string, name: string) => void
  onRemoveSprintColumnSection: (sectionId: string) => void
  onUpsertSprintMetadata: (metadata: SprintMetadata) => void
}

/* ── Card visual do sprint ──────────────────────────────────── */

const SprintCardItemLocal: React.FC<{
  card: SprintCard
  onClick?: (card: SprintCard) => void
  draggable?: boolean
}> = ({ card, onClick, draggable = true }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    disabled: !draggable,
  })

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    borderLeftColor: STATUS_COLORS[card.status] || '#6b7280',
  }

  const checkDone = card.checklist?.filter((it) => it.done).length ?? 0
  const checkTotal = card.checklist?.length ?? 0

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`sprint-card ${card.status === 'done' ? 'sprint-card--done' : ''} ${isDragging ? 'is-dragging-placeholder' : ''}`}
      onClick={(e) => { e.stopPropagation(); onClick?.(card) }}
      {...attributes}
      {...listeners}
    >
      <div className="sprint-card-header">
        <span className="sprint-card-drag-handle" title="Arraste para mover">
          <svg viewBox="0 0 16 16" fill="currentColor" width="10" height="10">
            <path d="M6 4h1v1H6V4Zm0 3h1v1H6V7Zm0 3h1v1H6v-1Zm3-6h1v1H9V4Zm0 3h1v1H9V7Zm0 3h1v1H9v-1Z" />
          </svg>
        </span>
        <span className="sprint-card-title">{card.title || 'Sem titulo'}</span>
      </div>
      <div className="sprint-card-meta">
        {card.priority && (
          <span
            className="sprint-card-priority"
            style={{ color: PRIORITY_COLORS[card.priority], borderColor: PRIORITY_COLORS[card.priority] }}
          >
            {PRIORITY_LABELS[card.priority] || card.priority}
          </span>
        )}
        {card.estimatedHours !== undefined && card.estimatedHours !== null && (
          <span className="sprint-card-time" title="Horas estimadas">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="10" height="10" style={{ marginRight: 3, verticalAlign: 'middle' }}>
              <circle cx="8" cy="8" r="6" />
              <path d="M8 4.5v4l2.5 1.5" />
            </svg>
            {card.estimatedHours}h
          </span>
        )}
        {checkTotal > 0 && (
          <span className="sprint-card-checklist" title="Subtarefas">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="10" height="10" style={{ marginRight: 3, verticalAlign: 'middle' }}>
              <path d="M3 8.5l3.5 3.5 6.5-6.5" />
            </svg>
            {checkDone}/{checkTotal}
          </span>
        )}
      </div>
    </div>
  )
}

/* ── Drop zone ──────────────────────────────────────────────── */

const DropZone: React.FC<{
  droppableId: string
  cards: SprintCard[]
  onOpenCard?: (card: SprintCard) => void
  className?: string
}> = ({ droppableId, cards, onOpenCard, className }) => {
  const { setNodeRef, isOver } = useDroppable({ id: droppableId })
  return (
    <div ref={setNodeRef} className={`sb2-drop ${isOver ? 'sb2-drop--over' : ''} ${className ?? ''}`}>
      <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        {cards.map((card) => (
          <SprintCardItemLocal key={card.id} card={card} onClick={onOpenCard} />
        ))}
      </SortableContext>
    </div>
  )
}

/* ── Modal de confirmacao de remocao ────────────────────────── */

const RemoveSectionModal: React.FC<{
  sectionName: string
  cardCount: number
  onConfirm: () => void
  onCancel: () => void
}> = ({ sectionName, cardCount, onConfirm, onCancel }) => (
  <div className="sb2-modal-overlay" onClick={onCancel}>
    <div className="sb2-modal" onClick={(e) => e.stopPropagation()}>
      <div className="sb2-modal-header">
        <div className="sb2-modal-icon">
          <svg viewBox="0 0 20 20" fill="none" width="20" height="20">
            <path d="M10 1.5 L18.5 17 H1.5 Z" stroke="#ef4444" strokeWidth="1.5" strokeLinejoin="round" fill="rgba(239,68,68,0.12)" />
            <line x1="10" y1="7" x2="10" y2="11.5" stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round" />
            <circle cx="10" cy="14" r="0.9" fill="#ef4444" />
          </svg>
        </div>
        <span className="sb2-modal-title">Remover subgrupo</span>
        <button type="button" className="sb2-modal-close" onClick={onCancel}>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="14" height="14">
            <path d="M4 4l8 8M12 4l-8 8" />
          </svg>
        </button>
      </div>
      <p className="sb2-modal-text">
        Remover o subgrupo <strong>{sectionName}</strong>?
        {cardCount > 0 && (
          <> Os {cardCount} cards dentro dele voltam para a coluna principal.</>
        )}
      </p>
      <div className="sb2-modal-actions">
        <button type="button" className="sb2-modal-btn sb2-modal-btn--danger" onClick={onConfirm}>
          Remover
        </button>
        <button type="button" className="sb2-modal-btn sb2-modal-btn--cancel" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </div>
  </div>
)

/* ── Componente principal ───────────────────────────────────── */

export const SprintBoardView: React.FC<SprintBoardViewProps> = ({
  sprintCards,
  sections,
  metadata: _metadata,
  onAddSprintCard,
  onEditSprintCard,
  onRemoveSprintCard,
  onMoveSprintCard,
  onOpenSprintCard,
  onAddSprintColumnSection,
  onRemoveSprintColumnSection,
  onUpsertSprintMetadata: _onUpsertSprintMetadata,
}) => {
  const [activeCard, setActiveCard] = useState<SprintCard | null>(null)
  const [editingCard, setEditingCard] = useState<SprintCard | null>(null)
  const [addingSectionInCol, setAddingSectionInCol] = useState<string | null>(null)
  const [sectionName, setSectionName] = useState('')
  const [quickTitle, setQuickTitle] = useState('')
  const [colQuickAdd, setColQuickAdd] = useState<{ colId: string; title: string } | null>(null)
  const [removingSection, setRemovingSection] = useState<{ id: string; name: string; cardCount: number } | null>(null)

  /* Filtros e Busca */
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState<CardPriority | 'all'>('all')
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({})

  const store = useStore()
  const activeSprintId = store.sprintBoardConfig?.activeSprintId
  const setActiveSprint = store.setActiveSprint

  /* Sprint atual */
  const realCurrentSprintId = useMemo(() => getCurrentSprintId(), [])
  const currentSprintId = activeSprintId ?? realCurrentSprintId
  const sprintRange = useMemo(() => getSprintRange(currentSprintId), [currentSprintId])

  /* Sprints disponiveis */
  const availableSprints = useMemo(() => {
    const list = _metadata.map(m => m.id).filter(id => typeof id === 'string' && id.trim() !== '')
    if (!list.includes(realCurrentSprintId)) list.push(realCurrentSprintId)
    if (activeSprintId && typeof activeSprintId === 'string' && !list.includes(activeSprintId)) list.push(activeSprintId)
    return Array.from(new Set(list)).sort().reverse()
  }, [_metadata, realCurrentSprintId, activeSprintId])

  /* Cards filtrados */
  const filteredSprintCards = useMemo(() => {
    return sprintCards.filter((card) => {
      if (activeSprintId && card.sprintId && card.sprintId !== activeSprintId) return false
      if (selectedPriorityFilter !== 'all' && card.priority !== selectedPriorityFilter) return false
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const matchTitle = card.title?.toLowerCase().includes(query)
        const matchDesc = card.description?.toLowerCase().includes(query)
        if (!matchTitle && !matchDesc) return false
      }
      return true
    })
  }, [sprintCards, activeSprintId, selectedPriorityFilter, searchQuery])

  /* Estatisticas & Metricas da Sprint */
  const stats = useMemo(() => {
    const currentCards = sprintCards.filter(c => !activeSprintId || c.sprintId === activeSprintId)
    const total = currentCards.length
    const done = currentCards.filter(c => c.columnId === 'col-done' || c.status === 'done').length
    const doing = currentCards.filter(c => c.columnId === 'col-doing' || c.status === 'in_progress').length
    const todo = currentCards.filter(c => c.columnId === 'col-todo' || c.status === 'todo').length
    const review = currentCards.filter(c => c.columnId === 'col-review').length
    const totalHours = currentCards.reduce((acc, c) => acc + (c.estimatedHours || 0), 0)
    const percent = total > 0 ? Math.round((done / total) * 100) : 0

    return { total, done, doing, todo, review, totalHours, percent }
  }, [sprintCards, activeSprintId])

  /* Backlog: sem columnId ou columnId nao reconhecido */
  const backlogCards = useMemo(
    () => filteredSprintCards.filter((c) => (!c.columnId || !COLUMN_IDS.has(c.columnId))),
    [filteredSprintCards],
  )

  /* Cards por coluna */
  const cardsByColumn = useMemo(() => {
    const map = new Map<string, SprintCard[]>()
    for (const col of COLUMNS) map.set(col.id, [])
    for (const card of filteredSprintCards) {
      if (card.columnId && COLUMN_IDS.has(card.columnId)) {
        map.get(card.columnId)!.push(card)
      }
    }
    return map
  }, [filteredSprintCards])

  /* DnD Sensors */
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 5 } }),
    useSensor(KeyboardSensor),
  )

  const collisionDetection = useCallback<CollisionDetection>((args) => {
    const hits = pointerWithin(args)
    if (hits.length > 0) {
      const sectionHit = hits.find((h) => (h.id as string).startsWith('sec:'))
      if (sectionHit) return [sectionHit]
      const colHit = hits.find((h) => (h.id as string).startsWith('col:'))
      if (colHit) return [colHit]
      const backlogHit = hits.find((h) => (h.id as string) === 'sprint-backlog')
      if (backlogHit) return [backlogHit]
      return [hits[0]]
    }
    return closestCenter(args)
  }, [])

  const handleDragStart = useCallback((e: DragStartEvent) => {
    const card = sprintCards.find((c) => c.id === e.active.id)
    setActiveCard(card ?? null)
  }, [sprintCards])

  const handleDragEnd = useCallback((e: DragEndEvent) => {
    setActiveCard(null)
    if (!e.over) return
    const cardId = e.active.id as string
    const overId = e.over.id as string

    if (overId === 'sprint-backlog') {
      onMoveSprintCard(cardId, null, null)
      return
    }
    if (overId.startsWith('sec:')) {
      const parts = overId.split(':')
      onMoveSprintCard(cardId, parts[1], parts[2])
      return
    }
    if (overId.startsWith('col:')) {
      onMoveSprintCard(cardId, overId.split(':')[1], null)
      return
    }
    const target = sprintCards.find((c) => c.id === overId)
    if (target) {
      onMoveSprintCard(cardId, target.columnId, target.sectionId)
    }
  }, [sprintCards, onMoveSprintCard])

  const handleQuickAdd = useCallback(() => {
    const title = quickTitle.trim()
    if (!title) return
    onAddSprintCard(title, null)
    setQuickTitle('')
  }, [quickTitle, onAddSprintCard])

  const handleColQuickAdd = useCallback(() => {
    if (!colQuickAdd) return
    const title = colQuickAdd.title.trim()
    if (!title) return
    onAddSprintCard(title, colQuickAdd.colId)
    setColQuickAdd(null)
  }, [colQuickAdd, onAddSprintCard])

  const handleAddSection = useCallback((columnId: string) => {
    const name = sectionName.trim()
    if (!name) return
    onAddSprintColumnSection(columnId, name)
    setSectionName('')
    setAddingSectionInCol(null)
  }, [sectionName, onAddSprintColumnSection])

  const handleConfirmRemoveSection = useCallback(() => {
    if (!removingSection) return
    onRemoveSprintColumnSection(removingSection.id)
    setRemovingSection(null)
  }, [removingSection, onRemoveSprintColumnSection])

  const toggleSectionCollapse = useCallback((sectionId: string) => {
    setCollapsedSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }))
  }, [])

  const handleOpenCard = useCallback((card: SprintCard) => {
    if (onOpenSprintCard) {
      onOpenSprintCard(card)
    } else {
      setEditingCard(card)
    }
  }, [onOpenSprintCard])

  return (
    <div className="sb2">
      {/* Metrics & Header Toolbar */}
      <div className="sb2-toolbar">
        <div className="sb2-info">
          <select 
            className="sb2-sprint-selector form-input"
            value={currentSprintId}
            onChange={(e) => setActiveSprint(e.target.value)}
          >
            {availableSprints.map(spId => (
              <option key={spId} value={spId}>
                Sprint {typeof spId === 'string' ? spId.replace('-W', ' S') : spId} {spId === realCurrentSprintId ? '(Atual)' : ''}
              </option>
            ))}
          </select>
          <span className="sb2-range">{sprintRange.startDate} — {sprintRange.endDate}</span>
          
          <div className="sb2-metrics-bar">
            <span className="sb2-metric-chip" title="Total de Cards">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="12" height="12" style={{ marginRight: 4, verticalAlign: 'middle' }}>
                <path d="M2.5 5.5l5.5-3 5.5 3v5l-5.5 3-5.5-3z" />
                <path d="M2.5 5.5l5.5 3 5.5-3" />
                <path d="M8 8.5v6" />
              </svg>
              <strong>{stats.total}</strong> cards
            </span>
            <span className="sb2-metric-chip" title="Total Estimado">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="12" height="12" style={{ marginRight: 4, verticalAlign: 'middle' }}>
                <circle cx="8" cy="8" r="6" />
                <path d="M8 4.5v4l2.5 1.5" />
              </svg>
              <strong>{stats.totalHours}h</strong> estimadas
            </span>
            <div className="sb2-progress-box" title={`Progresso: ${stats.percent}% (${stats.done}/${stats.total} concluidos)`}>
              <div className="sb2-progress-track">
                <div className="sb2-progress-fill" style={{ width: `${stats.percent}%` }} />
              </div>
              <span className="sb2-progress-percent">{stats.percent}%</span>
            </div>
          </div>
        </div>

        {/* Busca e Filtros */}
        <div className="sb2-filters-bar">
          <div className="sb2-search-box">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="13" height="13">
              <circle cx="6.5" cy="6.5" r="4.5" />
              <path d="M10 10l4 4" />
            </svg>
            <input
              type="text"
              className="sb2-search-input"
              placeholder="Buscar card na sprint..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="sb2-search-clear" onClick={() => setSearchQuery('')}>&times;</button>
            )}
          </div>

          <div className="sb2-prio-filter">
            <button
              className={`sb2-filter-btn ${selectedPriorityFilter === 'all' ? 'is-active' : ''}`}
              onClick={() => setSelectedPriorityFilter('all')}
            >
              Todas
            </button>
            {(['P1', 'P2', 'P3', 'P4'] as CardPriority[]).map((p) => (
              <button
                key={p}
                className={`sb2-filter-btn ${selectedPriorityFilter === p ? 'is-active' : ''}`}
                style={{ color: PRIORITY_COLORS[p] }}
                onClick={() => setSelectedPriorityFilter(selectedPriorityFilter === p ? 'all' : p)}
              >
                {PRIORITY_LABELS[p]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Board Layout */}
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="sb2-body">
          {/* Backlog lateral */}
          <aside className="sb2-backlog">
            <div className="sb2-backlog-header">
              <span>Backlog</span>
              <span className="sb2-backlog-count">{backlogCards.length}</span>
            </div>
            <div className="sb2-backlog-quick">
              <input
                type="text"
                className="form-input"
                placeholder="+ Criar Card no Backlog"
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleQuickAdd() }}
              />
            </div>
            <DropZone
              droppableId="sprint-backlog"
              cards={backlogCards}
              onOpenCard={handleOpenCard}
              className="sb2-backlog-list"
            />
          </aside>

          {/* Colunas Kanban com Lanes/Subgrupos */}
          <div className="sb2-scroll">
            <div className="sb2-columns">
              {COLUMNS.map((col) => {
                const colCards = cardsByColumn.get(col.id) ?? []
                const colSections = sections.filter((s) => s.columnId === col.id).sort((a, b) => a.order - b.order)
                const unsectionedCards = colCards.filter((c) => !c.sectionId || !colSections.some((s) => s.id === c.sectionId))
                const isAddingSection = addingSectionInCol === col.id

                return (
                  <div key={col.id} className="sb2-col">
                    {/* Header da coluna */}
                    <div className="sb2-col-head" style={{ borderTopColor: col.color }}>
                      <span className="sb2-col-name">{col.name}</span>
                      <span className="sb2-col-count">{colCards.length}</span>
                      <button
                        type="button"
                        className="sb2-col-btn sb2-col-btn--add-card"
                        title="Adicionar card nesta coluna"
                        onClick={() => setColQuickAdd(colQuickAdd?.colId === col.id ? null : { colId: col.id, title: '' })}
                      >
                        + Card
                      </button>
                      <button
                        type="button"
                        className="sb2-col-btn"
                        title="Adicionar subgrupo (lane)"
                        onClick={() => { setAddingSectionInCol(isAddingSection ? null : col.id); setSectionName('') }}
                      >
                        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="12" height="12">
                          <rect x="2" y="2" width="12" height="12" rx="2" />
                          <path d="M5 6h6M5 10h4" />
                        </svg>
                      </button>
                    </div>

                    {/* Form add card inline */}
                    {colQuickAdd?.colId === col.id && (
                      <div className="sb2-add-form">
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Titulo do card..."
                          value={colQuickAdd.title}
                          autoFocus
                          onChange={(e) => setColQuickAdd({ ...colQuickAdd, title: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') { e.preventDefault(); handleColQuickAdd() }
                            if (e.key === 'Escape') { setColQuickAdd(null) }
                          }}
                        />
                      </div>
                    )}

                    {/* Form add subgrupo/lane */}
                    {isAddingSection && (
                      <div className="sb2-add-form">
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Nome do subgrupo/lane..."
                          value={sectionName}
                          autoFocus
                          onChange={(e) => setSectionName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') { e.preventDefault(); handleAddSection(col.id) }
                            if (e.key === 'Escape') { setAddingSectionInCol(null); setSectionName('') }
                          }}
                        />
                      </div>
                    )}

                    {/* Cards sem subgrupo/lane */}
                    <DropZone
                      droppableId={`col:${col.id}`}
                      cards={unsectionedCards}
                      onOpenCard={handleOpenCard}
                    />

                    {/* Lanes / Subgrupos */}
                    {colSections.map((sec) => {
                      const secCards = colCards.filter((c) => c.sectionId === sec.id)
                      const isCollapsed = !!collapsedSections[sec.id]

                      return (
                        <div key={sec.id} className="sb2-sec" style={{ '--sec-color': col.color } as React.CSSProperties}>
                          <div className="sb2-sec-head" onClick={() => toggleSectionCollapse(sec.id)}>
                            <button
                              type="button"
                              className="sb2-sec-toggle"
                              title={isCollapsed ? 'Expandir lane' : 'Recolher lane'}
                            >
                              <svg
                                viewBox="0 0 16 16"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                width="10"
                                height="10"
                                style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}
                              >
                                <path d="M4 6l4 4 4-4" />
                              </svg>
                            </button>
                            <span className="sb2-sec-name">{sec.name}</span>
                            <span className="sb2-sec-count">{secCards.length}</span>
                            <button
                              type="button"
                              className="sb2-sec-remove"
                              title="Remover subgrupo"
                              onClick={(e) => {
                                e.stopPropagation()
                                setRemovingSection({ id: sec.id, name: sec.name, cardCount: secCards.length })
                              }}
                            >
                              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="12" height="12">
                                <path d="M3 4h10M5.5 4V3a1 1 0 011-1h3a1 1 0 011 1v1M6.5 7v5M9.5 7v5M4.5 4l.5 9a1 1 0 001 1h4a1 1 0 001-1l.5-9" />
                              </svg>
                            </button>
                          </div>
                          {!isCollapsed && (
                            <DropZone
                              droppableId={`sec:${col.id}:${sec.id}`}
                              cards={secCards}
                              onOpenCard={handleOpenCard}
                            />
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Drag Overlay */}
        <DragOverlay 
          dropAnimation={{
            duration: 220,
            easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
            sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.4' } } })
          }} 
          modifiers={[snapToCursor]}
        >
          {activeCard ? <SprintCardItemLocal card={activeCard} draggable={false} /> : null}
        </DragOverlay>
      </DndContext>

      {/* Modal de Detalhes do Card */}
      {editingCard && (
        <SprintCardModal
          card={editingCard}
          sections={sections}
          onClose={() => setEditingCard(null)}
          onSave={(updates) => {
            onEditSprintCard(editingCard.id, updates)
            setEditingCard(null)
          }}
          onDelete={() => {
            onRemoveSprintCard(editingCard.id)
            setEditingCard(null)
          }}
        />
      )}

      {/* Modal de Confirmacao de Remocao de Subgrupo */}
      {removingSection && (
        <RemoveSectionModal
          sectionName={removingSection.name}
          cardCount={removingSection.cardCount}
          onConfirm={handleConfirmRemoveSection}
          onCancel={() => setRemovingSection(null)}
        />
      )}
    </div>
  )
}
