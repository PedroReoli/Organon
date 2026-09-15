
import type { PlaybookForm } from '@types'
import { Button, Input } from '@shared/components/primitives'

interface PlaybookFormModalProps {
  isEditing:   boolean
  form:        PlaybookForm
  setForm:     (updater: (prev: PlaybookForm) => PlaybookForm) => void
  onCancel:    () => void
  onConfirm:   () => void
}

export const PlaybookFormModal = ({ isEditing, form, setForm, onCancel, onConfirm }: PlaybookFormModalProps) => (
  <div className="modal-backdrop" onClick={onCancel}>
    <div className="modal playbook-create-modal" onClick={e => e.stopPropagation()}>
      <div className="modal-header">
        <h2>{isEditing ? 'Editar playbook' : 'Novo playbook'}</h2>
        <button type="button" className="modal-close-btn" onClick={onCancel}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="modal-body playbook-create-modal-body">
        <div className="playbook-editor-inline-grid">
          <label className="playbook-field">
            <span>Titulo</span>
            <Input fullWidth type="text" value={form.title} onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))} placeholder="Ex: Qualificacao de lead" />
          </label>
          <label className="playbook-field">
            <span>Setor</span>
            <Input fullWidth type="text" value={form.sector} onChange={e => setForm(prev => ({ ...prev, sector: e.target.value }))} placeholder="Ex: Comercial" />
          </label>
          <label className="playbook-field">
            <span>Categoria</span>
            <Input fullWidth type="text" value={form.category} onChange={e => setForm(prev => ({ ...prev, category: e.target.value }))} placeholder="Ex: Atendimento" />
          </label>
          <label className="playbook-field">
            <span>Resumo</span>
            <Input fullWidth type="text" value={form.summary} onChange={e => setForm(prev => ({ ...prev, summary: e.target.value }))} placeholder="Resumo rapido" />
          </label>
        </div>
      </div>

      <div className="modal-footer playbook-create-modal-footer">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="button" variant="primary" onClick={onConfirm} disabled={!form.title.trim()}>
          {isEditing ? 'Salvar alteracoes' : 'Criar playbook'}
        </Button>
      </div>
    </div>
  </div>
)
