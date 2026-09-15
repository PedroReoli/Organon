
import type { PlaybookDialog, PlaybookVariable } from '@types'
import { Button } from '@shared/components/primitives'
import { VariableInputForm } from './variables'

interface DialogPreviewModalProps {
  selectedDialog:            PlaybookDialog
  selectedDialogResolvedVariables: PlaybookVariable[]
  selectedDialogPreviewHtml: string
  dialogVariableValues:      Record<string, string>
  dialogVariableBold:        Record<string, boolean>
  dialogCopyStatus:          string
  setDialogVariableValues:   (updater: (prev: Record<string, string>) => Record<string, string>) => void
  setDialogVariableBold:     (updater: (prev: Record<string, boolean>) => Record<string, boolean>) => void
  setDialogCopyStatus:       (v: string) => void
  onClose:                   () => void
  onEdit:                    () => void
  onCopy:                    () => void
}

export const DialogPreviewModal = ({
  selectedDialog,
  selectedDialogResolvedVariables,
  selectedDialogPreviewHtml,
  dialogVariableValues,
  dialogVariableBold,
  dialogCopyStatus,
  setDialogVariableValues,
  setDialogVariableBold,
  setDialogCopyStatus,
  onClose,
  onEdit,
  onCopy,
}: DialogPreviewModalProps) => {
  const handleChangeValue = (key: string, value: string) => {
    setDialogVariableValues((prev) => ({ ...prev, [key]: value }))
    setDialogCopyStatus('')
  }

  const handleToggleBold = (key: string) => {
    setDialogVariableBold((prev) => ({ ...prev, [key]: !prev[key] }))
    setDialogCopyStatus('')
  }

  const copyCount = selectedDialog.copyCount ?? 0

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal playbook-dialog-preview-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2>{selectedDialog.title || 'Dialogo'}</h2>
            {copyCount > 0 && (
              <span className="playbook-dialog-preview-count">
                Copiado {copyCount}x
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="playbook-icon-btn"
              onClick={onEdit}
              title="Editar dialogo"
              aria-label="Editar dialogo"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                width="16"
                height="16"
              >
                <path d="M3 17.25V21h3.75L17.8 9.95l-3.75-3.75L3 17.25z" />
                <path d="M14.06 4.94l3.75 3.75" />
              </svg>
            </button>
            <button
              type="button"
              className="modal-close-btn"
              onClick={onClose}
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
        </div>

        <div className="modal-body playbook-dialog-preview-modal-body">
          <div className="playbook-dialog-split">
            {selectedDialogResolvedVariables.length > 0 && (
              <div className="playbook-dialog-split-editor">
                <div className="playbook-variables">
                  <h4>Preencher variaveis</h4>
                  <VariableInputForm
                    variables={selectedDialogResolvedVariables}
                    values={dialogVariableValues}
                    bold={dialogVariableBold}
                    onChangeValue={handleChangeValue}
                    onToggleBold={handleToggleBold}
                  />
                </div>
              </div>
            )}

            <div className={selectedDialogResolvedVariables.length > 0 ? "playbook-dialog-split-preview" : ""}>
              <div className="playbook-preview" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div className="playbook-preview-header">
                  <h4>Preview</h4>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={onCopy}
                  >
                    Copiar mensagem
                  </Button>
                </div>
                <div
                  className="playbook-dialog-detail-content playbook-content-html"
                  style={{ flex: 1, minHeight: 0 }}
                  dangerouslySetInnerHTML={{
                    __html: selectedDialogPreviewHtml || '<p>Sem conteudo.</p>',
                  }}
                />
                {dialogCopyStatus && (
                  <span className="playbook-copy-status">{dialogCopyStatus}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <Button type="button" variant="secondary" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </div>
  )
}
