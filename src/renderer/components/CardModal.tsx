import { useState, useEffect, useRef } from 'react'
import type { Card, CardPriority, CardStatus, Project } from '../types'
import { PRIORITY_LABELS, PRIORITY_COLORS, STATUS_LABELS, STATUS_COLORS, STATUS_ORDER } from '../types'
import { WysiwygEditor } from './WysiwygEditor'
import { getTodayISO } from '../utils'

interface CardModalProps {
  card: Card
  projects?: Project[]
  onClose: () => void
  onSave: (updates: {
    title: string
    descriptionHtml: string
    date: string | null
    time: string | null
    hasDate: boolean
    priority: CardPriority | null
    status: CardStatus
    projectId: string | null
  }) => void
  onDelete: () => void
}

export const CardModal = ({ card, projects, onClose, onSave, onDelete }: CardModalProps) => {
  const [title, setTitle] = useState(card.title)
  const [descriptionHtml, setDescriptionHtml] = useState(card.descriptionHtml)
  const [hasDate, setHasDate] = useState(card.hasDate)
  const [date, setDate] = useState(card.date ?? getTodayISO())
  const [time, setTime] = useState(card.time ?? '')
  const [priority, setPriority] = useState<CardPriority | null>(card.priority)
  const [status, setStatus] = useState<CardStatus>(card.status)
  const [projectId, setProjectId] = useState<string | null>(card.projectId ?? null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const titleInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    titleInputRef.current?.focus()
    titleInputRef.current?.select()
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleSave()
    }
  }

  const handleSave = () => {
    if (title.trim()) {
      onSave({
        title: title.trim(),
        descriptionHtml,
        date: hasDate ? date : null,
        time: hasDate ? (time.trim() ? time.trim() : null) : null,
        hasDate,
        priority,
        status,
        projectId,
      })
    } else {
      onClose()
    }
  }

  const handleDelete = () => {
    if (confirmDelete) {
      onDelete()
    } else {
      setConfirmDelete(true)
      setTimeout(() => setConfirmDelete(false), 3000)
    }
  }

  const handleHasDateChange = (checked: boolean) => {
    setHasDate(checked)
    if (checked && !date) {
      setDate(getTodayISO())
    }
    if (!checked) {
      setTime('')
    }
  }

  const priorities: (CardPriority | null)[] = [null, 'P1', 'P2', 'P3', 'P4']

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal">
        <header className="modal-header">
          <h2>Editar Card</h2>
          <button
            className="modal-close-btn"
            onClick={handleSave}
            title="Fechar (Esc)"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2 2l12 12M14 2L2 14" />
            </svg>
          </button>
        </header>

        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Titulo</label>
            <input
              ref={titleInputRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Digite o titulo do card"
              className="form-input"
            />
          </div>

          {/* Priority + Status row */}
          <div className="form-group">
            <label className="form-label">Prioridade</label>
            <div className="card-modal-pills">
              {priorities.map(p => (
                <button
                  key={p ?? 'none'}
                  type="button"
                  className={`card-modal-pill ${priority === p ? 'is-active' : ''}`}
                  style={p && priority === p ? { background: PRIORITY_COLORS[p], color: '#fff', borderColor: 'transparent' } : undefined}
                  onClick={() => setPriority(p)}
                >
                  {p ? `${p} - ${PRIORITY_LABELS[p]}` : 'Nenhuma'}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Status</label>
            <div className="card-modal-pills">
              {STATUS_ORDER.map(s => (
                <button
                  key={s}
                  type="button"
                  className={`card-modal-pill ${status === s ? 'is-active' : ''}`}
                  style={status === s ? { background: STATUS_COLORS[s], color: '#fff', borderColor: 'transparent' } : undefined}
                  onClick={() => setStatus(s)}
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Data especifica</label>
            <div className="form-date-row">
              <label className="form-checkbox">
                <input
                  type="checkbox"
                  checked={hasDate}
                  onChange={(e) => handleHasDateChange(e.target.checked)}
                />
                <span className="form-checkbox-label">Definir data para este card</span>
              </label>
              {hasDate && (
                <div className="form-date-time">
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="form-input form-input-date"
                  />
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="form-input form-input-time"
                    title="Hora (opcional)"
                  />
                </div>
              )}
            </div>
            <p className="form-hint">
              {hasDate
                ? 'Cards com data sao removidos no reset semanal.'
                : 'Cards sem data permanecem no planejamento apos o reset semanal.'}
            </p>
          </div>

          {/* Projeto */}
          {projects && projects.length > 0 && (
            <div className="form-group">
              <label className="form-label">Projeto</label>
              <select
                className="form-input"
                value={projectId ?? ''}
                onChange={e => setProjectId(e.target.value || null)}
              >
                <option value="">Nenhum projeto</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              {projectId && (
                <p className="form-hint">
                  Vinculado ao projeto: {projects.find(p => p.id === projectId)?.name}
                </p>
              )}
            </div>
          )}

          <div className="form-group card-modal-description-group">
            <label className="form-label">Descrição</label>
            <div className="card-modal-editor-shell">
              <WysiwygEditor
                content={descriptionHtml}
                onChange={setDescriptionHtml}
                mode="full"
                placeholder="Adicione detalhes, notas ou instruções..."
              />
            </div>
          </div>
        </div>

        <footer className="modal-footer">
          <button
            onClick={handleDelete}
            className={`btn btn-danger ${confirmDelete ? 'btn-confirm' : ''}`}
          >
            {confirmDelete ? 'Clique para confirmar' : 'Excluir'}
          </button>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={onClose} className="btn btn-secondary">
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={!title.trim()}
              className="btn btn-primary"
            >
              Salvar
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}
