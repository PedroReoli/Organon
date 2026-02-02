import { useDroppable } from '@dnd-kit/core'
import type { CRMContact, CRMStage, CRMTag, CRMInteraction, CRMInteractionType } from '../types'
import { CRM_PRIORITY_COLORS } from '../types'
import { CRMContactCard } from './CRMContactCard'

interface CRMDoubleColumnProps {
  stage1: CRMStage
  stage2: CRMStage
  contacts1: CRMContact[]
  contacts2: CRMContact[]
  tags: CRMTag[]
  interactions: CRMInteraction[]
  onEditContact: (contact: CRMContact) => void
  onDeleteContact: (contactId: string) => void
  onAddInteraction: (data: { contactId: string; type: CRMInteractionType; content: string; date: string; time: string }) => void
  onRemoveInteraction: (interactionId: string) => void
}

export const CRMDoubleColumn = ({
  stage1,
  stage2,
  contacts1,
  contacts2,
  tags,
  interactions,
  onEditContact,
  onDeleteContact,
  onAddInteraction,
  onRemoveInteraction,
}: CRMDoubleColumnProps) => {
  const { setNodeRef: setNodeRef1, isOver: isOver1 } = useDroppable({
    id: stage1.id,
  })

  const { setNodeRef: setNodeRef2, isOver: isOver2 } = useDroppable({
    id: stage2.id,
  })

  const getTagById = (tagId: string) => tags.find(t => t.id === tagId)

  return (
    <div className="crm-double-column">
      {/* Primeira sub-coluna */}
      <div
        ref={setNodeRef1}
        className={`crm-sub-column ${isOver1 ? 'crm-column-over' : ''}`}
        data-stage-id={stage1.id}
      >
        <div className="crm-column-header">
          <h3>{stage1.label}</h3>
          <span className="crm-column-count">{contacts1.length}</span>
        </div>
        <p className="crm-column-description">{stage1.description}</p>
        <div className="crm-column-content">
          {contacts1.map(contact => (
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

      {/* Divisor */}
      <div className="crm-column-divider" />

      {/* Segunda sub-coluna */}
      <div
        ref={setNodeRef2}
        className={`crm-sub-column ${isOver2 ? 'crm-column-over' : ''}`}
        data-stage-id={stage2.id}
      >
        <div className="crm-column-header">
          <h3>{stage2.label}</h3>
          <span className="crm-column-count">{contacts2.length}</span>
        </div>
        <p className="crm-column-description">{stage2.description}</p>
        <div className="crm-column-content">
          {contacts2.map(contact => (
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
    </div>
  )
}
