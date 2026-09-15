/**
 * Galeria de templates pre-feitos exibida ao criar um novo playbook.
 * Upgrade 15.
 */

import React from 'react'
import { BUILTIN_PLAYBOOK_TEMPLATES } from './index'
import type { PlaybookTemplate } from '@types'
import { Button } from '@shared/components/primitives'

interface TemplateGalleryProps {
  onSelect: (template: PlaybookTemplate | null) => void
  onCancel: () => void
}

const ICON_MAP: Record<string, JSX.Element> = {
  sales: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
      <path d="M3 3v18h18" />
      <path d="M7 14l4-4 4 4 6-6" />
    </svg>
  ),
  support: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  ),
  recruit: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <line x1="20" y1="8" x2="20" y2="14" />
      <line x1="23" y1="11" x2="17" y2="11" />
    </svg>
  ),
  meeting: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
}

export const TemplateGallery: React.FC<TemplateGalleryProps> = ({
  onSelect,
  onCancel,
}) => {
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div
        className="modal playbook-template-gallery-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>Escolha um ponto de partida</h2>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onCancel}
            aria-label="Fechar"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              width="18"
              height="18"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="modal-body playbook-template-gallery-body">
          <p className="playbook-template-gallery-intro">
            Comece do zero ou use um template pronto. Voce pode editar tudo depois.
          </p>

          <div className="playbook-template-gallery-grid">
            <button
              type="button"
              className="playbook-template-card is-blank"
              onClick={() => onSelect(null)}
            >
              <div className="playbook-template-card-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  width="22"
                  height="22"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </div>
              <strong>Em branco</strong>
              <span>Criar playbook do zero</span>
            </button>

            {BUILTIN_PLAYBOOK_TEMPLATES.map((template) => (
              <button
                key={template.id}
                type="button"
                className="playbook-template-card"
                onClick={() => onSelect(template)}
              >
                <div className="playbook-template-card-icon">
                  {ICON_MAP[template.icon] ?? ICON_MAP.meeting}
                </div>
                <strong>{template.name}</strong>
                <span>{template.description}</span>
                <small className="playbook-template-card-count">
                  {template.dialogs.length} dialog
                  {template.dialogs.length === 1 ? '' : 's'}
                </small>
              </button>
            ))}
          </div>
        </div>

        <div className="modal-footer">
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  )
}
