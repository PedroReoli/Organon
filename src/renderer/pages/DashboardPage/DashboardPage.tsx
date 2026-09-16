import React, { useEffect, useState, useMemo } from 'react'
import type { CalendarEvent, Card, DashboardLayoutMode, DashboardTemplate, DashboardWidget, Note, StudyState } from '@types'
import { expandCalendarEvents, getCurrentWeekDates, getTodayISO } from '@utils'
import type { AppView } from '../shared/InternalNav'
import { QuickSearchModal } from '../shared/modals/QuickSearchModal'
import { LocalSyncModal } from '../shared/modals/LocalSyncModal'
import { DashboardKpiRow } from './components/DashboardKpiRow'
import { WeeklyActivityChart, type DayActivity } from './components/WeeklyActivityChart'
import { PriorityDonutChart } from './components/PriorityDonutChart'
import { CompactTodayQueue } from './components/CompactTodayQueue'
import { ActiveSprintWidget } from './components/ActiveSprintWidget'
import { RecentNotesWidget } from './components/RecentNotesWidget'
import { ModernHubNavigation } from './components/ModernHubNavigation'
import { Sparkles, Clock, CheckCircle2 } from 'lucide-react'

export type DashboardSyncStatus = 'idle' | 'pending' | 'syncing' | 'synced' | 'error'

export interface DashboardHubCard {
  id: string
  label: string
  description: string
  accent: string
  primaryView: AppView
  views: Array<{ label: string; view: AppView }>
  metrics: Array<{ label: string; value: string }>
}

interface DashboardHomeProps {
  cards: Card[]
  calendarEvents: CalendarEvent[]
  notes: Note[]
  study?: StudyState
  hubCards?: DashboardHubCard[]
  projectsCount?: number
  playbooksCount?: number
  colorPalettesCount?: number
  clipboardCategoriesCount?: number
  clipboardItemsCount?: number
  syncStatus?: DashboardSyncStatus
  lastSyncAt?: string | null
  userLoggedIn?: boolean
  dashboardLayout?: DashboardLayoutMode
  dashboardWidgets?: DashboardWidget[]
  onDashboardLayoutChange?: (layout: DashboardLayoutMode) => void
  onDashboardWidgetsChange?: (widgets: DashboardWidget[]) => void
  dashboardTemplates?: DashboardTemplate[]
  onSaveTemplate?: (name: string, widgets: DashboardWidget[]) => void
  onDeleteTemplate?: (id: string) => void
  onNavigate: (view: AppView) => void
  onGoToPlannerCard: (cardId: string) => void
  onGoToCalendarDate: (dateISO: string) => void
  onOpenShortcut?: (url: string) => void
  onGoToNotes: () => void
}

const DAYS_ORDER_LABELS = [
  { key: 'mon' as const, label: 'Seg' },
  { key: 'tue' as const, label: 'Ter' },
  { key: 'wed' as const, label: 'Qua' },
  { key: 'thu' as const, label: 'Qui' },
  { key: 'fri' as const, label: 'Sex' },
  { key: 'sat' as const, label: 'Sáb' },
  { key: 'sun' as const, label: 'Dom' },
]

