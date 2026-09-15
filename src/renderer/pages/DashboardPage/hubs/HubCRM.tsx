import React, { useCallback, useEffect, useState } from 'react'
import type {
  CRMContact,
  CRMInteraction,
  CRMTag,
  CRMSnapshot,
  CRMStageId,
  CRMInteractionType,
  CalendarEvent,
  Note,
  Project,
} from '@types'
import { CRM_STAGES } from '@types'
import { CRMView } from '@CRM/CRMPage'
import { CRMHomePage } from '@CRM/crm/CRMHomePage'
import { CRMClientesPage } from '@CRM/crm/CRMClientesPage'
import { CRMAgendaPage } from '@CRM/crm/CRMAgendaPage'
import { getTodayISO } from '@utils'

export type CRMTabId = 'home' | 'pipeline' | 'clientes' | 'agenda'

const STORAGE_KEY = 'organon:crmTab'
const DEBUG_SCREEN_EVENT = 'organon:debug-screen'

interface HubCRMProps {
  contacts: CRMContact[]
  interactions: CRMInteraction[]
  tags: CRMTag[]
  snapshots: CRMSnapshot[]
  notes: Note[]
  calendarEvents: CalendarEvent[]
  projects: Project[]
  onAddContact: (data: {
    name: string
    company?: string | null
    role?: string | null
    phone?: string | null
    email?: string | null
    socialMedia?: string | null
    context?: string | null
    interests?: string | null
    priority?: 'alta' | 'media' | 'baixa'
    description?: string
  }) => string
  onUpdateContact: (contactId: string, updates: Partial<Pick<CRMContact, 'name' | 'company' | 'role' | 'phone' | 'email' | 'socialMedia' | 'context' | 'interests' | 'priority' | 'description' | 'followUpDate'>>) => void
  onRemoveContact: (contactId: string) => void
  onMoveContactToStage: (contactId: string, stageId: string) => void
  onReorderContacts: (stageId: CRMStageId, orderedIds: string[]) => void
  onAddInteraction: (data: { contactId: string; type: CRMInteractionType; content: string; date: string; time: string }) => string
  onRemoveInteraction: (interactionId: string) => void
  onAddTag: (name: string, color?: string) => string
  onRemoveTag: (tagId: string) => void
  onAddLink: (contactId: string, linkType: 'noteIds' | 'calendarEventIds' | 'fileIds' | 'cardIds' | 'projectIds', entityId: string) => void
  onRemoveLink: (contactId: string, linkType: 'noteIds' | 'calendarEventIds' | 'fileIds' | 'cardIds' | 'projectIds', entityId: string) => void
  onUpsertSnapshot: (snapshot: CRMSnapshot) => void
  onAddEvent: (input: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>) => void
  onMigrateCRMStages: () => void
}

const TABS: { id: CRMTabId; label: string; icon: JSX.Element }[] = [
  {
    id: 'home',
    label: 'Home',
    icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14"><path d="M2 8.5 8 3l6 5.5" /><path d="M3.5 7.5V13h9V7.5" /></svg>,
  },
  {
    id: 'pipeline',
    label: 'Pipeline',
    icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14"><rect x="2" y="3" width="3.5" height="10" rx="1" /><rect x="6.25" y="5" width="3.5" height="8" rx="1" /><rect x="10.5" y="4" width="3.5" height="9" rx="1" /></svg>,
  },
  {
    id: 'clientes',
    label: 'Clientes',
    icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14"><circle cx="8" cy="5" r="3" /><path d="M3 14c0-2.8 2.2-5 5-5s5 2.2 5 5" /></svg>,
  },
  {
    id: 'agenda',
    label: 'Agenda',
    icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14"><rect x="2" y="3" width="12" height="10" rx="1.5" /><path d="M2 6h12" /><path d="M5.5 1.5v3M10.5 1.5v3" /></svg>,
  },
]

