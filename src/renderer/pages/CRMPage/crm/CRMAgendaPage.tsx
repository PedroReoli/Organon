import React, { useMemo, useState } from 'react'
import type { CRMContact, CalendarEvent } from '@types'
import { Button, Input } from '@shared/components/primitives'
import { getTodayISO } from '@utils'

interface CRMAgendaPageProps {
  contacts: CRMContact[]
  calendarEvents: CalendarEvent[]
  onAddEvent: (input: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>) => void
  onAddLink: (contactId: string, linkType: 'noteIds' | 'calendarEventIds' | 'fileIds' | 'cardIds' | 'projectIds', entityId: string) => void
}

export const CRMAgendaPage: React.FC<CRMAgendaPageProps> = ({
  contacts,
  calendarEvents,
  onAddEvent,
}) => {
  const today = getTodayISO()
  const [showForm, setShowForm] = useState(false)
  const [formTitle, setFormTitle] = useState('')
  const [formDate, setFormDate] = useState(today)
  const [formTime, setFormTime] = useState('')
  const [formContactId, setFormContactId] = useState('')

  const clientEvents = useMemo(() => {
    return calendarEvents
      .filter(e => e.contactId)
      .sort((a, b) => `${a.date}T${a.time ?? '00:00'}`.localeCompare(`${b.date}T${b.time ?? '00:00'}`))
  }, [calendarEvents])

  const upcomingEvents = useMemo(
    () => clientEvents.filter(e => e.date >= today),
    [clientEvents, today],
  )

  const pastEvents = useMemo(
    () => clientEvents.filter(e => e.date < today).reverse().slice(0, 10),
    [clientEvents, today],
  )

  const activeContacts = useMemo(
    () => contacts.filter(c => c.stageId !== 'perdeu').sort((a, b) => a.name.localeCompare(b.name)),
    [contacts],
  )

  const getContactName = (contactId: string | null | undefined) => {
    if (!contactId) return ''
    return contacts.find(c => c.id === contactId)?.name ?? ''
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formTitle.trim() || !formContactId) return

    onAddEvent({
      title: formTitle.trim(),
      date: formDate,
      time: formTime || null,
      recurrence: null,
      reminder: null,
      description: '',
      color: 'var(--color-primary)',
      categoryId: null,
      contactId: formContactId,
    })

    setFormTitle('')
    setFormDate(today)
    setFormTime('')
    setFormContactId('')
    setShowForm(false)
  }

  return (
    <div className="crm-agenda">
      <div className="crm-agenda-header">
        <h3>Agenda de Clientes</h3>
        <Button variant="primary" onClick={() => setShowForm(!showForm)}>
          + Compromisso
        </Button>
      </div>

      {showForm && (
        <form className="crm-agenda-form" onSubmit={handleSubmit}>
          <div className="crm-agenda-form-row">
            <Input
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="Título do compromisso"
              fullWidth
            />
          </div>
          <div className="crm-agenda-form-row crm-agenda-form-row--inline">
            <select
              className="crm-agenda-select"
              value={formContactId}
              onChange={(e) => setFormContactId(e.target.value)}
            >
              <option value="">Selecionar cliente...</option>
              {activeContacts.map(c => (
                <option key={c.id} value={c.id}>{c.name}{c.company ? ` (${c.company})` : ''}</option>
              ))}
            </select>
            <input
              type="date"
              className="crm-agenda-input"
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
            />
            <input
              type="time"
              className="crm-agenda-input"
              value={formTime}
              onChange={(e) => setFormTime(e.target.value)}
            />
          </div>
          <div className="crm-agenda-form-actions">
            <Button type="submit" variant="primary" size="sm">Criar</Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancelar</Button>
          </div>
        </form>
      )}

      {upcomingEvents.length === 0 && pastEvents.length === 0 && !showForm && (
        <div className="crm-agenda-empty">
          Nenhum compromisso com clientes agendado. Crie um para começar.
        </div>
      )}

      {upcomingEvents.length > 0 && (
        <section className="crm-agenda-section">
          <h4>Próximos</h4>
          <div className="crm-agenda-list">
            {upcomingEvents.map((event) => (
              <div key={event.id} className={`crm-agenda-item ${event.date === today ? 'is-today' : ''}`}>
                <div className="crm-agenda-item-date">
                  <span className="crm-agenda-item-day">{event.date.slice(8, 10)}</span>
                  <span className="crm-agenda-item-month">{event.date.slice(5, 7)}</span>
                </div>
                <div className="crm-agenda-item-content">
                  <span className="crm-agenda-item-title">{event.title}</span>
                  <span className="crm-agenda-item-meta">
                    {event.time ?? 'Dia todo'} · {getContactName(event.contactId)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {pastEvents.length > 0 && (
        <section className="crm-agenda-section crm-agenda-section--past">
          <h4>Anteriores</h4>
          <div className="crm-agenda-list">
            {pastEvents.map((event) => (
              <div key={event.id} className="crm-agenda-item crm-agenda-item--past">
                <div className="crm-agenda-item-date">
                  <span className="crm-agenda-item-day">{event.date.slice(8, 10)}</span>
                  <span className="crm-agenda-item-month">{event.date.slice(5, 7)}</span>
                </div>
                <div className="crm-agenda-item-content">
                  <span className="crm-agenda-item-title">{event.title}</span>
                  <span className="crm-agenda-item-meta">
                    {event.time ?? 'Dia todo'} · {getContactName(event.contactId)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
