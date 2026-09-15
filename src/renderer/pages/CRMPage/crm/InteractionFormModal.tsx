/**
 * InteractionFormModal — modal para registrar interacao com contato CRM.
 *
 * Substitui os 2 prompts() do CRMContactModal.tsx (tipo + conteudo).
 * Upgrade 03.
 */

import React, { useState } from 'react'
import type { CRMInteractionType } from '@types'
import { CRM_INTERACTION_TYPES } from '@types'
import { Button, Input } from '@shared/components/primitives'
import { WysiwygEditor } from '../../shared/WysiwygEditor'

interface InteractionFormModalProps {
  onClose: () => void
  onConfirm: (data: { type: CRMInteractionType; content: string; date: string; time: string }) => void
}

function nowISODate(): string {
  return new Date().toISOString().slice(0, 10)
}

function nowTime(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export const InteractionFormModal: React.FC<InteractionFormModalProps> = ({
  onClose,
  onConfirm,
}) => {
  const [type, setType] = useState<CRMInteractionType>('nota')
  const [content, setContent] = useState('')
  const [date, setDate] = useState(nowISODate())
  const [time, setTime] = useState(nowTime())

  const isContentEmpty = !content || content.replace(/<[^>]*>/g, '').trim() === ''

  const handleSubmit = () => {
    if (isContentEmpty) return
    onConfirm({ type, content, date, time })
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal crm-interaction-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-header">
          <h2>Nova interacao</h2>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            &times;
          </button>
        </header>

        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Tipo</label>
            <select
              className="form-input"
              value={type}
              onChange={(e) => setType(e.target.value as CRMInteractionType)}
            >
              {(Object.keys(CRM_INTERACTION_TYPES) as CRMInteractionType[]).map((k) => (
                <option key={k} value={k}>
                  {CRM_INTERACTION_TYPES[k]}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Conteudo *</label>
            <div className="crm-interaction-editor">
              <WysiwygEditor
                content={content}
                onChange={(html) => setContent(html)}
                mode="compact"
                placeholder="O que aconteceu? Decisoes, proximos passos..."
                floatingToolbox={false}
                disableImages
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Data</label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                fullWidth
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Hora</label>
              <Input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                fullWidth
              />
            </div>
          </div>
        </div>

        <footer className="modal-footer">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleSubmit}
            disabled={isContentEmpty}
          >
            Registrar
          </Button>
        </footer>
      </div>
    </div>
  )
}
