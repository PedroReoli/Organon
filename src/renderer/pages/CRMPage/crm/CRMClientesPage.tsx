import React, { useEffect, useMemo, useRef, useState } from 'react'
import type { CRMContact, CRMInteraction, CRMTag } from '@types'
import { CRM_PRIORITY_COLORS, CRM_PRIORITY_LABELS } from '@types'
import type { CRMTabId } from '../../DashboardPage/hubs/HubCRM'
import { Button, Input } from '@shared/components/primitives'
import { WysiwygEditor } from '../../shared/WysiwygEditor'

interface CRMClientesPageProps {
  contacts: CRMContact[]
  interactions: CRMInteraction[]
  tags: CRMTag[]
  onUpdateContact: (contactId: string, updates: Partial<Pick<CRMContact, 'name' | 'company' | 'role' | 'phone' | 'email' | 'socialMedia' | 'context' | 'interests' | 'priority' | 'description' | 'followUpDate'>>) => void
  onRemoveContact: (contactId: string) => void
  onNavigate?: (tab: CRMTabId) => void
}

export const CRMClientesPage: React.FC<CRMClientesPageProps> = ({
  contacts,
  interactions,
  tags,
  onUpdateContact,
  onRemoveContact,
  onNavigate,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [query, setQuery] = useState('')
  const [onlyOverdue, setOnlyOverdue] = useState(false)
  const [sortBy, setSortBy] = useState<'followup' | 'last' | 'name'>('followup')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draft, setDraft] = useState<{
    name: string
    company: string
    role: string
    phone: string
    email: string
    followUpDate: string
    priority: 'alta' | 'media' | 'baixa'
    description: string
  } | null>(null)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        inputRef.current?.focus()
        inputRef.current?.select()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const todayISO = useMemo(() => new Date().toISOString().slice(0, 10), [])

  const activeClients = useMemo(() => {
    const normalize = (t: string) =>
      t
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')

    const terms = normalize(query)
      .split(/\s+/g)
      .map((t) => t.trim())
      .filter(Boolean)

    const clients = contacts.filter((c) => c.stageId === 'cliente-ativo')
    const filtered = clients.filter((c) => {
      if (onlyOverdue && (!c.followUpDate || c.followUpDate >= todayISO)) return false
      if (terms.length === 0) return true
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

    const getLastInteractionKey = (contactId: string) => {
      const mostRecent = interactions
        .filter((i) => i.contactId === contactId)
        .sort((a, b) => `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`))[0]
      if (!mostRecent) return ''
      return `${mostRecent.date}T${mostRecent.time}`
    }

    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      if (sortBy === 'last') return getLastInteractionKey(b.id).localeCompare(getLastInteractionKey(a.id))
      const aKey = a.followUpDate ?? '9999-12-31'
      const bKey = b.followUpDate ?? '9999-12-31'
      return aKey.localeCompare(bKey)
    })

    return sorted
  }, [contacts, interactions, onlyOverdue, query, sortBy, todayISO])

  const getLastInteraction = (contactId: string) => {
    const contactInteractions = interactions
      .filter(i => i.contactId === contactId)
      .sort((a, b) => `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`))
    return contactInteractions[0] ?? null
  }

  const getContactTags = (contact: CRMContact) => {
    return contact.tags.map(tid => tags.find(t => t.id === tid)).filter(Boolean) as CRMTag[]
  }

  return (
    <div className="crm-clientes">
      <div className="crm-clientes-header">
        <h3>Clientes Ativos</h3>
        <span className="crm-clientes-count">{activeClients.length}</span>
      </div>

      {activeClients.length === 0 ? (
        <div className="crm-clientes-empty">
          {query ? 'Nenhum cliente encontrado.' : 'Nenhum cliente ativo ainda.'}
        </div>
      ) : (
        <div className="crm-clientes-split">
          <div className="crm-clientes-left">
            <div className="crm-clientes-search">
              <Input
                type="search"
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar (Ctrl+K) — nome, empresa, tags, etc."
                fullWidth
              />
            </div>

            <div className="crm-clientes-controls">
              <button
                type="button"
                className={`crm-chip ${onlyOverdue ? 'is-active' : ''}`}
                onClick={() => setOnlyOverdue((v) => !v)}
              >
                Só atrasados
              </button>
              <select
                className="crm-chip-select"
                value={sortBy}
                onChange={(e) => {
                  const v = e.target.value
                  if (v === 'followup' || v === 'last' || v === 'name') setSortBy(v)
                }}
              >
                <option value="followup">Ordenar: follow-up</option>
                <option value="last">Ordenar: última interação</option>
                <option value="name">Ordenar: nome</option>
              </select>
            </div>

            <div className="crm-clientes-list">
              {activeClients.map((client) => {
                const lastInteraction = getLastInteraction(client.id)
                const clientTags = getContactTags(client)
                const isSelected = selectedId === client.id
                return (
                  <button
                    key={client.id}
                    type="button"
                    className={`crm-clientes-item ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => {
                      setSelectedId(client.id)
                      setDraft({
                        name: client.name,
                        company: client.company ?? '',
                        role: client.role ?? '',
                        phone: client.phone ?? '',
                        email: client.email ?? '',
                        followUpDate: client.followUpDate ?? '',
                        priority: client.priority,
                        description: client.description ?? '',
                      })
                    }}
                  >
                    <div className="crm-clientes-item-main">
                      <div className="crm-clientes-item-info">
                        <span className="crm-clientes-item-name">{client.name}</span>
                        {client.company && (
                          <span className="crm-clientes-item-company">{client.company}</span>
                        )}
                      </div>
                      <div className="crm-clientes-item-contact">
                        {client.email && <span>{client.email}</span>}
                        {client.phone && <span>{client.phone}</span>}
                      </div>
                    </div>
                    <div className="crm-clientes-item-meta">
                      <span
                        className="crm-clientes-item-priority"
                        style={{ color: CRM_PRIORITY_COLORS[client.priority] }}
                      >
                        {CRM_PRIORITY_LABELS[client.priority]}
                      </span>
                      {clientTags.length > 0 && (
                        <div className="crm-clientes-item-tags">
                          {clientTags.slice(0, 3).map(tag => (
                            <span
                              key={tag.id}
                              className="crm-tag"
                              style={{ backgroundColor: tag.color }}
                            >
                              {tag.name}
                            </span>
                          ))}
                        </div>
                      )}
                      {lastInteraction && (
                        <span className="crm-clientes-item-last">
                          Última interação: {lastInteraction.date}
                        </span>
                      )}
                      {client.followUpDate && (
                        <span className={`crm-clientes-item-followup ${client.followUpDate < new Date().toISOString().slice(0, 10) ? 'is-overdue' : ''}`}>
                          Follow-up: {client.followUpDate}
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <aside className="crm-clientes-right">
            {!selectedId || !draft ? (
              <div className="crm-clientes-empty-right">
                Selecione um cliente para editar rapidamente.
              </div>
            ) : (
              <>
                <div className="crm-clientes-right-header">
                  <div className="crm-clientes-right-title">
                    <div className="crm-clientes-right-name">{draft.name || 'Contato'}</div>
                    <div className="crm-clientes-right-sub">{draft.company || 'Sem empresa'}</div>
                  </div>
                  <div className="crm-clientes-right-actions">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        try { localStorage.setItem('organon:crmQuery', draft.name) } catch {}
                        onNavigate?.('pipeline')
                      }}
                    >
                      Abrir no Pipeline
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => {
                        onRemoveContact(selectedId)
                        setSelectedId(null)
                        setDraft(null)
                      }}
                    >
                      Excluir
                    </Button>
                  </div>
                </div>

                <div className="crm-clientes-right-body">
                  <div className="crm-clientes-form-grid">
                    <div className="crm-form-group">
                      <label>Nome</label>
                      <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                    </div>
                    <div className="crm-form-group">
                      <label>Empresa</label>
                      <input value={draft.company} onChange={(e) => setDraft({ ...draft, company: e.target.value })} />
                    </div>
                    <div className="crm-form-group">
                      <label>Telefone</label>
                      <input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
                    </div>
                    <div className="crm-form-group">
                      <label>E-mail</label>
                      <input value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
                    </div>
                    <div className="crm-form-group">
                      <label>Cargo</label>
                      <input value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })} />
                    </div>
                    <div className="crm-form-group">
                      <label>Follow-up</label>
                      <input
                        type="date"
                        value={draft.followUpDate}
                        onChange={(e) => setDraft({ ...draft, followUpDate: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="crm-clientes-notes">
                    <label>Notas</label>
                    <div className="crm-clientes-editor">
                      <WysiwygEditor
                        content={draft.description}
                        onChange={(html) => setDraft({ ...draft, description: html })}
                        mode="compact"
                        placeholder="Notas rápidas…"
                        floatingToolbox={false}
                        disableImages
                      />
                    </div>
                  </div>
                </div>

                <div className="crm-clientes-right-footer">
                  <Button
                    variant="primary"
                    onClick={() => {
                      onUpdateContact(selectedId, {
                        name: draft.name,
                        company: draft.company || null,
                        role: draft.role || null,
                        phone: draft.phone || null,
                        email: draft.email || null,
                        followUpDate: draft.followUpDate || null,
                        description: draft.description,
                      })
                    }}
                  >
                    Salvar alterações
                  </Button>
                </div>
              </>
            )}
          </aside>
        </div>
      )}
    </div>
  )
}
