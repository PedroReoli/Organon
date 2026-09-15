/**
 * HubPlanejamento — orquestrador do Hub Planejamento (Upgrade 01).
 *
 * 6 abas planas: Home | Periodo | Horaria | Sprint | Mes | Timeline.
 * Sem sidebar — tudo migrado para a Home ou para toolbars internas das vistas.
 *
 * Cada vista e um componente isolado em components/planning/views ou
 * components/planning/sprint. A Home tambem e um componente proprio
 * (PlanningHomePage) inspirado em NotesHomePage.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import type {
  Card,
  CalendarEvent,
  AgendaCategory,
  CardLocation,
  Day,
  Period,
  Project,
  SprintCard,
  SprintColumnSection,
  SprintMetadata,
} from '@types'
import { CalendarEventModal } from '../../CalendarPage/components/CalendarEventModal'
import { PlanningHomePage, type PlanningTabId } from '../planning/PlanningHomePage'
import { PeriodView } from '../planning/views/PeriodView'
import { HourlyView } from '../planning/views/HourlyView'
import { MonthView } from '../planning/views/MonthView'
import { TimelineView } from '../planning/views/TimelineView'
import { PlanningAnalyticsView } from '../planning/views/PlanningAnalyticsView'
import { SprintBoardView } from '../planning/sprint/SprintBoardView'
import { CardModal } from '../components/CardModal'
import { getTodayISO, getWeekDatesForOffset } from '@utils'
import { usePlannerPreferences } from '@hooks/usePlannerPreferences'

const STORAGE_KEY = 'organon:planningTab'

interface HubPlanejamentoProps {
  activeView?: string
  cards: Card[]
  calendarEvents: CalendarEvent[]
  projects?: Project[]
  reduceModeSignal?: number
  getCardsForLocation: (day: Day | null, period: Period | null) => Card[]
  onAddCard: (title: string) => string | void
  onAddCardWithDate?: (input: { title: string; date: string; location: CardLocation; time?: string | null }) => string | null
  onEditCard: (cardId: string, updates: Partial<Card>) => void
  onRemoveCard: (cardId: string) => void
  onMoveCard: (cardId: string, newLocation: CardLocation, newIndex: number, weekDates?: Record<Day, string>) => void
  onReorderCard: (day: Day | null, period: Period | null, orderedIds: string[]) => void
  onEditEvent: (eventId: string, updates: Partial<Omit<CalendarEvent, 'id' | 'createdAt'>>) => void
  onRemoveEvent: (eventId: string) => void
  onAddEvent: (input: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>) => void
  calendarCategories: AgendaCategory[]
  onAddCalendarCategory: (name: string, color: string) => string | null
  onRemoveCalendarCategory: (catId: string) => void
  openCardId?: string | null
  onOpenCardHandled?: () => void
  isLoggedIn?: boolean
  pendingCalendarDate?: string | null
  onFocusDateHandled?: () => void
  // Sprint Board v2 — entidade propria
  sprintCards: SprintCard[]
  sprintColumnSections: SprintColumnSection[]
  sprintMetadata: SprintMetadata[]
  onAddSprintCard: (title: string, columnId: string | null) => string | null
  onEditSprintCard: (cardId: string, updates: Partial<Omit<SprintCard, 'id' | 'createdAt'>>) => void
  onRemoveSprintCard: (cardId: string) => void
  onMoveSprintCard: (cardId: string, columnId: string | null, sectionId?: string | null) => void
  onAddSprintColumnSection: (columnId: string, name: string) => void
  onRemoveSprintColumnSection: (sectionId: string) => void
  onUpsertSprintMetadata: (metadata: SprintMetadata) => void
}

export const HubPlanejamento: React.FC<HubPlanejamentoProps> = ({
  activeView,
  cards,
  calendarEvents,
  projects,
  onAddCard,
  onAddCardWithDate,
  onEditCard,
  onRemoveCard,
  onEditEvent,
  onRemoveEvent,
  onAddEvent,
  calendarCategories,
  onAddCalendarCategory,
  onRemoveCalendarCategory: _onRemoveCalendarCategory,
  openCardId,
  onOpenCardHandled,
  isLoggedIn = false,
  pendingCalendarDate,
  onFocusDateHandled,
  sprintCards,
  sprintColumnSections,
  sprintMetadata,
  onAddSprintCard,
  onEditSprintCard,
  onRemoveSprintCard,
  onMoveSprintCard,
  onAddSprintColumnSection,
  onRemoveSprintColumnSection,
  onUpsertSprintMetadata,
}) => {
  const [tab, setTabRaw] = useState<PlanningTabId>(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY)
      if (v === 'home' || v === 'period' || v === 'hourly' || v === 'sprint' || v === 'month' || v === 'timeline' || v === 'analytics') return v
    } catch {}
    return 'home'
  })
  const setTab = useCallback((t: PlanningTabId) => {
    setTabRaw(t)
    try { localStorage.setItem(STORAGE_KEY, t) } catch {}
  }, [])

  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [creatingEvent, setCreatingEvent] = useState<CalendarEvent | null>(null)
  const [openedCard, setOpenedCard] = useState<Card | null>(null)

  const { prefs } = usePlannerPreferences(isLoggedIn)

  const weekDates = useMemo(() => getWeekDatesForOffset(weekOffset), [weekOffset])
  const today = getTodayISO()

  // Effect: openCardId externo
  useEffect(() => {
    if (!openCardId) return
    const card = cards.find((c) => c.id === openCardId)
    if (card) {
      setOpenedCard(card)
      onOpenCardHandled?.()
    }
  }, [openCardId, cards, onOpenCardHandled])

  // Effect: activeView === 'calendar' → navega para aba Mês
  useEffect(() => {
    if (activeView === 'calendar') {
      setTab('month')
    }
  }, [activeView])

  // Effect: pendingCalendarDate
  useEffect(() => {
    if (!pendingCalendarDate) return
    setSelectedDate(pendingCalendarDate)
    setTab('month')
    onFocusDateHandled?.()
  }, [pendingCalendarDate, onFocusDateHandled])

  const handleCreateCard = useCallback(() => {
    const id = onAddCard('Novo card')
    if (typeof id === 'string') {
      const newCard = cards.find((c) => c.id === id)
      if (newCard) setOpenedCard(newCard)
    }
  }, [cards, onAddCard])

  const handleCreateEvent = useCallback(() => {
    const date = selectedDate ?? today
    setCreatingEvent({
      id: '',
      title: '',
      date,
      time: null,
      recurrence: null,
      reminder: null,
      description: '',
      color: 'var(--color-primary)',
      categoryId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  }, [selectedDate, today])

  const handlePeriodAddCard = useCallback((title: string, location: CardLocation, date: string | null, time?: string | null) => {
    if (date) {
      onAddCardWithDate?.({ title, date, location, time })
    } else {
      onAddCard(title)
    }
  }, [onAddCard, onAddCardWithDate])

  const handlePeriodMoveCard = useCallback((cardId: string, location: CardLocation, date: string | null) => {
    onEditCard(cardId, {
      location,
      date,
      hasDate: date !== null,
      time: null,
    })
  }, [onEditCard])

  const handleHourlyMoveCard = useCallback((cardId: string, location: CardLocation, date: string | null, time: string | null) => {
    onEditCard(cardId, {
      location,
      date,
      time,
      hasDate: date !== null,
    })
  }, [onEditCard])

  const TABS: { id: PlanningTabId; label: string; icon: JSX.Element }[] = [
    { id: 'home', label: 'Home', icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14"><path d="M2 8.5 8 3l6 5.5" /><path d="M3.5 7.5V13h9V7.5" /></svg> },
    { id: 'period', label: 'Período', icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14"><rect x="2" y="3" width="12" height="10" rx="1.5" /><path d="M2 6h12" /><path d="M5.5 1.5v3M10.5 1.5v3" /></svg> },
    { id: 'hourly', label: 'Horária', icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14"><circle cx="8" cy="8" r="6" /><polyline points="8 4.5 8 8 10.5 10" /></svg> },
    { id: 'sprint', label: 'Sprint', icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14"><path d="M2 3h4l2 2h6v8H2z" /></svg> },
    { id: 'month', label: 'Mês', icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14"><rect x="2" y="3" width="12" height="10" rx="1.5" /><path d="M2 6h12" /><circle cx="8" cy="10" r="1" fill="currentColor" stroke="none" /></svg> },
    { id: 'timeline', label: 'Timeline', icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14"><path d="M3 3v10M7 5v8M11 4v9" /><circle cx="3" cy="6" r="1.5" fill="currentColor" stroke="none" /><circle cx="7" cy="9" r="1.5" fill="currentColor" stroke="none" /><circle cx="11" cy="7" r="1.5" fill="currentColor" stroke="none" /></svg> },
    { id: 'analytics', label: 'Desempenho', icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14"><path d="M2 13h12M4 10l3-4 3 2 4-6" /></svg> },
  ]

  return (
    <div className="planning-hub" data-debug-name="hubs/HubPlanejamento">
      <header className="planning-hub-header">
        <nav className="planning-hub-tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`planning-hub-tab ${tab === t.id ? 'is-active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              <span className="planning-hub-tab-icon">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <div className="planning-hub-body planning-hub-body--full">
        {tab === 'home' && (
          <PlanningHomePage
            cards={cards}
            calendarEvents={calendarEvents}
            sprintMetadata={sprintMetadata}
            onNavigate={setTab}
            onCreateCard={handleCreateCard}
            onCreateEvent={handleCreateEvent}
            onSelectDate={(iso) => {
              setSelectedDate(iso)
              setTab('period')
            }}
          />
        )}

        {tab === 'period' && (
          <PeriodView
            cards={cards}
            projects={projects}
            weekOffset={weekOffset}
            onPrevWeek={() => setWeekOffset((o) => o - 1)}
            onNextWeek={() => setWeekOffset((o) => o + 1)}
            onToday={() => setWeekOffset(0)}
            weekDates={weekDates}
            onAddCard={handlePeriodAddCard}
            onMoveCard={handlePeriodMoveCard}
            onOpenCard={setOpenedCard}
          />
        )}

        {tab === 'hourly' && (
          <HourlyView
            cards={cards}
            projects={projects}
            weekOffset={weekOffset}
            onPrevWeek={() => setWeekOffset((o) => o - 1)}
            onNextWeek={() => setWeekOffset((o) => o + 1)}
            onToday={() => setWeekOffset(0)}
            weekDates={weekDates}
            prefs={prefs}
            onAddCard={handlePeriodAddCard}
            onMoveCard={handleHourlyMoveCard}
            onEditCard={onEditCard}
            onOpenCard={setOpenedCard}
          />
        )}

        {tab === 'sprint' && (
          <SprintBoardView
            sprintCards={sprintCards}
            sections={sprintColumnSections}
            metadata={sprintMetadata}
            onAddSprintCard={onAddSprintCard}
            onEditSprintCard={onEditSprintCard}
            onRemoveSprintCard={onRemoveSprintCard}
            onMoveSprintCard={onMoveSprintCard}
            onAddSprintColumnSection={onAddSprintColumnSection}
            onRemoveSprintColumnSection={onRemoveSprintColumnSection}
            onUpsertSprintMetadata={onUpsertSprintMetadata}
          />
        )}

        {tab === 'month' && (
          <MonthView
            cards={cards}
            calendarEvents={calendarEvents}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onOpenDay={(iso) => {
              setSelectedDate(iso)
              setTab('period')
            }}
            onCreateEvent={(date) => setCreatingEvent({
              id: '',
              title: '',
              date,
              time: null,
              recurrence: null,
              reminder: null,
              description: '',
              color: 'var(--color-primary)',
              categoryId: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            })}
            onEditEvent={setEditingEvent}
            onUpdateEvent={onEditEvent}
            onUpdateCard={onEditCard}
            onOpenCard={setOpenedCard}
          />
        )}

        {tab === 'timeline' && (
          <TimelineView
            cards={cards}
            calendarEvents={calendarEvents}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onEditEvent={setEditingEvent}
            onUpdateEvent={onEditEvent}
            onUpdateCard={onEditCard}
            onOpenCard={setOpenedCard}
            onCreateEvent={(date) => setCreatingEvent({
              id: '',
              title: '',
              date,
              time: null,
              recurrence: null,
              reminder: null,
              description: '',
              color: 'var(--color-primary)',
              categoryId: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            })}
          />
        )}

        {tab === 'analytics' && (
          <PlanningAnalyticsView
            cards={cards}
            sprintCards={sprintCards}
            onOpenCard={setOpenedCard}
            onUpdateCard={onEditCard}
          />
        )}
      </div>

      {openedCard && (
        <CardModal
          card={openedCard}
          projects={projects ?? []}
          onClose={() => setOpenedCard(null)}
          onSave={(updates) => {
            onEditCard(openedCard.id, updates)
            setOpenedCard(null)
          }}
          onDelete={() => {
            onRemoveCard(openedCard.id)
            setOpenedCard(null)
          }}
        />
      )}

      {editingEvent && (
        <CalendarEventModal
          event={editingEvent}
          defaultPeriod="morning"
          categories={calendarCategories}
          onAddCategory={onAddCalendarCategory}
          onClose={() => setEditingEvent(null)}
          onSave={(updates) => {
            onEditEvent(editingEvent.id, updates)
            setEditingEvent(null)
          }}
          onDelete={() => {
            onRemoveEvent(editingEvent.id)
            setEditingEvent(null)
          }}
        />
      )}

      {creatingEvent && (
        <CalendarEventModal
          event={creatingEvent}
          defaultPeriod="morning"
          categories={calendarCategories}
          onAddCategory={onAddCalendarCategory}
          onClose={() => setCreatingEvent(null)}
          onSave={(updates) => {
            if (!updates.title?.trim()) return
            onAddEvent({
              title: updates.title!,
              date: updates.date ?? creatingEvent.date,
              time: updates.time ?? null,
              color: updates.color ?? 'var(--color-primary)',
              description: updates.description ?? '',
              recurrence: updates.recurrence ?? null,
              reminder: updates.reminder ?? null,
              categoryId: updates.categoryId ?? null,
            })
            setCreatingEvent(null)
          }}
          onDelete={() => setCreatingEvent(null)}
        />
      )}
    </div>
  )
}
