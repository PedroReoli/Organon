import { useEffect, useState } from 'react'
import type { CalendarEvent, Card, DashboardLayoutMode, DashboardTemplate, DashboardWidget, Note, Period, StudyState } from '@types'
import { expandCalendarEvents, getCurrentWeekDates, getDayFromDate, getTodayISO } from '@utils'
import type { AppView } from '../shared/InternalNav'
import { QuickSearchModal } from '../shared/modals/QuickSearchModal'
import { LocalSyncModal } from '../shared/modals/LocalSyncModal'
import { CustomLayout } from './today/CustomLayout'
import { AgendaCard } from './dashboard/AgendaCard'
import { FocusCard } from './dashboard/FocusCard'
import { WeekOverviewCard } from './dashboard/WeekOverviewCard'
import { ProjectsSummaryCard } from './dashboard/ProjectsSummaryCard'
import { HubGroupCard } from './dashboard/HubGroupCard'
import { SystemSummaryCard } from './dashboard/SystemSummaryCard'

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
  study: StudyState
  hubCards: DashboardHubCard[]
  crmContactsCount: number
  projectsCount: number
  playbooksCount: number
  colorPalettesCount: number
  clipboardCategoriesCount: number
  clipboardItemsCount: number
  syncStatus: DashboardSyncStatus
  lastSyncAt?: string | null
  userLoggedIn: boolean
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
  { key: 'sat' as const, label: 'Sab' },
  { key: 'sun' as const, label: 'Dom' },
]

import img01Planejamento from '../../images/organon_icons/01_planejamento.png'
import img02Calendario from '../../images/organon_icons/02_calendario.png'
import img04Estudos from '../../images/organon_icons/04_estudos.png'
import img05Notas from '../../images/organon_icons/05_notas.png'
import img06Playbook from '../../images/organon_icons/06_playbook.png'
import img07Crm from '../../images/organon_icons/07_crm.png'
import img08Projetos from '../../images/organon_icons/08_projetos.png'
import img12Whisper from '../../images/organon_icons/12_whisper.png'
import img13Clipboard from '../../images/organon_icons/13_clipboard.png'
import img14Cores from '../../images/organon_icons/14_cores.png'
import img15Workflows from '../../images/organon_icons/15_workflows.png'
import img16Configuracoes from '../../images/organon_icons/16_configuracoes.png'
import img17Historico from '../../images/organon_icons/17_historico.png'

const imgStyle: React.CSSProperties = {
  width: 22,
  height: 22,
  objectFit: 'contain',
  display: 'inline-block',
  verticalAlign: 'middle',
}

const HUB_VIEW_ICONS: Record<AppView, JSX.Element> = {
  today: <img src={img01Planejamento} alt="Hoje" style={imgStyle} />,
  planner: <img src={img01Planejamento} alt="Planejamento" style={imgStyle} />,
  agenda: <img src={img01Planejamento} alt="Agenda" style={imgStyle} />,
  calendar: <img src={img02Calendario} alt="Calendário" style={imgStyle} />,
  habits: <img src={img01Planejamento} alt="Hábitos" style={imgStyle} />,
  study: <img src={img04Estudos} alt="Modo Foco" style={imgStyle} />,
  notes: <img src={img05Notas} alt="Notas" style={imgStyle} />,
  playbook: <img src={img06Playbook} alt="Playbook" style={imgStyle} />,
  crm: <img src={img07Crm} alt="CRM" style={imgStyle} />,
  projects: <img src={img08Projetos} alt="Projetos" style={imgStyle} />,
  financial: <img src={img01Planejamento} alt="Financeiro" style={imgStyle} />,
  apps: <img src={img01Planejamento} alt="Apps" style={imgStyle} />,
  shortcuts: <img src={img01Planejamento} alt="Atalhos" style={imgStyle} />,
  transcripts: <img src={img12Whisper} alt="Whisper" style={imgStyle} />,
  audio: <img src={img12Whisper} alt="Áudio" style={imgStyle} />,
  clipboard: <img src={img13Clipboard} alt="Clipboard" style={imgStyle} />,
  colors: <img src={img14Cores} alt="Cores" style={imgStyle} />,
  workflow: <img src={img15Workflows} alt="Workflow" style={imgStyle} />,
  'system-design': <img src={img15Workflows} alt="System Design" style={imgStyle} />,
  canvas: <img src={img15Workflows} alt="Canvas" style={imgStyle} />,
  settings: <img src={img16Configuracoes} alt="Configurações" style={imgStyle} />,
  history: <img src={img17Historico} alt="Histórico" style={imgStyle} />,
  library: <img src={img06Playbook} alt="Biblioteca" style={imgStyle} />,
  okrs: <img src={img08Projetos} alt="OKRs" style={imgStyle} />,
}

const SYNC_STATUS_LABELS: Record<DashboardSyncStatus, string> = {
  idle: 'Local',
  pending: 'Pendente',
  syncing: 'Sincronizando',
  synced: 'Sincronizado',
  error: 'Erro',
}

