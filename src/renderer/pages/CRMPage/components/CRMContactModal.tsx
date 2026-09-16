import { useEffect, useMemo, useRef, useState } from 'react'
import type { CRMContact, CRMTag, CRMInteraction, CRMInteractionType, Note, CalendarEvent, Project } from '@types'
import { CRM_PRIORITY_LABELS, CRM_PRIORITY_COLORS, CRM_INTERACTION_TYPES } from '@types'
import { formatDateFull } from '@utils'
import { Button } from '@shared/components/primitives'
import { MessageSquare } from 'lucide-react'
import { InteractionFormModal } from '../crm/InteractionFormModal'
import { TagFormModal } from '../crm/TagFormModal'
import { EntityPickerModal, type EntityPickerItem } from '../crm/EntityPickerModal'
import { WysiwygEditor } from '../../shared/WysiwygEditor'

type EntityPickerKind = 'note' | 'event' | 'project'

interface CRMContactModalProps {
  contact: CRMContact
  tags: CRMTag[]
  notes: Note[]
  calendarEvents: CalendarEvent[]
  projects: Project[]
  allInteractions: CRMInteraction[]
  onClose: () => void
  mode?: 'quick' | 'full'
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
  mode = 'full',
  onUpdate,
  onAddInteraction,
  onRemoveInteraction,
  onAddTag,
  onAddLink,
  onRemoveLink,
  onDelete,
}: CRMContactModalProps) => {
  const nameRef = useRef<HTMLInputElement | null>(null)
  const [viewMode, setViewMode] = useState<'quick' | 'full'>(mode)
  const [activeTab, setActiveTab] = useState<'details' | 'timeline' | 'links'>('details')
  const [showInteractionModal, setShowInteractionModal] = useState(false)
  const [showTagModal, setShowTagModal] = useState(false)
  const [entityPicker, setEntityPicker] = useState<EntityPickerKind | null>(null)
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

  useEffect(() => {
    setViewMode(mode)
  }, [mode])

  useEffect(() => {
    nameRef.current?.focus()
    nameRef.current?.select()
  }, [])

  const commit = () => {
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

  // Auto-save on blur (somente no modo full)
  const handleBlur = () => {
    if (viewMode !== 'full') return
    commit()
  }

  const handleConfirmInteraction = (data: { type: CRMInteractionType; content: string; date: string; time: string }) => {
    onAddInteraction(data)
  }

  const handleConfirmTag = (name: string, color: string) => {
    const newTagId = onAddTag(name, color)
    const newTags = [...contact.tags, newTagId]
    onUpdate({ tags: newTags })
  }

  const handleRemoveTag = (tagId: string) => {
    const newTags = contact.tags.filter(t => t !== tagId)
    onUpdate({ tags: newTags })
  }

  const handlePickEntity = (id: string) => {
    if (entityPicker === 'note') onAddLink('noteIds', id)
    else if (entityPicker === 'event') onAddLink('calendarEventIds', id)
    else if (entityPicker === 'project') onAddLink('projectIds', id)
  }

  const pickerConfig = useMemo(() => {
    if (entityPicker === 'note') {
      const items: EntityPickerItem[] = notes.map(n => ({ id: n.id, label: n.title || 'Nota sem titulo' }))
      return {
        title: 'Vincular nota',
        emptyMessage: 'Nenhuma nota disponivel.',
        items,
        alreadyLinkedIds: new Set(contact.links.noteIds),
      }
    }
    if (entityPicker === 'event') {
      const items: EntityPickerItem[] = calendarEvents.map(e => ({
        id: e.id,
        label: e.title || 'Evento sem titulo',
        sublabel: formatDateFull(e.date),
      }))
      return {
        title: 'Vincular evento',
        emptyMessage: 'Nenhum evento disponivel.',
        items,
        alreadyLinkedIds: new Set(contact.links.calendarEventIds),
      }
    }
    if (entityPicker === 'project') {
      const items: EntityPickerItem[] = projects.map(p => ({ id: p.id, label: p.name || 'Projeto sem nome' }))
      return {
        title: 'Vincular projeto',
        emptyMessage: 'Nenhum projeto disponivel.',
        items,
        alreadyLinkedIds: new Set(contact.links.projectIds),
      }
    }
    return null
  }, [entityPicker, notes, calendarEvents, projects, contact.links])

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
              ref={nameRef}
              placeholder={viewMode === 'quick' ? 'Nome do contato' : undefined}
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
        {viewMode === 'full' && (
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
        )}

        {/* Content */}
        <div className="modal-body" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {viewMode === 'quick' && (
            <div className="crm-quick-tab">
              <div className="crm-quick-grid">
                <div className="crm-form-group">
                  <label>Telefone</label>
                  <input
                    type="text"
                    value={editData.phone}
                    onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                    placeholder="Telefone"
                  />
                </div>
                <div className="crm-form-group">
                  <label>E-mail</label>
                  <input
                    type="email"
                    value={editData.email}
                    onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                    placeholder="E-mail"
                  />
                </div>
                <div className="crm-form-group">
                  <label>Cargo</label>
                  <input
                    type="text"
                    value={editData.role}
                    onChange={(e) => setEditData({ ...editData, role: e.target.value })}
                    placeholder="Cargo"
                  />
                </div>
                <div className="crm-form-group">
                  <label>Follow-up</label>
                  <input
                    type="date"
                    value={editData.followUpDate}
                    onChange={(e) => setEditData({ ...editData, followUpDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="crm-quick-priority">
                <div className="crm-detail-row" style={{ marginBottom: 0 }}>
                  <label>Prioridade:</label>
                  <div className="crm-priority-buttons">
                    {(['alta', 'media', 'baixa'] as const).map(priority => (
                      <button
                        key={priority}
                        className={`crm-priority-btn ${editData.priority === priority ? 'active' : ''}`}
                        style={{
                          backgroundColor: editData.priority === priority ? CRM_PRIORITY_COLORS[priority] : undefined,
                        }}
                        onClick={() => setEditData({ ...editData, priority })}
                        type="button"
                      >
                        {CRM_PRIORITY_LABELS[priority]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="crm-quick-notes">
                <label>Notas rápidas</label>
                <div className="crm-quick-editor">
                  <WysiwygEditor
                    content={editData.description}
                    onChange={(html) => setEditData({ ...editData, description: html })}
                    mode="compact"
                    placeholder="Opcional…"
                    floatingToolbox={false}
                    disableImages
                  />
                </div>
              </div>

            </div>
          )}

          {viewMode === 'full' && activeTab === 'details' && (
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
                  <Button size="sm" variant="secondary" onClick={() => setShowTagModal(true)}>+ Tag</Button>
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
                <div className="crm-notes-editor" onBlurCapture={handleBlur}>
                  <WysiwygEditor
                    content={editData.description}
                    onChange={(html) => setEditData({ ...editData, description: html })}
                    mode="compact"
                    placeholder="Notas sobre o contato..."
                    floatingToolbox={false}
                    disableImages
                  />
                </div>
              </div>
            </div>
          )}

          {viewMode === 'full' && activeTab === 'timeline' && (
            <div className="crm-timeline-tab">
              <div className="crm-timeline-header">
                <h4>Interações</h4>
                <Button size="sm" variant="secondary" onClick={() => setShowInteractionModal(true)}>+ Nova Interação</Button>
              </div>
              <div className="crm-timeline">
                {sortedInteractions.length === 0 ? (
                  <div className="crm-timeline-empty">
                    Nenhuma interação registrada ainda.
                  </div>
                ) : (
                  sortedInteractions.map(interaction => (
                    <div key={interaction.id} className="crm-timeline-item">
                      <div className="crm-timeline-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <MessageSquare size={13} />
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
                        <div className="crm-timeline-text" dangerouslySetInnerHTML={{ __html: interaction.content }} />
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

          {viewMode === 'full' && activeTab === 'links' && (
            <div className="crm-links-tab">
              {/* Notes Links */}
              <div className="crm-link-section">
                <div className="crm-link-header">
                  <h4>Notas Vinculadas</h4>
                  <div className="crm-link-buttons">
                    <Button size="sm" variant="secondary" onClick={() => setEntityPicker('note')}>Vincular Nota</Button>
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
                    <Button size="sm" variant="secondary" onClick={() => setEntityPicker('event')}>Vincular Evento</Button>
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
                    <Button size="sm" variant="secondary" onClick={() => setEntityPicker('project')}>Vincular Projeto</Button>
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
          {viewMode === 'full' ? (
            <>
              <Button variant="danger" onClick={onDelete}>Excluir Contato</Button>
              <div style={{ flex: 1 }} />
              <Button variant="primary" onClick={onClose}>Fechar</Button>
            </>
          ) : (
            <>
              <Button variant="danger" onClick={onDelete}>Descartar</Button>
              <div style={{ flex: 1 }} />
              <Button variant="secondary" onClick={() => setViewMode('full')}>Mais detalhes</Button>
              <Button
                variant="primary"
                onClick={() => {
                  commit()
                  onClose()
                }}
              >
                Salvar
              </Button>
            </>
          )}
        </footer>
      </div>

      {showInteractionModal && (
        <InteractionFormModal
          onClose={() => setShowInteractionModal(false)}
          onConfirm={handleConfirmInteraction}
        />
      )}

      {showTagModal && (
        <TagFormModal
          onClose={() => setShowTagModal(false)}
          onConfirm={handleConfirmTag}
        />
      )}

      {entityPicker && pickerConfig && (
        <EntityPickerModal
          title={pickerConfig.title}
          emptyMessage={pickerConfig.emptyMessage}
          items={pickerConfig.items}
          alreadyLinkedIds={pickerConfig.alreadyLinkedIds}
          onClose={() => setEntityPicker(null)}
          onSelect={handlePickEntity}
        />
      )}
    </div>
  )
}

