/**
 * TagFormModal — modal para criar tag CRM com nome + cor.
 *
 * Substitui os 2 prompts() de criar tag no CRMContactModal.tsx.
 * Upgrade 03.
 */

import React, { useState } from 'react'
import { Button, Input } from '@shared/components/primitives'

interface TagFormModalProps {
  onClose: () => void
  onConfirm: (name: string, color: string) => void
}

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  'var(--color-primary)', 'var(--color-primary)', 'var(--color-primary)', 'var(--color-primary)',
]

export const TagFormModal: React.FC<TagFormModalProps> = ({
  onClose,
  onConfirm,
}) => {
  const [name, setName] = useState('')
  const [color, setColor] = useState(
    PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)],
  )

  const handleSubmit = () => {
    if (!name.trim()) return
    onConfirm(name.trim(), color)
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal crm-tag-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-header">
          <h2>Nova tag</h2>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            &times;
          </button>
        </header>

        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Nome *</label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: lead-quente, cliente-vip"
              fullWidth
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Cor</label>
            <div className="crm-tag-colors">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`crm-tag-color ${color === c ? 'is-active' : ''}`}
                  style={{ background: c }}
                  onClick={() => setColor(c)}
                  title={c}
                />
              ))}
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="crm-tag-color-custom"
                title="Cor personalizada"
              />
            </div>
          </div>

          <div className="crm-tag-preview">
            <span
              className="crm-tag-preview-chip"
              style={{ background: `${color}22`, color, borderColor: `${color}55` }}
            >
              #{name || 'preview'}
            </span>
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
            disabled={!name.trim()}
          >
            Criar
          </Button>
        </footer>
      </div>
    </div>
  )
}
