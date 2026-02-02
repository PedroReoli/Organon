import { useDraggable } from '@dnd-kit/core'
import type { CRMContact, CRMTag, CRMInteraction, CRMInteractionType } from '../types'
import { formatDateShort } from '../utils'
import { CRM_INTERACTION_TYPES } from '../types'

interface CRMContactCardProps {
  contact: CRMContact
  tags: CRMTag[]
  interactions: CRMInteraction[]
  priorityColor: string
  onEdit: () => void
  onDelete: () => void
  onAddInteraction: (data: { type: CRMInteractionType; content: string; date: string; time: string }) => void
  onRemoveInteraction: (interactionId: string) => void
}

export const CRMContactCard = ({
  contact,
  tags,
  interactions,
  priorityColor,
  onEdit,
  onAddInteraction,
}: CRMContactCardProps) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: contact.id,
  })

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0.5 : 1,
      }
    : undefined

  const lastInteraction = interactions.sort((a, b) => {
    const dateA = new Date(`${a.date}T${a.time}`)
    const dateB = new Date(`${b.date}T${b.time}`)
    return dateB.getTime() - dateA.getTime()
  })[0]


  return (
    <div
      ref={setNodeRef}
      style={style}
      className="crm-card"
      {...listeners}
      {...attributes}
      onClick={onEdit}
    >
      <div className="crm-card-header">
        <div className="crm-card-name">{contact.name}</div>
        <div
          className="crm-card-priority"
          style={{ backgroundColor: priorityColor }}
          title="Prioridade"
        />
      </div>

      {contact.company && (
        <div className="crm-card-company">{contact.company}</div>
      )}

      {contact.role && (
        <div className="crm-card-role">{contact.role}</div>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div className="crm-card-tags">
          {tags.map(tag => (
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

      {/* Follow-up */}
      {contact.followUpDate && (
        <div className="crm-card-followup">
          <span className="crm-followup-icon">📅</span>
          {formatDateShort(contact.followUpDate)}
        </div>
      )}

      {/* Última interação */}
      {lastInteraction && (
        <div className="crm-card-last-interaction">
          <span className="crm-interaction-icon">
            {CRM_INTERACTION_TYPES[lastInteraction.type as keyof typeof CRM_INTERACTION_TYPES] || '📝'}
          </span>
          <span className="crm-interaction-preview">
            {lastInteraction.content.slice(0, 30)}
            {lastInteraction.content.length > 30 ? '...' : ''}
          </span>
        </div>
      )}

      {/* Quick actions */}
      <div className="crm-card-actions">
        <button
          className="crm-action-btn"
          onClick={(e) => {
            e.stopPropagation()
            const type = prompt('Tipo (nota/ligacao/email/reuniao/mensagem/outro):') as CRMInteractionType
            if (type) {
              const content = prompt('Descrição:')
              if (content) {
                const now = new Date()
                const date = now.toISOString().split('T')[0]
                const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
                onAddInteraction({ type, content, date, time })
              }
            }
          }}
          title="Adicionar interação"
        >
          +
        </button>
      </div>
    </div>
  )
}
