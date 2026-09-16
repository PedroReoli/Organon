/**
 * SprintCardModal — Modal completo para criação e edição de cards de sprint.
 * Permite alterar título, descrição, prioridade, status, coluna, subgrupo (lane),
 * horas estimadas e itens de checklist.
 */

import React, { useState, useCallback } from 'react'
import type { SprintCard, SprintColumnSection, CardPriority, CardStatus, ChecklistItem } from '@types'
import { PRIORITY_LABELS, PRIORITY_COLORS, STATUS_LABELS, STATUS_ORDER } from '@types'

const COLUMNS = [
  { id: 'col-todo', name: 'A fazer' },
  { id: 'col-doing', name: 'Em progresso' },
  { id: 'col-review', name: 'Review' },
  { id: 'col-done', name: 'Concluído' },
]

export interface SprintCardModalProps {
  card: SprintCard
  sections: SprintColumnSection[]
  onClose: () => void
  onSave: (updates: Partial<Omit<SprintCard, 'id' | 'createdAt'>>) => void
  onDelete: () => void
}

export const SprintCardModal: React.FC<SprintCardModalProps> = ({
  card,
  sections,
  onClose,
  onSave,
  onDelete,
}) => {
  const [title, setTitle] = useState(card.title || '')
  const [description, setDescription] = useState(card.description || '')
  const [priority, setPriority] = useState<CardPriority | null>(card.priority ?? null)
  const [status, setStatus] = useState<CardStatus>(card.status || 'todo')
  const [columnId, setColumnId] = useState<string | null>(card.columnId ?? null)
  const [sectionId, setSectionId] = useState<string | null>(card.sectionId ?? null)
  const [estimatedHours, setEstimatedHours] = useState<number | ''>(card.estimatedHours ?? '')
  const [checklist, setChecklist] = useState<ChecklistItem[]>(card.checklist || [])
  const [newCheckItem, setNewCheckItem] = useState('')

  const availableSections = sections.filter((s) => s.columnId === columnId)

  const handleAddCheckItem = useCallback(() => {
    const text = newCheckItem.trim()
    if (!text) return
    const newItem: ChecklistItem = {
      id: `chk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      text,
      done: false,
    }
    setChecklist((prev) => [...prev, newItem])
    setNewCheckItem('')
  }, [newCheckItem])

  const handleToggleCheck = useCallback((id: string) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, done: !item.done } : item))
    )
  }, [])

  const handleRemoveCheck = useCallback((id: string) => {
    setChecklist((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    onSave({
      title: title.trim(),
      description,
      priority,
      status,
      columnId,
      sectionId: columnId ? sectionId : null,
      estimatedHours: typeof estimatedHours === 'number' ? estimatedHours : null,
      checklist,
    })
  }

  return (
    <div className="sb2-modal-overlay" onClick={onClose}>
      <div className="sb2-modal sb2-modal--card-details" onClick={(e) => e.stopPropagation()}>
        <div className="sb2-modal-header">
          <span className="sb2-modal-title">Detalhes do Card</span>
          <button type="button" className="sb2-modal-close" onClick={onClose}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="14" height="14">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="sb2-card-form">
          <div className="sb2-form-body">
            {/* Titulo */}
            <div className="sb2-field">
              <label className="sb2-field-label">Título</label>
              <input
                type="text"
                className="form-input sb2-input-title"
                placeholder="Título do card..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
                required
              />
            </div>

            {/* Descricao */}
            <div className="sb2-field">
              <label className="sb2-field-label">Descrição</label>
              <textarea
                className="form-input sb2-textarea"
                placeholder="Adicione detalhes ou notas..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="sb2-form-grid">
              {/* Prioridade */}
              <div className="sb2-field">
                <label className="sb2-field-label">Prioridade</label>
                <div className="sb2-prio-chips">
                  {(['P1', 'P2', 'P3', 'P4'] as CardPriority[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      className={`sb2-chip ${priority === p ? 'is-selected' : ''}`}
                      style={{
                        borderColor: PRIORITY_COLORS[p],
                        color: priority === p ? '#fff' : PRIORITY_COLORS[p],
                        backgroundColor: priority === p ? PRIORITY_COLORS[p] : 'transparent',
                      }}
                      onClick={() => setPriority(priority === p ? null : p)}
                    >
                      {PRIORITY_LABELS[p]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status */}
              <div className="sb2-field">
                <label className="sb2-field-label">Status</label>
                <select
                  className="form-input sb2-select"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as CardStatus)}
                >
                  {STATUS_ORDER.map((st) => (
                    <option key={st} value={st}>
                      {STATUS_LABELS[st]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Coluna */}
              <div className="sb2-field">
                <label className="sb2-field-label">Coluna</label>
                <select
                  className="form-input sb2-select"
                  value={columnId ?? 'backlog'}
                  onChange={(e) => {
                    const val = e.target.value === 'backlog' ? null : e.target.value
                    setColumnId(val)
                    setSectionId(null)
                  }}
                >
                  <option value="backlog">Backlog (Sem coluna)</option>
                  {COLUMNS.map((col) => (
                    <option key={col.id} value={col.id}>
                      {col.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subgrupo / Lane */}
              <div className="sb2-field">
                <label className="sb2-field-label">Subgrupo / Sub-lane</label>
                <select
                  className="form-input sb2-select"
                  value={sectionId ?? ''}
                  onChange={(e) => setSectionId(e.target.value || null)}
                  disabled={!columnId || availableSections.length === 0}
                >
                  <option value="">Sem subgrupo</option>
                  {availableSections.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      {sec.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Horas estimadas */}
              <div className="sb2-field">
                <label className="sb2-field-label">Estimativa (Horas/Pts)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  className="form-input"
                  placeholder="ex: 2.5"
                  value={estimatedHours}
                  onChange={(e) =>
                    setEstimatedHours(e.target.value === '' ? '' : parseFloat(e.target.value))
                  }
                />
              </div>
            </div>

            {/* Checklist */}
            <div className="sb2-field">
              <label className="sb2-field-label">Checklist ({checklist.filter((i) => i.done).length}/{checklist.length})</label>
              <div className="sb2-checklist-list">
                {checklist.map((item) => (
                  <div key={item.id} className="sb2-checklist-item">
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={() => handleToggleCheck(item.id)}
                    />
                    <span className={`sb2-checklist-text ${item.done ? 'is-done' : ''}`}>
                      {item.text}
                    </span>
                    <button
                      type="button"
                      className="sb2-checklist-del"
                      onClick={() => handleRemoveCheck(item.id)}
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
              <div className="sb2-checklist-add">
                <input
                  type="text"
                  className="form-input"
                  placeholder="Novo item do checklist..."
                  value={newCheckItem}
                  onChange={(e) => setNewCheckItem(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddCheckItem()
                    }
                  }}
                />
                <button type="button" className="sb2-btn-add-check" onClick={handleAddCheckItem}>
                  + Adicionar
                </button>
              </div>
            </div>
          </div>

          <div className="sb2-modal-actions">
            <button type="button" className="sb2-modal-btn sb2-modal-btn--danger" onClick={onDelete}>
              Remover Card
            </button>
            <button type="button" className="sb2-modal-btn sb2-modal-btn--cancel" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="sb2-modal-btn sb2-modal-btn--primary">
              Salvar Alterações
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
