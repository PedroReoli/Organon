import { useState } from 'react'
import type { CRMContact, CRMTag, CRMInteraction, CRMInteractionType, Note, CalendarEvent, Project } from '../types'
import { CRM_PRIORITY_LABELS, CRM_PRIORITY_COLORS, CRM_INTERACTION_TYPES } from '../types'
import { formatDateFull } from '../utils'

interface CRMContactModalProps {
  contact: CRMContact
  tags: CRMTag[]
  notes: Note[]
  calendarEvents: CalendarEvent[]
  projects: Project[]
  allInteractions: CRMInteraction[]
  onClose: () => void
  onUpdate: (updates: Partial<CRMContact>) => void
  onAddInteraction: (data: { type: CRMInteractionType; content: string; date: string; time: string }) => void
  onRemoveInteraction: (interactionId: string) => void
  onAddTag: (name: string, color?: string) => string
  onRemoveTag: (tagId: string) => void
  onAddLink: (linkType: 'noteIds' | 'calendarEventIds' | 'fileIds' | 'cardIds' | 'projectIds', entityId: string) => void
  onRemoveLink: (linkType: 'noteIds' | 'calendarEventIds' | 'fileIds' | 'cardIds' | 'projectIds', entityId: string) => void
  onDelete: () => void
  onMoveToStage: (contactId: string, stageId: string) => void
}