export const DashboardPage = ({
  cards,
  calendarEvents,
  notes,
  study,
  hubCards,
  crmContactsCount,
  projectsCount,
  playbooksCount,
  colorPalettesCount,
  clipboardCategoriesCount,
  clipboardItemsCount,
  syncStatus,
  lastSyncAt,
  userLoggedIn,
  dashboardLayout = 'hub',
  dashboardWidgets,
  onDashboardLayoutChange,
  onDashboardWidgetsChange,
  dashboardTemplates = [],
  onSaveTemplate,
  onDeleteTemplate,
  onNavigate,
  onGoToPlannerCard,
  onGoToCalendarDate,
  onOpenShortcut,
  onGoToNotes,
}: DashboardHomeProps) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isQrSyncOpen, setIsQrSyncOpen] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [activeTab, setActiveTab] = useState<'geral' | 'navegacao' | 'resumos'>('geral')

  if (dashboardLayout === 'custom' && dashboardWidgets && onDashboardWidgetsChange) {
    return (
      <div className="today-outer">
        <div className="today-layout">
          <CustomLayout
            widgets={dashboardWidgets}
            onWidgetsChange={onDashboardWidgetsChange}
            cards={cards}
            calendarEvents={calendarEvents}
            bills={[]}
            expenses={[]}
            savingsGoals={[]}
            shortcuts={[]}
            notes={notes}
            study={study}
            syncStatus={syncStatus}
            lastSyncAt={lastSyncAt}
            userLoggedIn={userLoggedIn}
            playbooksCount={playbooksCount}
            appsCount={0}
            clipboardCount={clipboardItemsCount}
            colorPalettesCount={colorPalettesCount}
            onNavigate={onNavigate}
            onGoToPlannerCard={onGoToPlannerCard}
            onGoToCalendarDate={onGoToCalendarDate}
            userTemplates={dashboardTemplates}
            onSaveTemplate={onSaveTemplate ?? (() => undefined)}
            onDeleteTemplate={onDeleteTemplate ?? (() => undefined)}
            onApplyTemplate={(widgets) => {
              onDashboardWidgetsChange(widgets)
              onDashboardLayoutChange?.('custom')
            }}
          />
        </div>
      </div>
    )
  }

  const today = getTodayISO()
  const todayEvents = expandCalendarEvents(calendarEvents, today, today)
    .filter(event => event.date === today)
    .sort((a, b) => {
      if (!a.time && !b.time) return a.title.localeCompare(b.title)
      if (!a.time) return 1
      if (!b.time) return -1
      return a.time.localeCompare(b.time)
    })
  const todayDay = getDayFromDate(today)

  const todayCardsWithDate = cards.filter(card => card.hasDate && card.date === today)
  const todayCardsNoDate = cards
    .filter(card => !card.hasDate && card.location.day === todayDay && !!card.location.period)
    .sort((a, b) => {
      const order: Record<Period, number> = { morning: 0, afternoon: 1, night: 2 }
      const ap = a.location.period as Period
      const bp = b.location.period as Period
      if (order[ap] !== order[bp]) return order[ap] - order[bp]
      return a.order - b.order
    })

  const allTodayCards = [...todayCardsWithDate, ...todayCardsNoDate]

  const weekDates = getCurrentWeekDates()
  const weeklyOverview = DAYS_ORDER_LABELS.map(({ key, label }) => {
    const date = weekDates[key]
    const dayEvents = expandCalendarEvents(calendarEvents, date, date).filter(event => event.date === date)
    const dayCards = cards.filter(card =>
      (card.hasDate && card.date === date) ||
      (!card.hasDate && card.location.day === key && !!card.location.period)
    )

    return {
      key,
      label,
      date,
      total: dayEvents.length + dayCards.length,
      eventCount: dayEvents.length,
      eventDots: dayEvents.slice(0, 3).map(event => event.color || 'var(--color-primary)'),
      isToday: date === today,
    }
  })

  const weekTotalItems = weeklyOverview.reduce((sum, day) => sum + day.total, 0)
  const weekEventCount = weeklyOverview.reduce((sum, day) => sum + day.eventCount, 0)
  const weekCardsCount = weekTotalItems - weekEventCount

  useEffect(() => {
    const interval = window.setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => window.clearInterval(interval)
  }, [])

  const monthNames = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
  const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
  const formattedTime = `${String(currentTime.getHours()).padStart(2, '0')}:${String(currentTime.getMinutes()).padStart(2, '0')}`
  const fullDateText = `${dayNames[currentTime.getDay()]}, ${currentTime.getDate()} de ${monthNames[currentTime.getMonth()]} • ${formattedTime}`
  const lastSyncLabel = lastSyncAt
    ? new Date(lastSyncAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    : 'Nunca'

  return (
    <div className="today-outer">
    <div className="today-layout">
      {/* Modal de busca global ativado por atalho (Ctrl+K) */}
      {isSearchOpen && (
        <QuickSearchModal
          cards={cards}
          events={calendarEvents}
          shortcuts={[]}
          notes={notes}
          onClose={() => setIsSearchOpen(false)}
          onGoToPlannerCard={(cardId) => {
            setIsSearchOpen(false)
            onGoToPlannerCard(cardId)
          }}
          onGoToCalendarDate={(dateISO) => {
            setIsSearchOpen(false)
            onGoToCalendarDate(dateISO)
          }}
          onOpenShortcut={(url) => {
            setIsSearchOpen(false)
            onOpenShortcut?.(url)
          }}
          onGoToNotes={() => {
            setIsSearchOpen(false)
            onGoToNotes()
          }}
          onNavigate={(view) => {
            setIsSearchOpen(false)
            onNavigate(view)
          }}
        />
      )}

      {/* Modal QR Code Sync */}
      {isQrSyncOpen && (
        <LocalSyncModal
          isOpen={isQrSyncOpen}
          onClose={() => setIsQrSyncOpen(false)}
        />
      )}

      {/* Top Bar Consolidada do Dashboard */}
      <div className="today-top-bar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.8, color: 'var(--color-primary, #6366f1)', background: 'rgba(99,102,241,0.15)', padding: '5px 10px', borderRadius: 99, border: '1px solid rgba(99,102,241,0.25)' }}>
            Painel Central
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 800, color: 'var(--color-text)', letterSpacing: -0.3 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--color-primary, #6366f1)" strokeWidth="2" width="18" height="18">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span>{fullDateText}</span>
          </div>
        </div>

        {/* Control Segmented de Abas */}
        <div className="today-tabs-container" style={{ margin: 0 }}>
          <div className="today-tabs">
            <button type="button" className={`today-tab ${activeTab === 'geral' ? 'is-active' : ''}`} onClick={() => setActiveTab('geral')}>
              Visão Geral
            </button>
            <button type="button" className={`today-tab ${activeTab === 'navegacao' ? 'is-active' : ''}`} onClick={() => setActiveTab('navegacao')}>
              Navegação Rápida
            </button>
            <button type="button" className={`today-tab ${activeTab === 'resumos' ? 'is-active' : ''}`} onClick={() => setActiveTab('resumos')}>
              Resumos & Sistema
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'navegacao' && (
        <section className="today-hub-section">
          <div className="today-hubs-grid">
            {hubCards.map(hub => (
              <HubGroupCard key={hub.id} hub={hub} icons={HUB_VIEW_ICONS} onNavigate={onNavigate} />
            ))}
          </div>
        </section>
      )}

      {(activeTab === 'geral' || activeTab === 'resumos') && (
        <section className="today-reports-section">
          <div className="today-report-grid">
            {activeTab === 'geral' && (
              <>
                <AgendaCard todayEvents={todayEvents} onGoToCalendarDate={onGoToCalendarDate} onNavigate={onNavigate} />
                <FocusCard allTodayCards={allTodayCards} onGoToPlannerCard={onGoToPlannerCard} onNavigate={onNavigate} />
                <ProjectsSummaryCard projectsCount={projectsCount} onNavigate={onNavigate} />
                <WeekOverviewCard weeklyOverview={weeklyOverview} weekTotalItems={weekTotalItems} weekEventCount={weekEventCount} weekCardsCount={weekCardsCount} />
              </>
            )}

            {activeTab === 'resumos' && (
              <>
                <SystemSummaryCard
                  title="Operação & Projetos"
                  metrics={[
                    { label: 'Contatos CRM', value: crmContactsCount },
                    { label: 'Projetos & Relatórios', value: projectsCount },
                    { label: 'Cards de Tarefas', value: cards.length },
                  ]}
                />
                <SystemSummaryCard
                  title="Conhecimento & Foco"
                  metrics={[
                    { label: 'Notas', value: notes.length },
                    { label: 'Playbooks', value: playbooksCount },
                    { label: 'Metas de foco', value: study.goals.length },
                    { label: 'Sessões concluídas', value: study.sessions.length }
                  ]}
                />
                <SystemSummaryCard
                  title="Ferramentas e Design"
                  metrics={[
                    { label: 'Categorias de clipboard', value: clipboardCategoriesCount },
                    { label: 'Itens de clipboard', value: clipboardItemsCount },
                    { label: 'Paletas de cores', value: colorPalettesCount }
                  ]}
                />
                <SystemSummaryCard
                  title="Sistema"
                  metrics={[
                    { label: 'Status de sync', value: SYNC_STATUS_LABELS[syncStatus] },
                    { label: 'Último sync', value: lastSyncLabel },
                    { label: 'Modo atual', value: userLoggedIn ? 'Conta conectada' : 'Local' }
                  ]}
                  action={{ label: 'Abrir sistema', onClick: () => onNavigate('settings') }}
                />
              </>
            )}
          </div>
        </section>
      )}
      <LocalSyncModal isOpen={isQrSyncOpen} onClose={() => setIsQrSyncOpen(false)} />
    </div>
    </div>
  )
}

export const DashboardHome = DashboardPage