export const DashboardPage: React.FC<DashboardHomeProps> = ({
  cards,
  calendarEvents,
  notes,
  projectsCount = 0,
  onNavigate,
  onGoToPlannerCard,
  onGoToCalendarDate,
  onOpenShortcut,
  onGoToNotes,
}) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isQrSyncOpen, setIsQrSyncOpen] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())

  // Clock tick
  useEffect(() => {
    const interval = window.setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => window.clearInterval(interval)
  }, [])

  // Keyboard shortcut for Quick Search (Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setIsSearchOpen(prev => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const todayStr = getTodayISO()
  const weekDates = getCurrentWeekDates()

  // Compute Today's Cards
  const todayCards = useMemo(() => {
    return cards.filter(c => c.date === todayStr || (!c.date && c.status === 'todo'))
  }, [cards, todayStr])

  // Compute Priority counts
  const urgentCount = useMemo(() => cards.filter(c => c.priority === 'P1' && c.status !== 'done').length, [cards])
  const highCount = useMemo(() => cards.filter(c => c.priority === 'P2' && c.status !== 'done').length, [cards])
  const mediumCount = useMemo(() => cards.filter(c => (c.priority === 'P3' || !c.priority) && c.status !== 'done').length, [cards])
  const lowCount = useMemo(() => cards.filter(c => c.priority === 'P4' && c.status !== 'done').length, [cards])
  const completedTasks = useMemo(() => cards.filter(c => c.status === 'done').length, [cards])
  const completedCount = completedTasks
  const totalTasks = cards.length
  const pendingTasks = totalTasks - completedTasks

  // Compute Weekly Activity
  const weeklyData: DayActivity[] = useMemo(() => {
    return DAYS_ORDER_LABELS.map(({ key, label }) => {
      const date = weekDates[key]
      const dayCards = cards.filter(c => c.date === date)
      const dayEvents = expandCalendarEvents(calendarEvents, date, date).filter(e => e.date === date)
      const total = dayCards.length + dayEvents.length
      const completed = dayCards.filter(c => c.status === 'done').length
      return {
        key,
        label,
        date,
        total: Math.max(total, completed),
        completed,
        isToday: date === todayStr,
      }
    })
  }, [cards, calendarEvents, weekDates, todayStr])

  const weekTotal = weeklyData.reduce((acc, d) => acc + d.total, 0)
  const weekCompleted = weeklyData.reduce((acc, d) => acc + d.completed, 0)

  // Header date formatting
  const monthNames = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
  const dayNames = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']
  const hour = currentTime.getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'
  const timeFormatted = `${String(hour).padStart(2, '0')}:${String(currentTime.getMinutes()).padStart(2, '0')}`
  const dateFormatted = `${dayNames[currentTime.getDay()]}, ${currentTime.getDate()} de ${monthNames[currentTime.getMonth()]}`

  return (
    <div
      className="w-full h-full min-h-screen p-4 sm:p-6 overflow-y-auto space-y-4"
      style={{
        background: 'var(--color-background)',
        color: 'var(--color-text)',
      }}
    >
      {/* Search Modal */}
      {isSearchOpen && (
        <QuickSearchModal
          cards={cards}
          events={calendarEvents}
          shortcuts={[]}
          notes={notes}
          onClose={() => setIsSearchOpen(false)}
          onGoToPlannerCard={cardId => {
            setIsSearchOpen(false)
            onGoToPlannerCard(cardId)
          }}
          onGoToCalendarDate={dateISO => {
            setIsSearchOpen(false)
            onGoToCalendarDate(dateISO)
          }}
          onOpenShortcut={url => {
            setIsSearchOpen(false)
            onOpenShortcut?.(url)
          }}
          onGoToNotes={() => {
            setIsSearchOpen(false)
            onGoToNotes()
          }}
          onNavigate={view => {
            setIsSearchOpen(false)
            onNavigate(view as AppView)
          }}
        />
      )}

      {/* Local Sync QR Modal */}
      {isQrSyncOpen && (
        <LocalSyncModal
          isOpen={isQrSyncOpen}
          onClose={() => setIsQrSyncOpen(false)}
        />
      )}

      {/* Clean Cockpit Hero Banner (No duplicate navbar) */}
      <div
        style={{
          background: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
        }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl border shadow-xs transition-all"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              style={{
                background: 'color-mix(in srgb, var(--color-primary) 14%, transparent)',
                color: 'var(--color-primary)',
                borderColor: 'color-mix(in srgb, var(--color-primary) 28%, transparent)',
              }}
              className="text-xs font-bold px-2.5 py-0.5 rounded-md border flex items-center gap-1.5"
            >
              <Sparkles className="w-3 h-3" />
              Cockpit Geral
            </span>
            <span style={{ color: 'var(--color-text-muted)' }} className="text-xs font-medium flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {dateFormatted} • <strong style={{ color: 'var(--color-text)' }}>{timeFormatted}</strong>
            </span>
          </div>
          <h1
            style={{ color: 'var(--color-text)' }}
            className="text-lg sm:text-xl font-extrabold tracking-tight"
          >
            {greeting} · Painel Central do Organon
          </h1>
        </div>

        {/* Live Overview Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <div
            style={{
              background: 'color-mix(in srgb, var(--color-primary) 8%, var(--color-surface))',
              borderColor: 'color-mix(in srgb, var(--color-primary) 20%, transparent)',
              color: 'var(--color-text)',
            }}
            className="px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-2"
          >
            <CheckCircle2 className="w-3.5 h-3.5" style={{ color: 'var(--color-primary)' }} />
            <span><strong>{pendingTasks}</strong> pendentes hoje</span>
          </div>
        </div>
      </div>

      {/* 4 Metric KPI Badges */}
      <DashboardKpiRow
        totalTasks={totalTasks}
        pendingTasks={pendingTasks}
        completedTasks={completedTasks}
        weekCompleted={weekCompleted}
        weekTotal={weekTotal}
        notesCount={notes.length}
        projectsCount={projectsCount}
        onNavigateToTasks={() => onNavigate('planner')}
        onNavigateToNotes={onGoToNotes}
        onNavigateToProjects={() => onNavigate('projects')}
      />

      {/* Main Charts & Queue Grid (3 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        {/* Weekly Activity Bar Chart (5 Columns) */}
        <div className="lg:col-span-5 h-full">
          <WeeklyActivityChart
            days={weeklyData}
            onSelectDate={date => onGoToCalendarDate(date)}
          />
        </div>

        {/* Priority Donut Chart (3 Columns) */}
        <div className="lg:col-span-3 h-full">
          <PriorityDonutChart
            urgentCount={urgentCount}
            highCount={highCount}
            mediumCount={mediumCount}
            lowCount={lowCount}
            completedCount={completedCount}
          />
        </div>

        {/* Compact Today Executive Queue (4 Columns) */}
        <div className="lg:col-span-4 h-full">
          <CompactTodayQueue
            todayCards={todayCards}
            onToggleCard={cardId => {
              const card = cards.find(c => c.id === cardId)
              if (card) {
                card.status = card.status === 'done' ? 'todo' : 'done'
              }
            }}
            onGoToPlannerCard={onGoToPlannerCard}
            onNavigateToPlanner={() => onNavigate('planner')}
          />
        </div>
      </div>

      {/* Bottom Grid: Sprint Widget, Recent Notes & Modern Hub Navigation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <ActiveSprintWidget
          sprintName="Sprint 1 - Launch & Growth"
          goal="Finalizar Módulo de Planejamento e migrar notas legadas"
          startDate="16 Set"
          endDate="30 Set"
          completedPoints={completedCount}
          totalPoints={totalTasks || 10}
          onNavigateToSprint={() => onNavigate('planner')}
        />

        <RecentNotesWidget
          notes={notes}
          onOpenNote={() => onGoToNotes()}
          onNavigateToNotes={onGoToNotes}
        />

        <ModernHubNavigation onNavigate={onNavigate} />
      </div>
    </div>
  )
}
