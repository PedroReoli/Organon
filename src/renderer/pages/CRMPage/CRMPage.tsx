import { useState, useMemo, useRef } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  MeasuringStrategy,
  getClientRect,
} from '@dnd-kit/core'
import type { CRMContact, CRMStageId, CRMTag, Note, CalendarEvent, Project, CRMInteraction, CRMInteractionType } from '@types'
import { CRM_STAGES } from '@types'
import { CRMColumn } from './components/CRMColumn'
import { CRMContactModal } from './components/CRMContactModal'
import { CRMReportsPanel } from './crm/CRMReportsPanel'
import { useCRMFilters, createEmptyCRMFilters, type CRMFilters } from '@hooks/useCRMFilters'
import { useCRMReports } from '@hooks/useCRMReports'

interface CRMViewProps {
  contacts: CRMContact[]
  interactions: CRMInteraction[]
  tags: CRMTag[]
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
}

export const CRMView = ({
  contacts,
  interactions,
  tags,
  notes,
  calendarEvents,
  projects,
  onAddContact,
  onUpdateContact,
  onRemoveContact,
  onMoveContactToStage,
  onAddInteraction,
  onRemoveInteraction,
  onAddTag,
  onRemoveTag,
  onAddLink,
  onRemoveLink,
}: CRMViewProps) => {
  const [screen, setScreen] = useState<'pipeline' | 'reports'>('pipeline')
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban')
  const [activeContact, setActiveContact] = useState<CRMContact | null>(null)
  const [selectedContact, setSelectedContact] = useState<CRMContact | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'quick' | 'full'>('full')
  const [filters, setFilters] = useState<CRMFilters>(() => {
    const base = createEmptyCRMFilters()
    try {
      const q = localStorage.getItem('organon:crmQuery') ?? ''
      if (q) {
        localStorage.removeItem('organon:crmQuery')
        return { ...base, query: q }
      }
    } catch {}
    return base
  })

  const zoomFactorRef = useRef(1)

  const { results: filteredContacts, hasActiveFilter } = useCRMFilters({
    contacts,
    interactions,
    filters,
  })

  const reports = useCRMReports({ contacts, interactions, tags })

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  )

  const zoomedClientRect = useMemo(() => {
    return (element: HTMLElement) => {
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
    }
  }, [])

  const measuring = useMemo(() => {
    return {
      draggable: { measure: zoomedClientRect },
      droppable: { strategy: MeasuringStrategy.Always, measure: zoomedClientRect },
      dragOverlay: { measure: zoomedClientRect },
    }
  }, [zoomedClientRect])

  const contactsByStage = useMemo(() => {
    const result: Record<string, CRMContact[]> = {}
    CRM_STAGES.forEach(stage => {
      result[stage.id] = filteredContacts
        .filter(c => c.stageId === stage.id)
        .sort((a, b) => a.order - b.order)
    })
    return result
  }, [filteredContacts])

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const contact = contacts.find(c => c.id === active.id)
    if (contact) {
      setActiveContact(contact)
    }
    try {
      zoomFactorRef.current = (window.electronAPI as any)?.getNativeZoom?.() ?? 1
    } catch {
      zoomFactorRef.current = 1
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveContact(null)

    if (!over) return

    const contactId = active.id as string
    const overStageId = over.id as string

    const isValidStage = CRM_STAGES.some(s => s.id === overStageId)
    if (!isValidStage) return

    const contact = contacts.find(c => c.id === contactId)
    if (!contact) return

    if (contact.stageId !== overStageId) {
      onMoveContactToStage(contactId, overStageId)
    }
  }

  const handleAddContact = () => {
    const newContactId = onAddContact({
      name: 'Novo Contato',
      priority: 'media',
    })
    const newContact = contacts.find(c => c.id === newContactId)
    if (newContact) {
      setSelectedContact(newContact)
      setIsModalOpen(true)
      setModalMode('quick')
    }
  }

  const handleEditContact = (contact: CRMContact) => {
    setSelectedContact(contact)
    setIsModalOpen(true)
    setModalMode('full')
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedContact(null)
    setModalMode('full')
  }

  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleNav = (id: 'pipeline' | 'reports') => {
    setScreen(id)
    if (window.innerWidth <= 800) {
      setSidebarOpen(false)
    }
  }

  return (
    <div className="projects-shell projects-theme">
      {/* ── Sidebar ──────────────────────────────────────────────────────────── */}
      <nav className={`projects-sidebar ${sidebarOpen ? 'is-open' : ''}`}>
        <div className="projects-sidebar-header">
          <div className="projects-sidebar-logo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          </div>
          <div>
            <div className="projects-sidebar-title">CRM</div>
            <div className="projects-sidebar-subtitle">Gestão de contatos</div>
          </div>
        </div>

        <div className="projects-sidebar-nav" style={{ flex: 'none', paddingBottom: '0' }}>
          <button
            type="button"
            className={`projects-sidebar-item ${screen === 'pipeline' ? 'is-active' : ''}`}
            onClick={() => handleNav('pipeline')}
            style={screen === 'pipeline' ? { '--accent-color': 'var(--color-primary)' } as React.CSSProperties : undefined}
          >
            <span className="projects-sidebar-item-icon" style={{ color: screen === 'pipeline' ? 'var(--color-primary)' : undefined }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
              </svg>
            </span>
            <span className="projects-sidebar-item-label">Pipeline</span>
          </button>
          <button
            type="button"
            className={`projects-sidebar-item ${screen === 'reports' ? 'is-active' : ''}`}
            onClick={() => handleNav('reports')}
            style={screen === 'reports' ? { '--accent-color': '#06b6d4' } as React.CSSProperties : undefined}
          >
            <span className="projects-sidebar-item-icon" style={{ color: screen === 'reports' ? '#06b6d4' : undefined }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
                <line x1="6" y1="20" x2="6" y2="14"/>
              </svg>
            </span>
            <span className="projects-sidebar-item-label">Relatórios</span>
          </button>
        </div>

        <div className="projects-sidebar-nav crm-filters-container" style={{ flex: 1, overflowY: 'auto', paddingTop: '24px' }}>
          <div className="projects-sidebar-section" style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '0 8px' }}>
            
            {/* Busca e Ações */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Busca
              </div>
              <input
                type="search"
                className="f-input"
                style={{ width: '100%', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px 12px', color: 'var(--text-primary)', fontSize: '13px' }}
                value={filters.query}
                onChange={e => setFilters({ ...filters, query: e.target.value })}
                placeholder="Buscar..."
              />
              <button
                type="button"
                className="projects-btn"
                style={{ width: '100%', background: 'var(--color-primary)', color: '#fff', border: 'none', justifyContent: 'center', padding: '8px', fontSize: '13px', fontWeight: 600, marginTop: '4px' }}
                onClick={handleAddContact}
              >
                + Novo Contato
              </button>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '4px 0' }} />

            {/* Filtros */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Filtros</div>
              
              <div>
                <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '8px' }}>Estágio</div>
                <select
                  className="f-input"
                  style={{ width: '100%', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 8px', color: 'var(--text-primary)', fontSize: '12px' }}
                  value={Array.from(filters.stages as Set<CRMStageId>)[0] || ''}
                  onChange={e => {
                    const val = e.target.value
                    if (!val) {
                      setFilters({ ...filters, stages: new Set<CRMStageId>() })
                    } else {
                      setFilters({ ...filters, stages: new Set<CRMStageId>([val as CRMStageId]) })
                    }
                  }}
                >
                  <option value="">Todos os Estágios</option>
                  {CRM_STAGES.map(s => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '8px' }}>Prioridade</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {['alta', 'media', 'baixa'].map(p => {
                    const active = filters.priorities.has(p)
                    return (
                      <button
                        key={p}
                        className={`crm-chip ${active ? 'is-active' : ''}`}
                        style={{
                          fontSize: '11px', padding: '4px 10px', borderRadius: '99px',
                          border: `1px solid ${active ? '#06b6d4' : 'var(--border)'}`,
                          background: active ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
                          color: active ? '#06b6d4' : 'var(--text-secondary)',
                          cursor: 'pointer', transition: 'all 0.15s ease'
                        }}
                        onClick={() => {
                          const next = new Set(filters.priorities)
                          if (active) next.delete(p)
                          else next.add(p)
                          setFilters({ ...filters, priorities: next })
                        }}
                      >
                        {p === 'alta' ? 'Alta' : p === 'media' ? 'Média' : 'Baixa'}
                      </button>
                    )
                  })}
                </div>
              </div>

              {tags.length > 0 && (
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '8px' }}>Tags</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {tags.slice(0, 12).map((t) => {
                      const active = filters.tagIds.has(t.id)
                      return (
                        <button
                          key={t.id}
                          type="button"
                          className={`crm-chip crm-chip-tag ${active ? 'is-active' : ''}`}
                          style={{
                            fontSize: '11px', padding: '4px 10px', borderRadius: '99px',
                            backgroundColor: active ? t.color : 'transparent',
                            borderColor: t.color,
                            borderWidth: '1px', borderStyle: 'solid',
                            color: active ? '#fff' : 'var(--text-secondary)',
                            cursor: 'pointer', transition: 'all 0.15s ease'
                          }}
                          onClick={() => {
                            const next = new Set(filters.tagIds)
                            if (active) next.delete(t.id)
                            else next.add(t.id)
                            setFilters({ ...filters, tagIds: next })
                          }}
                        >
                          {t.name}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              <div>
                <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '8px' }}>Outros Filtros</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={filters.hasProject} onChange={e => setFilters({ ...filters, hasProject: e.target.checked })} />
                    Com projeto
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={filters.hasNote} onChange={e => setFilters({ ...filters, hasNote: e.target.checked })} />
                    Com nota
                  </label>
                  <select
                    className="f-input"
                    style={{ width: '100%', marginTop: '4px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 8px', color: 'var(--text-primary)', fontSize: '12px' }}
                    value={filters.recentInteractionDays}
                    onChange={e => setFilters({ ...filters, recentInteractionDays: Number(e.target.value) })}
                  >
                    <option value={0}>Qualquer interação</option>
                    <option value={7}>Últimos 7 dias</option>
                    <option value={14}>Últimos 14 dias</option>
                    <option value={30}>Últimos 30 dias</option>
                  </select>
                </div>
              </div>

              {hasActiveFilter && (
                <button
                  type="button"
                  className="projects-btn"
                  style={{ width: '100%', justifyContent: 'center', marginTop: '8px', fontSize: '12px', padding: '6px' }}
                  onClick={() => setFilters(createEmptyCRMFilters())}
                >
                  Limpar filtros
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <main className="projects-content-wrapper" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        <div className={`projects-mobile-overlay ${sidebarOpen ? 'is-visible' : ''}`} onClick={() => setSidebarOpen(false)} />
        <button 
          type="button"
          className="projects-btn projects-mobile-toggle" 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{ position: 'absolute', top: 16, left: 16, zIndex: 50 }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>

        {screen === 'pipeline' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Header info bar replacing CRMToolbar */}
            <div style={{ padding: '24px 24px 16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h1 className="projects-title">Pipeline</h1>
                <p className="projects-subtitle">
                  {hasActiveFilter ? `Exibindo ${filteredContacts.length} de ${contacts.length} contatos` : `${contacts.length} contatos no total`}
                </p>
              </div>
            </div>
            
            <div style={{ flex: 1, overflow: 'auto', padding: '0 24px 24px 24px' }}>
              <DndContext
                sensors={sensors}
                measuring={measuring}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <div style={{ display: 'flex', gap: '16px', height: '100%', alignItems: 'flex-start' }}>
                  {CRM_STAGES.map((stage) => (
                    <CRMColumn
                      key={stage.id}
                      stage={stage}
                      contacts={contactsByStage[stage.id] || []}
                      tags={tags}
                      interactions={interactions}
                      onEditContact={handleEditContact}
                      onDeleteContact={onRemoveContact}
                      onAddInteraction={onAddInteraction}
                      onRemoveInteraction={onRemoveInteraction}
                    />
                  ))}
                </div>

                <DragOverlay>
                  {activeContact ? (
                    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '16px', boxShadow: '0 8px 30px rgba(0,0,0,0.12)', width: '280px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{activeContact.name}</div>
                      {activeContact.company && <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>{activeContact.company}</div>}
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            </div>
          </div>
        )}

        {screen === 'reports' && (
          <CRMReportsPanel
            reports={reports}
            onContactClick={(contactId) => {
              const contact = contacts.find((c) => c.id === contactId)
              if (contact) {
                setSelectedContact(contact)
                setIsModalOpen(true)
              }
            }}
            onClose={() => handleNav('pipeline')}
          />
        )}
      </main>

      {isModalOpen && selectedContact && (
        <CRMContactModal
          contact={selectedContact}
          tags={tags}
          notes={notes}
          calendarEvents={calendarEvents}
          projects={projects}
          allInteractions={interactions.filter(i => i.contactId === selectedContact.id)}
          onClose={handleCloseModal}
          mode={modalMode}
          onUpdate={(updates) => onUpdateContact(selectedContact.id, updates)}
          onAddInteraction={(data) => onAddInteraction({ ...data, contactId: selectedContact.id })}
          onRemoveInteraction={onRemoveInteraction}
          onAddTag={onAddTag}
          onRemoveTag={onRemoveTag}
          onAddLink={(linkType, entityId) => onAddLink(selectedContact.id, linkType, entityId)}
          onRemoveLink={(linkType, entityId) => onRemoveLink(selectedContact.id, linkType, entityId)}
          onDelete={() => {
            onRemoveContact(selectedContact.id)
            handleCloseModal()
          }}
          onMoveToStage={onMoveContactToStage}
        />
      )}
    </div>
  )
}
