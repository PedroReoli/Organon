/**
 * VersionsPanel — aside do detalhe de playbook mostrando versoes antigas.
 *
 * Renderiza a lista de PlaybookVersion (max 10) com botao restaurar e
 * aviso de rotacao. Upgrade 15.
 */

import React, { useState } from 'react'
import type { Playbook } from '@types'
import { PLAYBOOK_VERSIONS_LIMIT } from '@types'
import { VersionItem } from './VersionItem'
import { Button } from '@shared/components/primitives'

interface VersionsPanelProps {
  playbook: Playbook
  onRestore: (versionId: string) => void
  onClose: () => void
}

export const VersionsPanel: React.FC<VersionsPanelProps> = ({
  playbook,
  onRestore,
  onClose,
}) => {
  const versions = playbook.versions ?? []
  const [pendingVersionId, setPendingVersionId] = useState<string | null>(null)

  const confirmRestore = () => {
    if (!pendingVersionId) return
    onRestore(pendingVersionId)
    setPendingVersionId(null)
  }

  return (
    <aside className="today-section playbook-versions-panel">
      <div className="today-section-title">
        <h2>Historico</h2>
        <span className="today-section-count">{versions.length}</span>
        <button
          type="button"
          className="playbook-icon-btn"
          onClick={onClose}
          style={{ marginLeft: 'auto' }}
          title="Fechar historico"
          aria-label="Fechar historico"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            width="16"
            height="16"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {versions.length === 0 ? (
        <p className="playbook-versions-empty">
          Nenhuma versao salva ainda. Versoes sao criadas automaticamente a cada
          edicao salva. Maximo de {PLAYBOOK_VERSIONS_LIMIT} versoes — as mais
          antigas sao descartadas.
        </p>
      ) : (
        <>
          <div className="playbook-versions-list">
            {versions.map((v, index) => (
              <VersionItem
                key={v.id}
                version={v}
                index={index}
                isLast={index === versions.length - 1}
                onRestore={(versionId) => setPendingVersionId(versionId)}
              />
            ))}
          </div>

          {versions.length === PLAYBOOK_VERSIONS_LIMIT && (
            <p className="playbook-versions-rotation-notice">
              Limite de {PLAYBOOK_VERSIONS_LIMIT} atingido. Novas edicoes
              descartam a versao mais antiga.
            </p>
          )}
        </>
      )}

      {pendingVersionId && (
        <div
          className="modal-backdrop"
          onClick={() => setPendingVersionId(null)}
        >
          <div
            className="modal playbook-version-confirm-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Restaurar versao?</h2>
            </div>
            <div className="modal-body">
              <p>
                O estado atual do playbook sera salvo como uma nova versao antes
                de restaurar, entao voce pode desfazer depois.
              </p>
            </div>
            <div className="modal-footer">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setPendingVersionId(null)}
              >
                Cancelar
              </Button>
              <Button type="button" variant="primary" onClick={confirmRestore}>
                Restaurar
              </Button>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
