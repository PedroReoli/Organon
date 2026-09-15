
import type { RegisteredIDE } from '@types'
import { isElectron } from '@utils'
import { Button, IconButton, Input } from '@shared/components/primitives'

interface IdesSectionProps {
  activeSection:    string
  registeredIDEs:   RegisteredIDE[]
  onRemoveRegisteredIDE: (ideId: string) => void
  showIdeForm:      boolean
  setShowIdeForm:   (v: boolean) => void
  ideFormName:      string
  setIdeFormName:   (v: string) => void
  ideFormExePath:   string
  setIdeFormExePath:(v: string) => void
  ideFormArgs:      string
  setIdeFormArgs:   (v: string) => void
  ideFormIcon:      string | null
  editingIdeId:     string | null
  resetIdeForm:     () => void
  handlePickIdeExe: () => void
  handleSaveIde:    () => void
  handleEditIde:    (ide: RegisteredIDE) => void
}

export const IdesSection = ({
  activeSection, registeredIDEs, onRemoveRegisteredIDE,
  showIdeForm, setShowIdeForm, ideFormName, setIdeFormName,
  ideFormExePath, setIdeFormExePath, ideFormArgs, setIdeFormArgs,
  ideFormIcon, editingIdeId, resetIdeForm, handlePickIdeExe, handleSaveIde, handleEditIde,
}: IdesSectionProps) => (
  <section className={`settings-section ${activeSection !== 'ides' ? 'settings-section-hidden' : ''}`}>
    <div className="settings-section-header">
      <h3>IDEs Registradas</h3>
      <Button variant="primary" className="settings-ide-add-btn" onClick={() => { resetIdeForm(); setShowIdeForm(true) }}>
        + Adicionar IDE
      </Button>
    </div>

    {showIdeForm && (
      <div className="settings-ide-form">
        <h4>{editingIdeId ? 'Editar IDE' : 'Nova IDE'}</h4>
        <div className="settings-ide-form-fields">
          <div className="settings-ide-form-row">
            {ideFormIcon && <img src={ideFormIcon} alt="" className="settings-ide-form-icon" />}
            <Input
              fullWidth
              type="text"
              value={ideFormName}
              onChange={e => setIdeFormName(e.target.value)}
              placeholder="Nome (ex: VS Code)"
              autoFocus
            />
          </div>
          <div className="settings-ide-form-row">
            <Input
              fullWidth
              type="text"
              value={ideFormExePath}
              onChange={e => setIdeFormExePath(e.target.value)}
              placeholder="Caminho do executavel"
            />
            <IconButton
              variant="default"
              onClick={handlePickIdeExe}
              disabled={!isElectron()}
              aria-label="Selecionar executavel"
              title="Selecionar executavel"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <path d="M4 4h5l2 2h5a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
              </svg>
            </IconButton>
          </div>
          <div className="settings-ide-form-row">
            <Input
              fullWidth
              type="text"
              value={ideFormArgs}
              onChange={e => setIdeFormArgs(e.target.value)}
              placeholder='Argumentos (ex: "{folder}")'
            />
          </div>
          <div className="settings-ide-form-hint">
            Use <code>{'{folder}'}</code> como placeholder para o caminho do projeto.
          </div>
          <div className="settings-ide-form-actions">
            <Button variant="primary" onClick={handleSaveIde} disabled={!ideFormName.trim() || !ideFormExePath.trim()}>
              {editingIdeId ? 'Atualizar' : 'Salvar'}
            </Button>
            <Button variant="secondary" onClick={resetIdeForm}>Cancelar</Button>
          </div>
        </div>
      </div>
    )}

    <div className="settings-ide-list">
      {registeredIDEs.length === 0 && !showIdeForm && (
        <div className="settings-ide-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="24" height="24" style={{ opacity: 0.3 }}>
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
          </svg>
          <p>Nenhuma IDE registrada. Adicione uma IDE para abrir projetos diretamente.</p>
        </div>
      )}
      {registeredIDEs.map(ide => (
        <div key={ide.id} className="settings-ide-item">
          {ide.iconDataUrl ? (
            <img src={ide.iconDataUrl} alt="" className="settings-ide-item-icon" />
          ) : (
            <div className="settings-ide-item-icon-placeholder">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
            </div>
          )}
          <div className="settings-ide-item-info">
            <span className="settings-ide-item-name">{ide.name}</span>
            <span className="settings-ide-item-path">{ide.exePath}</span>
            <span className="settings-ide-item-args">Args: {ide.args}</span>
          </div>
          <div className="settings-ide-item-actions">
            <IconButton
              variant="default"
              size="sm"
              onClick={() => handleEditIde(ide)}
              aria-label="Editar IDE"
              title="Editar IDE"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </IconButton>
            <IconButton
              variant="danger"
              size="sm"
              onClick={() => onRemoveRegisteredIDE(ide.id)}
              aria-label="Remover IDE"
              title="Remover IDE"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </IconButton>
          </div>
        </div>
      ))}
    </div>
  </section>
)