export const HubCRM: React.FC<HubCRMProps> = (props) => {
  const [tab, setTabRaw] = useState<CRMTabId>(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY)
      if (v === 'home' || v === 'pipeline' || v === 'clientes' || v === 'agenda') return v
    } catch {}
    return 'home'
  })

  const setTab = useCallback((t: CRMTabId) => {
    setTabRaw(t)
    try { localStorage.setItem(STORAGE_KEY, t) } catch {}
    if (import.meta.env.DEV) {
      const label = TABS.find(x => x.id === t)?.label ?? t
      window.dispatchEvent(new CustomEvent(DEBUG_SCREEN_EVENT, { detail: { screen: `CRM / ${label}` } }))
    }
  }, [])

  useEffect(() => {
    props.onMigrateCRMStages()
  }, [])

  useEffect(() => {
    if (!import.meta.env.DEV) return
    const label = TABS.find(x => x.id === tab)?.label ?? tab
    window.dispatchEvent(new CustomEvent(DEBUG_SCREEN_EVENT, { detail: { screen: `CRM / ${label}` } }))
  }, [])

  useEffect(() => {
    const today = getTodayISO()
    const currentMonth = today.slice(0, 7)
    const existing = props.snapshots.find(s => s.id === currentMonth)
    if (!existing) {
      const [yearStr, monthStr] = currentMonth.split('-')
      const byStage: Record<string, number> = {}
      CRM_STAGES.forEach(s => {
        byStage[s.id] = props.contacts.filter(c => c.stageId === s.id).length
      })
      const monthStart = `${currentMonth}-01`
      const newThisMonth = props.contacts.filter(c => c.createdAt >= monthStart).length
      const conversions = props.contacts.filter(c => c.stageId === 'cliente-ativo' && c.updatedAt >= monthStart).length
      const lost = props.contacts.filter(c => c.stageId === 'perdeu' && c.updatedAt >= monthStart).length
      const monthInteractions = props.interactions.filter(i => i.date >= monthStart).length

      props.onUpsertSnapshot({
        id: currentMonth,
        month: Number(monthStr),
        year: Number(yearStr),
        totalContacts: props.contacts.length,
        byStage,
        newContacts: newThisMonth,
        conversions,
        lost,
        interactions: monthInteractions,
        createdAt: new Date().toISOString(),
      })
    }
  }, [props.contacts.length, props.interactions.length])

  return (
    <div className="crm-hub">
      <header className="crm-hub-header">
        <nav className="crm-hub-tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`crm-hub-tab ${tab === t.id ? 'is-active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              <span className="crm-hub-tab-icon">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <div className="crm-hub-body">
        {tab === 'home' && (
          <CRMHomePage
            contacts={props.contacts}
            interactions={props.interactions}
            tags={props.tags}
            snapshots={props.snapshots}
            calendarEvents={props.calendarEvents}
            onNavigate={setTab}
            onAddContact={() => {
              const id = props.onAddContact({ name: 'Novo Contato', priority: 'media' })
              return id
            }}
          />
        )}

        {tab === 'pipeline' && (
          <CRMView
            contacts={props.contacts}
            interactions={props.interactions}
            tags={props.tags}
            notes={props.notes}
            calendarEvents={props.calendarEvents}
            projects={props.projects}
            onAddContact={props.onAddContact}
            onUpdateContact={props.onUpdateContact}
            onRemoveContact={props.onRemoveContact}
            onMoveContactToStage={props.onMoveContactToStage}
            onReorderContacts={props.onReorderContacts}
            onAddInteraction={props.onAddInteraction}
            onRemoveInteraction={props.onRemoveInteraction}
            onAddTag={props.onAddTag}
            onRemoveTag={props.onRemoveTag}
            onAddLink={props.onAddLink}
            onRemoveLink={props.onRemoveLink}
          />
        )}

        {tab === 'clientes' && (
          <CRMClientesPage
            contacts={props.contacts}
            interactions={props.interactions}
            tags={props.tags}
            onUpdateContact={props.onUpdateContact}
            onRemoveContact={props.onRemoveContact}
            onNavigate={setTab}
          />
        )}

        {tab === 'agenda' && (
          <CRMAgendaPage
            contacts={props.contacts}
            calendarEvents={props.calendarEvents}
            onAddEvent={props.onAddEvent}
            onAddLink={props.onAddLink}
          />
        )}
      </div>
    </div>
  )
}
