import { useDroppable } from '@dnd-kit/core'
import type { CRMContact, CRMStage, CRMTag, CRMInteraction, CRMInteractionType } from '../types'
import { CRM_PRIORITY_COLORS } from '../types'
import { CRMContactCard } from './CRMContactCard'

interface CRMColumnProps {
  stage: CRMStage
  contacts: CRMContact[]
  tags: CRMTag[]
  interactions: CRMInteraction[]
  onEditContact: (contact: CRMContact) => void
  onDeleteContact: (contactId: string) => void
  onAddInteraction: (data: { contactId: string; type: CRMInteractionType; content: string; date: string; time: string }) => void
  onRemoveInteraction: (interactionId: string) => void
}

export const CRMColumn = ({
  stage,
  contacts,
  tags,
  interactions,
  onEditContact,
  onDeleteContact,
  onAddInteraction,
  onRemoveInteraction,
}: CRMColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
  })

  const getTagById = (tagId: string) => tags.find(t => t.id === tagId)

  return (
    <div
      ref={setNodeRef}
      className={`crm-column ${isOver ? 'crm-column-over' : ''}`}
      data-stage-id={stage.id}
    >
      <div className="crm-column-header">
        <h3>{stage.label}</h3>
        <span className="crm-column-count">{contacts.length}</span>
      </div>
      <p className="crm-column-description">{stage.description}</p>
      <div className="crm-column-content">
        {contacts.map(contact => (
          <CRMContactCard
            key={contact.id}
            contact={contact}
            tags={contact.tags.map(getTagById).filter(Boolean) as CRMTag[]}
            interactions={interactions.filter(i => i.contactId === contact.id)}
            priorityColor={CRM_PRIORITY_COLORS[contact.priority]}
            onEdit={() => onEditContact(contact)}
            onDelete={() => onDeleteContact(contact.id)}
            onAddInteraction={(data) => onAddInteraction({ ...data, contactId: contact.id })}
            onRemoveInteraction={onRemoveInteraction}
          />
        ))}
      </div>
    </div>
  )
}
