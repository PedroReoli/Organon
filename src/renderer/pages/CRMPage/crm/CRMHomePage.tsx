import React, { useMemo, useRef, useState } from 'react'
import type { CRMContact, CRMInteraction, CRMTag, CRMSnapshot, CalendarEvent } from '@types'
import { CRM_STAGES } from '@types'
import { getTodayISO } from '@utils'
import { Button } from '@shared/components/primitives'
import { Input } from '@shared/components/primitives'
import type { CRMTabId } from '../../DashboardPage/hubs/HubCRM'

interface CRMHomePageProps {
  contacts: CRMContact[]
  interactions: CRMInteraction[]
  tags: CRMTag[]
  snapshots: CRMSnapshot[]
  calendarEvents: CalendarEvent[]
  onNavigate: (tab: CRMTabId) => void
  onAddContact: () => string
}

export const CRMHomePage: React.FC<CRMHomePageProps> = ({
  contacts,
  interactions,
  snapshots,
  calendarEvents,
  onNavigate,
  onAddContact,
}) => {
  const searchRef = useRef<HTMLInputElement | null>(null)
  const [query, setQuery] = useState('')
  const today = getTodayISO()

  const activeClients = useMemo(
    () => contacts.filter(c => c.stageId === 'cliente-ativo'),
    [contacts],
  )

  const overdueFollowUps = useMemo(
    () => contacts.filter(c => c.followUpDate && c.followUpDate < today),
    [contacts, today],
  )

  const upcomingFollowUps = useMemo(
    () => contacts
      .filter(c => c.followUpDate && c.followUpDate >= today)
      .sort((a, b) => a.followUpDate!.localeCompare(b.followUpDate!))
      .slice(0, 5),
    [contacts, today],
  )

  const upcomingEvents = useMemo(() => {
    const end = new Date(today)
    end.setDate(end.getDate() + 7)
    const endISO = end.toISOString().slice(0, 10)
    return calendarEvents
      .filter(e => e.contactId && e.date >= today && e.date <= endISO)
      .sort((a, b) => `${a.date}T${a.time ?? '00:00'}`.localeCompare(`${b.date}T${b.time ?? '00:00'}`))
      .slice(0, 5)
  }, [calendarEvents, today])

  const recentInteractions = useMemo(() => {
    const sevenDaysAgo = new Date(today)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const cutoff = sevenDaysAgo.toISOString().slice(0, 10)
    return interactions.filter(i => i.date >= cutoff).length
  }, [interactions, today])

  const sortedSnapshots = useMemo(
    () => [...snapshots].sort((a, b) => a.id.localeCompare(b.id)).slice(-6),
    [snapshots],
  )

  const maxSnapshotContacts = useMemo(
    () => Math.max(...sortedSnapshots.map(s => s.totalContacts), 1),
    [sortedSnapshots],
  )

  const stats = [
    { label: 'Total', n: contacts.length },
    { label: 'Ativos', n: activeClients.length },
    { label: 'Pipeline', n: contacts.filter(c => c.stageId !== 'cliente-ativo' && c.stageId !== 'perdeu').length },
    { label: 'Interações 7d', n: recentInteractions },
    { label: 'Pendências', n: overdueFollowUps.length },
  ]

  const stageCards = CRM_STAGES.filter(s => s.id !== 'perdeu').map(s => ({
    ...s,
    count: contacts.filter(c => c.stageId === s.id).length,
  }))

  const quickResults = useMemo(() => {
    const normalize = (t: string) =>
      t
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
    const terms = normalize(query)
      .split(/\s+/g)
      .map((t) => t.trim())
      .filter(Boolean)
    if (terms.length === 0) return []
    return contacts
      .filter((c) => {
        const haystack = normalize(
          [
            c.name,
            c.company ?? '',
            c.role ?? '',
            c.email ?? '',
            c.phone ?? '',
            c.socialMedia ?? '',
            c.description ?? '',
            c.context ?? '',
            c.interests ?? '',
            c.tags.join(' '),
          ].join(' '),
        )
        return terms.every((t) => haystack.includes(t))
      })
      .slice(0, 6)
  }, [contacts, query])

  return (
    <div className="crm-home">
      <div className="crm-home-header">
        <div>
          <h2 className="crm-home-title">CRM</h2>
          <p className="crm-home-subtitle">
            {contacts.length} contatos · {activeClients.length} clientes ativos
          </p>
        </div>
        <div className="crm-home-actions">
          <Button variant="secondary" onClick={() => onNavigate('pipeline')}>Ver Pipeline</Button>
          <Button variant="primary" onClick={onAddContact}>+ Contato</Button>
        </div>
      </div>

      <div className="crm-home-quick-search">
        <Input
          ref={searchRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Busca rápida — digite para ir direto ao contato"
          fullWidth
        />
        {quickResults.length > 0 && (
          <div className="crm-home-quick-results">
            {quickResults.map((c) => (
              <button
                key={c.id}
                type="button"
                className="crm-home-quick-item"
                onClick={() => {
                  try { localStorage.setItem('organon:crmQuery', c.name) } catch {}
                  onNavigate('pipeline')
                  setQuery('')
                }}
              >
                <span className="crm-home-quick-name">{c.name}</span>
                <span className="crm-home-quick-meta">{c.company ?? c.email ?? ''}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="crm-home-stats">
        {stats.map((s) => (
          <div key={s.label} className="crm-home-stat">
            <span className="crm-home-stat-n">{s.n}</span>
            <span className="crm-home-stat-label">{s.label}</span>
          </div>
        ))}
      </div>

      <div className="crm-home-stages">
        {stageCards.map((s) => (
          <button
            key={s.id}
            className="crm-home-stage-card"
            onClick={() => onNavigate('pipeline')}
          >
            <span className="crm-home-stage-count">{s.count}</span>
            <span className="crm-home-stage-label">{s.label}</span>
          </button>
        ))}
      </div>

      <div className="crm-home-body">
        {sortedSnapshots.length > 1 && (
          <section className="crm-home-section">
            <h3>Evolução mensal</h3>
            <div className="crm-home-chart">
              {sortedSnapshots.map((snap) => (
                <div key={snap.id} className="crm-home-chart-bar-group">
                  <div className="crm-home-chart-bar-container">
                    <div
                      className="crm-home-chart-bar"
                      style={{ height: `${(snap.totalContacts / maxSnapshotContacts) * 100}%` }}
                    />
                  </div>
                  <span className="crm-home-chart-label">
                    {snap.month}/{String(snap.year).slice(2)}
                  </span>
                  <span className="crm-home-chart-value">{snap.totalContacts}</span>
                </div>
              ))}
            </div>
            <div className="crm-home-chart-legend">
              {sortedSnapshots.length >= 2 && (() => {
                const last = sortedSnapshots[sortedSnapshots.length - 1]
                const prev = sortedSnapshots[sortedSnapshots.length - 2]
                const diff = last.totalContacts - prev.totalContacts
                const sign = diff >= 0 ? '+' : ''
                return <span className="crm-home-chart-diff">{sign}{diff} contatos vs mês anterior</span>
              })()}
            </div>
          </section>
        )}

        {overdueFollowUps.length > 0 && (
          <section className="crm-home-section crm-home-section--alert">
            <div className="crm-home-section-head">
              <h3>Pendências ({overdueFollowUps.length})</h3>
              <button type="button" className="crm-home-section-link" onClick={() => onNavigate('clientes')}>
                Ver todos →
              </button>
            </div>
            <div className="crm-home-list">
              {overdueFollowUps.slice(0, 5).map((c) => (
                <div key={c.id} className="crm-home-list-item">
                  <span className="crm-home-list-name">{c.name}</span>
                  <span className="crm-home-list-meta">Follow-up: {c.followUpDate}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {upcomingFollowUps.length > 0 && (
          <section className="crm-home-section">
            <div className="crm-home-section-head">
              <h3>Próximos follow-ups</h3>
            </div>
            <div className="crm-home-list">
              {upcomingFollowUps.map((c) => (
                <div key={c.id} className="crm-home-list-item">
                  <span className="crm-home-list-name">{c.name}</span>
                  <span className="crm-home-list-meta">{c.followUpDate}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {upcomingEvents.length > 0 && (
          <section className="crm-home-section">
            <div className="crm-home-section-head">
              <h3>Compromissos da semana</h3>
              <button type="button" className="crm-home-section-link" onClick={() => onNavigate('agenda')}>
                Ver agenda →
              </button>
            </div>
            <div className="crm-home-list">
              {upcomingEvents.map((e) => {
                const contact = contacts.find(c => c.id === e.contactId)
                return (
                  <div key={e.id} className="crm-home-list-item">
                    <span className="crm-home-list-name">{e.title}</span>
                    <span className="crm-home-list-meta">
                      {e.date} {e.time ?? ''} · {contact?.name ?? ''}
                    </span>
                  </div>
                )
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
