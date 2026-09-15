import { useCallback, useMemo, useState } from 'react'
import type { DialogForm } from '@types'
import type { PlaybookVariable } from '@types'
import { WysiwygEditor } from '../../shared/WysiwygEditor'
import { Button, Input } from '@shared/components/primitives'
import { VariableForm, VariableChips } from './variables'
import { processDialogText } from './utils'
import { applyVariableValues, resolveDialogVariables } from './variables'

interface DialogFormModalProps {
  editingDialogId: string | null
  dialogForm:      DialogForm
  setDialogForm:   (updater: (prev: DialogForm) => DialogForm) => void
  onCancel:        () => void
  onConfirm:       () => void
  onRemove:        () => void
}

export const DialogFormModal = ({
  editingDialogId,
  dialogForm,
  setDialogForm,
  onCancel,
  onConfirm,
  onRemove,
}: DialogFormModalProps) => {
  const [tagInput, setTagInput] = useState('')

  const handleVariablesChange = useCallback(
    (next: PlaybookVariable[]) => {
      setDialogForm((prev) => ({ ...prev, variables: next }))
    },
    [setDialogForm],
  )

  const handleInsertVariable = useCallback(
    (key: string) => {
      document.dispatchEvent(new CustomEvent('wysiwyg-insert-content', { detail: { text: `{${key}}` } }))
    },
    [],
  )

  const handleAddTag = () => {
    const tag = tagInput.trim().toLowerCase()
    if (!tag) return
    if (dialogForm.tags.includes(tag)) { setTagInput(''); return }
    setDialogForm(prev => ({ ...prev, tags: [...prev.tags, tag] }))
    setTagInput('')
  }

  const handleRemoveTag = (tag: string) => {
    setDialogForm(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }))
  }

  const previewHtml = useMemo(() => {
    const base = processDialogText(dialogForm.text)
    const resolved = resolveDialogVariables(base, dialogForm.variables)
    const defaults: Record<string, string> = {}
    const boldMap: Record<string, boolean> = {}
    resolved.forEach(v => { defaults[v.key] = v.defaultValue ?? `[${v.key}]`; boldMap[v.key] = false })
    return applyVariableValues(base, resolved, defaults, boldMap)
  }, [dialogForm.text, dialogForm.variables])

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div
        className="modal playbook-create-modal playbook-dialog-form-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>{editingDialogId ? 'Editar dialogo' : 'Novo dialogo'}</h2>
          <button type="button" className="modal-close-btn" onClick={onCancel}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="modal-body playbook-modal-body">
          <div className="playbook-dialog-form-top">
            <label className="playbook-field" style={{ flex: 1 }}>
              <span>Titulo</span>
              <Input
                fullWidth
                type="text"
                value={dialogForm.title}
                onChange={(e) =>
                  setDialogForm((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="Ex: Abertura da conversa"
              />
            </label>
            <div className="playbook-field playbook-tags-field">
              <span>Tags</span>
              <div className="playbook-tags-input-row">
                <Input
                  type="text"
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag() } }}
                  placeholder="Ex: abertura"
                />
                <Button type="button" variant="secondary" size="sm" onClick={handleAddTag} disabled={!tagInput.trim()}>+</Button>
              </div>
              {dialogForm.tags.length > 0 && (
                <div className="playbook-tags-chips">
                  {dialogForm.tags.map(tag => (
                    <span key={tag} className="playbook-tag-chip">
                      {tag}
                      <button type="button" onClick={() => handleRemoveTag(tag)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="10" height="10"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <VariableForm
            variables={dialogForm.variables}
            onChange={handleVariablesChange}
          />

          <div className="playbook-dialog-split">
            <div className="playbook-dialog-split-editor">
              <div className="playbook-field">
                <div className="playbook-field-header">
                  <span>Conteudo</span>
                  <VariableChips
                    variables={dialogForm.variables}
                    onInsert={handleInsertVariable}
                  />
                </div>
                <div className="playbook-wysiwyg-shell playbook-wysiwyg-shell-edit">
                  <WysiwygEditor
                    key={editingDialogId ?? 'new-dialog'}
                    content={dialogForm.text}
                    onChange={(next) =>
                      setDialogForm((prev) => ({ ...prev, text: next }))
                    }
                    placeholder="Escreva o conteudo do dialogo. Use {chave} para inserir variaveis."
                    mode="full"
                  />
                </div>
              </div>
            </div>
            <div className="playbook-dialog-split-preview">
              <div className="playbook-field">
                <span>Preview</span>
                <div
                  className="playbook-dialog-live-preview playbook-content-html"
                  dangerouslySetInnerHTML={{ __html: previewHtml || '<p class="text-muted">Preview aparece aqui...</p>' }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          {editingDialogId ? (
            <Button type="button" variant="danger" onClick={onRemove}>
              Excluir
            </Button>
          ) : (
            <span />
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="button" variant="primary" onClick={onConfirm}>
              {editingDialogId ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