export const CRMContactModal = ({
  contact,
  tags,
  notes,
  calendarEvents,
  projects,
  allInteractions,
  onClose,
  onUpdate,
  onAddInteraction,
  onRemoveInteraction,
  onAddTag,
  onAddLink,
  onRemoveLink,
  onDelete,
}: CRMContactModalProps) => {
  const [activeTab, setActiveTab] = useState<'details' | 'timeline' | 'links'>('details')
  const [editData, setEditData] = useState({
    name: contact.name,
    company: contact.company || '',
    role: contact.role || '',
    phone: contact.phone || '',
    email: contact.email || '',
    socialMedia: contact.socialMedia || '',
    context: contact.context || '',
    interests: contact.interests || '',
    description: contact.description || '',
    priority: contact.priority,
    followUpDate: contact.followUpDate || '',
  })

  // Auto-save on blur
  const handleBlur = () => {
    onUpdate({
      name: editData.name,
      company: editData.company || undefined,
      role: editData.role || undefined,
      phone: editData.phone || undefined,
      email: editData.email || undefined,
      socialMedia: editData.socialMedia || undefined,
      context: editData.context || undefined,
      interests: editData.interests || undefined,
      description: editData.description || undefined,
      priority: editData.priority,
      followUpDate: editData.followUpDate || undefined,
    })
  }

  const handleAddInteraction = () => {
    const type = prompt('Tipo:', 'nota') as CRMInteractionType
    if (!type) return
    const content = prompt('Conteúdo:')
    if (!content) return
    const now = new Date()
    const date = now.toISOString().split('T')[0]
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    onAddInteraction({ type, content, date, time })
  }

  const handleAddTag = () => {
    const name = prompt('Nome da tag:')
    if (!name) return
    const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899']
    const color = prompt('Cor (hex):', colors[Math.floor(Math.random() * colors.length)]) || colors[0]
    const newTagId = onAddTag(name, color)
    const newTags = [...contact.tags, newTagId]
    onUpdate({ tags: newTags })
  }

  const handleRemoveTag = (tagId: string) => {
    const newTags = contact.tags.filter(t => t !== tagId)
    onUpdate({ tags: newTags })
  }

  const handleLinkNote = () => {
    if (notes.length === 0) {
      alert('Não há notas disponíveis para vincular.')
      return
    }
    const selected = prompt(
      'Selecione (número):\n' + notes.map((note, idx) => `${idx + 1}. ${note.title}`).join('\n')
    )
    const idx = parseInt(selected || '0') - 1
    if (idx >= 0 && idx < notes.length) {
      onAddLink('noteIds', notes[idx].id)
    }
  }

  const handleCreateNote = () => {
    alert('Funcionalidade de criar nota será implementada em breve.')
  }

  const handleLinkEvent = () => {
    if (calendarEvents.length === 0) {
      alert('Não há eventos disponíveis para vincular.')
      return
    }
    const selected = prompt(
      'Selecione (número):\n' + calendarEvents.map((event, idx) => `${idx + 1}. ${event.title} (${formatDateFull(event.date)})`).join('\n')
    )
    const idx = parseInt(selected || '0') - 1
    if (idx >= 0 && idx < calendarEvents.length) {
      onAddLink('calendarEventIds', calendarEvents[idx].id)
    }
  }

  const handleCreateEvent = () => {
    alert('Funcionalidade de criar evento será implementada em breve.')
  }

  const handleLinkProject = () => {
    if (projects.length === 0) {
      alert('Não há projetos disponíveis para vincular.')
      return
    }
    const selected = prompt(
      'Selecione (número):\n' + projects.map((project, idx) => `${idx + 1}. ${project.name}`).join('\n')
    )
    const idx = parseInt(selected || '0') - 1
    if (idx >= 0 && idx < projects.length) {
      onAddLink('projectIds', projects[idx].id)
    }
  }

  const sortedInteractions = [...allInteractions].sort((a, b) => {
    const dateA = new Date(`${a.date}T${a.time}`)
    const dateB = new Date(`${b.date}T${b.time}`)
    return dateB.getTime() - dateA.getTime()
  })

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal crm-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <header className="modal-header">
          <div className="crm-modal-title-section">
            <input
              type="text"
              className="crm-modal-name-input"
              value={editData.name}
              onChange={e => setEditData({ ...editData, name: e.target.value })}
              onBlur={handleBlur}
            />
            <input
              type="text"
              placeholder="Empresa"
              className="crm-modal-company-input"
              value={editData.company}
              onChange={e => setEditData({ ...editData, company: e.target.value })}
              onBlur={handleBlur}
            />
          </div>
          <button className="modal-close-btn" onClick={onClose}>&times;</button>
        </header>

        {/* Tabs */}
        <div className="crm-modal-tabs">
          <button
            className={`crm-tab ${activeTab === 'details' ? 'active' : ''}`}
            onClick={() => setActiveTab('details')}
          >
            Detalhes
          </button>
          <button
            className={`crm-tab ${activeTab === 'timeline' ? 'active' : ''}`}
            onClick={() => setActiveTab('timeline')}
          >
            Timeline
          </button>
          <button
            className={`crm-tab ${activeTab === 'links' ? 'active' : ''}`}
            onClick={() => setActiveTab('links')}
          >
            Vínculos
          </button>
        </div>

        {/* Content */}
        <div className="modal-body" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {activeTab === 'details' && (
            <div className="crm-details-tab">
              {/* Priority */}
              <div className="crm-detail-row">
                <label>Prioridade:</label>
                <div className="crm-priority-buttons">
                  {(['alta', 'media', 'baixa'] as const).map(priority => (
                    <button
                      key={priority}
                      className={`crm-priority-btn ${editData.priority === priority ? 'active' : ''}`}
                      style={{
                        backgroundColor: editData.priority === priority ? CRM_PRIORITY_COLORS[priority] : undefined,
                      }}
                      onClick={() => {
                        setEditData({ ...editData, priority })
                        onUpdate({ priority })
                      }}
                    >
                      {CRM_PRIORITY_LABELS[priority]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Follow-up */}
              <div className="crm-detail-row">
                <label>Follow-up:</label>
                <input
                  type="date"
                  className="crm-followup-input"
                  value={editData.followUpDate}
                  onChange={e => setEditData({ ...editData, followUpDate: e.target.value })}
                  onBlur={handleBlur}
                />
              </div>

              {/* Contact Info */}
              <div className="crm-section">
                <h4>Informações de Contato</h4>
                <div className="crm-form-grid">
                  <div className="crm-form-group">
                    <label>Cargo:</label>
                    <input
                      type="text"
                      value={editData.role}
                      onChange={e => setEditData({ ...editData, role: e.target.value })}
                      onBlur={handleBlur}
                    />
                  </div>
                  <div className="crm-form-group">
                    <label>Telefone:</label>
                    <input
                      type="text"
                      value={editData.phone}
                      onChange={e => setEditData({ ...editData, phone: e.target.value })}
                      onBlur={handleBlur}
                    />
                  </div>
                  <div className="crm-form-group">
                    <label>E-mail:</label>
                    <input
                      type="email"
                      value={editData.email}
                      onChange={e => setEditData({ ...editData, email: e.target.value })}
                      onBlur={handleBlur}
                    />
                  </div>
                  <div className="crm-form-group">
                    <label>Rede Social:</label>
                    <input
                      type="text"
                      value={editData.socialMedia}
                      onChange={e => setEditData({ ...editData, socialMedia: e.target.value })}
                      onBlur={handleBlur}
                    />
                  </div>
                </div>
              </div>

              {/* Context & Interests */}
              <div className="crm-section">
                <h4>Contexto</h4>
                <div className="crm-form-group">
                  <label>Onde conheceu:</label>
                  <textarea
                    value={editData.context}
                    onChange={e => setEditData({ ...editData, context: e.target.value })}
                    onBlur={handleBlur}
                    rows={2}
                  />
                </div>
                <div className="crm-form-group">
                  <label>Interesses:</label>
                  <textarea
                    value={editData.interests}
                    onChange={e => setEditData({ ...editData, interests: e.target.value })}
                    onBlur={handleBlur}
                    rows={2}
                  />
                </div>
              </div>

              {/* Tags */}
              <div className="crm-section">
                <div className="crm-section-header">
                  <h4>Tags</h4>
                  <button className="btn btn-sm" onClick={handleAddTag}>+ Tag</button>
                </div>
                <div className="crm-tags-list">
                  {contact.tags.map(tagId => {
                    const tag = tags.find(t => t.id === tagId)
                    if (!tag) return null
                    return (
                      <span key={tagId} className="crm-tag" style={{ backgroundColor: tag.color }}>
                        {tag.name}
                        <button className="crm-tag-remove" onClick={() => handleRemoveTag(tagId)}>×</button>
                      </span>
                    )
                  })}
                  {contact.tags.length === 0 && <span className="crm-no-tags">Sem tags</span>}
                </div>
              </div>

              {/* Notes */}
              <div className="crm-section">
                <h4>Notas</h4>
                <textarea
                  className="crm-notes-textarea"
                  value={editData.description}
                  onChange={e => setEditData({ ...editData, description: e.target.value })}
                  onBlur={handleBlur}
                  rows={6}
                  placeholder="Notas sobre o contato..."
                />
              </div>
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="crm-timeline-tab">
              <div className="crm-timeline-header">
                <h4>Interações</h4>
                <button className="btn btn-sm" onClick={handleAddInteraction}>+ Nova Interação</button>
              </div>
              <div className="crm-timeline">
                {sortedInteractions.length === 0 ? (
                  <div className="crm-timeline-empty">
                    Nenhuma interação registrada ainda.
                  </div>
                ) : (
                  sortedInteractions.map(interaction => (
                    <div key={interaction.id} className="crm-timeline-item">
                      <div className="crm-timeline-icon">
                        {CRM_INTERACTION_TYPES[interaction.type as keyof typeof CRM_INTERACTION_TYPES]?.[0] || '📝'}
                      </div>
                      <div className="crm-timeline-content">
                        <div className="crm-timeline-header">
                          <span className="crm-timeline-type">
                            {CRM_INTERACTION_TYPES[interaction.type as keyof typeof CRM_INTERACTION_TYPES] || interaction.type}
                          </span>
                          <span className="crm-timeline-date">
                            {formatDateFull(interaction.date)} às {interaction.time}
                          </span>
                        </div>
                        <div className="crm-timeline-text">{interaction.content}</div>
                        <button
                          className="crm-timeline-delete"
                          onClick={() => onRemoveInteraction(interaction.id)}
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'links' && (
            <div className="crm-links-tab">
              {/* Notes Links */}
              <div className="crm-link-section">
                <div className="crm-link-header">
                  <h4>Notas Vinculadas</h4>
                  <div className="crm-link-buttons">
                    <button className="btn btn-sm btn-secondary" onClick={handleLinkNote}>Vincular Nota</button>
                    <button className="btn btn-sm btn-primary" onClick={handleCreateNote}>Criar Nota</button>
                  </div>
                </div>
                <div className="crm-link-list">
                  {contact.links.noteIds.length === 0 ? (
                    <span className="crm-no-links">Nenhuma nota vinculada</span>
                  ) : (
                    contact.links.noteIds.map(noteId => {
                      const note = notes.find(n => n.id === noteId)
                      return (
                        <div key={noteId} className="crm-link-item">
                          <span>{note?.title || 'Nota'}</span>
                          <button className="crm-link-remove" onClick={() => onRemoveLink('noteIds', noteId)}>×</button>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              {/* Calendar Events Links */}
              <div className="crm-link-section">
                <div className="crm-link-header">
                  <h4>Eventos do Calendário</h4>
                  <div className="crm-link-buttons">
                    <button className="btn btn-sm btn-secondary" onClick={handleLinkEvent}>Vincular Evento</button>
                    <button className="btn btn-sm btn-primary" onClick={handleCreateEvent}>Criar Evento</button>
                  </div>
                </div>
                <div className="crm-link-list">
                  {contact.links.calendarEventIds.length === 0 ? (
                    <span className="crm-no-links">Nenhum evento vinculado</span>
                  ) : (
                    contact.links.calendarEventIds.map(eventId => {
                      const event = calendarEvents.find(e => e.id === eventId)
                      return (
                        <div key={eventId} className="crm-link-item">
                          <span>{event?.title || 'Evento'} ({event ? formatDateFull(event.date) : ''})</span>
                          <button className="crm-link-remove" onClick={() => onRemoveLink('calendarEventIds', eventId)}>×</button>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              {/* Projects Links */}
              <div className="crm-link-section">
                <div className="crm-link-header">
                  <h4>Projetos Vinculados</h4>
                  <div className="crm-link-buttons">
                    <button className="btn btn-sm btn-secondary" onClick={handleLinkProject}>Vincular Projeto</button>
                    <button className="btn btn-sm btn-primary" onClick={() => alert('Funcionalidade de criar projeto será implementada em breve.')}>Criar Projeto</button>
                  </div>
                </div>
                <div className="crm-link-list">
                  {contact.links.projectIds.length === 0 ? (
                    <span className="crm-no-links">Nenhum projeto vinculado</span>
                  ) : (
                    contact.links.projectIds.map(projectId => {
                      const project = projects.find(p => p.id === projectId)
                      return (
                        <div key={projectId} className="crm-link-item">
                          <span>{project?.name || 'Projeto'}</span>
                          <button className="crm-link-remove" onClick={() => onRemoveLink('projectIds', projectId)}>×</button>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="modal-footer">
          <button className="btn btn-danger" onClick={onDelete}>Excluir Contato</button>
          <div style={{ flex: 1 }} />
          <button className="btn btn-primary" onClick={onClose}>Fechar</button>
        </footer>
      </div>
    </div>
  )
}

