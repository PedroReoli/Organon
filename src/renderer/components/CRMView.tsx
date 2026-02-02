import { useState, useMemo } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { CRMContact, CRMStageId, CRMTag, Note, CalendarEvent, Project, CRMInteraction, CRMInteractionType } from '../types'
import { CRM_STAGES } from '../types'
import { getTodayISO } from '../utils'
import { CRMDoubleColumn } from './CRMDoubleColumn'
import { CRMContactModal } from './CRMContactModal'

interface CRMViewProps {
  contacts: CRMContact[]
  interactions: CRMInteraction[]
  tags: CRMTag[]
  notes: Note[]
  calendarEvents: CalendarEvent[]
  projects: Project[]
  // Contact methods
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
  // Interaction methods
  onAddInteraction: (data: { contactId: string; type: CRMInteractionType; content: string; date: string; time: string }) => string
  onRemoveInteraction: (interactionId: string) => void
  // Tag methods
  onAddTag: (name: string, color?: string) => string
  onRemoveTag: (tagId: string) => void
  // Link methods
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
  const [activeContact, setActiveContact] = useState<CRMContact | null>(null)
  const [selectedContact, setSelectedContact] = useState<CRMContact | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  )

  // Organizar contacts por estágio
  const contactsByStage = useMemo(() => {
    const result: Record<string, CRMContact[]> = {}
    CRM_STAGES.forEach(stage => {
      result[stage.id] = contacts
        .filter(c => c.stageId === stage.id)
        .sort((a, b) => a.order - b.order)
    })
    return result
  }, [contacts])

  // Contatos atrasados (follow-up antes de hoje)
  const overdueContacts = useMemo(() => {
    const today = getTodayISO()
    return contacts.filter(c => c.followUpDate && c.followUpDate < today)
  }, [contacts])

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const contact = contacts.find(c => c.id === active.id)
    if (contact) {
      setActiveContact(contact)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveContact(null)

    if (!over) return

    const contactId = active.id as string
    const overStageId = over.id as string

    // Verificar se é um stage válido
    const isValidStage = CRM_STAGES.some(s => s.id === overStageId)
    if (!isValidStage) return

    const contact = contacts.find(c => c.id === contactId)
    if (!contact) return

    // Se mudou de estágio, mover
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
    }
  }

  const handleEditContact = (contact: CRMContact) => {
    setSelectedContact(contact)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedContact(null)
  }


  return (
    <div className="crm-view">
      {/* Header */}
      <div className="crm-header">
        <div className="crm-header-title">
          <h2>CRM</h2>
          <span className="crm-count">{contacts.length} contatos</span>
          {overdueContacts.length > 0 && (
            <span className="crm-overdue-badge">
              {overdueContacts.length} follow-up atrasado{overdueContacts.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="crm-header-actions">
          <button className="btn btn-primary" onClick={handleAddContact}>
            + Novo Contato
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="crm-board">
          {/* Coluna 1: Prospecção + Qualificado */}
          <CRMDoubleColumn
            stage1={CRM_STAGES[0]}
            stage2={CRM_STAGES[1]}
            contacts1={contactsByStage[CRM_STAGES[0].id] || []}
            contacts2={contactsByStage[CRM_STAGES[1].id] || []}
            tags={tags}
            interactions={interactions}
            onEditContact={handleEditContact}
            onDeleteContact={onRemoveContact}
            onAddInteraction={onAddInteraction}
            onRemoveInteraction={onRemoveInteraction}
          />

          {/* Coluna 2: Primeiro Contato + Análise */}
          <CRMDoubleColumn
            stage1={CRM_STAGES[2]}
            stage2={CRM_STAGES[3]}
            contacts1={contactsByStage[CRM_STAGES[2].id] || []}
            contacts2={contactsByStage[CRM_STAGES[3].id] || []}
            tags={tags}
            interactions={interactions}
            onEditContact={handleEditContact}
            onDeleteContact={onRemoveContact}
            onAddInteraction={onAddInteraction}
            onRemoveInteraction={onRemoveInteraction}
          />

          {/* Coluna 3: Proposta Enviada + Negociação */}
          <CRMDoubleColumn
            stage1={CRM_STAGES[4]}
            stage2={CRM_STAGES[5]}
            contacts1={contactsByStage[CRM_STAGES[4].id] || []}
            contacts2={contactsByStage[CRM_STAGES[5].id] || []}
            tags={tags}
            interactions={interactions}
            onEditContact={handleEditContact}
            onDeleteContact={onRemoveContact}
            onAddInteraction={onAddInteraction}
            onRemoveInteraction={onRemoveInteraction}
          />

          {/* Coluna 4: Cliente Ativo + Perdeu */}
          <CRMDoubleColumn
            stage1={CRM_STAGES[6]}
            stage2={CRM_STAGES[7]}
            contacts1={contactsByStage[CRM_STAGES[6].id] || []}
            contacts2={contactsByStage[CRM_STAGES[7].id] || []}
            tags={tags}
            interactions={interactions}
            onEditContact={handleEditContact}
            onDeleteContact={onRemoveContact}
            onAddInteraction={onAddInteraction}
            onRemoveInteraction={onRemoveInteraction}
          />
        </div>

        <DragOverlay>
          {activeContact ? (
            <div className="crm-card-drag-overlay">
              <div className="crm-card-overlay-content">
                <strong>{activeContact.name}</strong>
                {activeContact.company && <span>{activeContact.company}</span>}
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Contact Modal */}
      {isModalOpen && selectedContact && (
        <CRMContactModal
          contact={selectedContact}
          tags={tags}
          notes={notes}
          calendarEvents={calendarEvents}
          projects={projects}
          allInteractions={interactions.filter(i => i.contactId === selectedContact.id)}
          onClose={handleCloseModal}
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
