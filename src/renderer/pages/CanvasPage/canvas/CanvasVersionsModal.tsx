/**
 * CanvasVersionsModal — modal de versoes de canvas (Upgrade 18).
 *
 * Lista as ultimas snapshots locais (max 10), permite ver thumbnail
 * e restaurar uma versao anterior. Restore aplica o snapshot sobre
 * o canvas atual via callback.
 */

import React, { useState } from 'react'
import type { CanvasVersionEntry } from '@types'
import { Button } from '@shared/components/primitives/Button'
import { Modal } from '@/components/ui/Modal'

interface CanvasVersionsModalProps {
  canvasId: string
  versions: CanvasVersionEntry[]
  onClose: () => void
  onRestore: (snapshot: Record<string, unknown>) => void
  onRemoveVersion: (versionId: string) => void
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}

export const CanvasVersionsModal: React.FC<CanvasVersionsModalProps> = ({
  versions,
  onClose,
  onRestore,
  onRemoveVersion,
}) => {
  const [confirmRestoreId, setConfirmRestoreId] = useState<string | null>(null)

  const handleRestore = (version: CanvasVersionEntry) => {
    onRestore(version.snapshot)
    setConfirmRestoreId(null)
    onClose()
  }

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`Versões salvas (${versions.length})`}
      className="canvas-versions-modal"
      footer={<Button variant="primary" onClick={onClose}>Fechar</Button>}
    >
      {versions.length === 0 ? (
        <p className="canvas-versions-empty">Nenhuma versão salva ainda.</p>
      ) : (
        <ul className="canvas-versions-list">
          {versions.map((v) => {
            const isConfirming = confirmRestoreId === v.id
            return (
              <li key={v.id} className="canvas-versions-item">
                {v.thumbnail ? (
                  <img src={v.thumbnail} alt="" className="canvas-versions-thumb" />
                ) : (
                  <div className="canvas-versions-thumb canvas-versions-thumb-empty">∅</div>
                )}
                <div className="canvas-versions-info">
                  <span className="canvas-versions-date">{formatDate(v.createdAt)}</span>
                </div>
                {isConfirming ? (
                  <div className="canvas-versions-actions">
                    <Button size="sm" variant="primary" onClick={() => handleRestore(v)}>
                      Sim, restaurar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setConfirmRestoreId(null)}>
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <div className="canvas-versions-actions">
                    <Button size="sm" variant="secondary" onClick={() => setConfirmRestoreId(v.id)}>
                      Restaurar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => onRemoveVersion(v.id)}>
                      ×
                    </Button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </Modal>
  )
}
