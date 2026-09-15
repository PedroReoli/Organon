import { useEffect, useState, useRef } from 'react'
import type { AppGroup } from '@types'
import { isElectron } from '@utils'
import { Button, IconButton, Input } from '@shared/components/primitives'

interface AppAddModalProps {
  onClose: () => void
  onSave: (input: {
    name: string
    exePath: string
    iconPath?: string | null
    args?: string
    workingDir?: string
    envVars?: string
    groupId?: string | null
    autoLaunch?: boolean
  }) => void
  initialName?: string
  initialExePath?: string
  initialIconPath?: string | null
  initialArgs?: string
  initialWorkingDir?: string
  initialEnvVars?: string
  initialGroupId?: string | null
  initialAutoLaunch?: boolean
  /** Upgrade 17: lista de grupos disponiveis. */
  groups?: AppGroup[]
}

export const AppAddModal = ({
  onClose,
  onSave,
  initialName = '',
  initialExePath = '',
  initialIconPath = null,
  initialArgs = '',
  initialWorkingDir = '',
  initialEnvVars = '',
  initialGroupId = null,
  initialAutoLaunch = false,
  groups = [],
}: AppAddModalProps) => {
  const [name, setName] = useState(initialName)
  const [exePath, setExePath] = useState(initialExePath)
  const [iconPath, setIconPath] = useState<string | null>(initialIconPath)
  const [args, setArgs] = useState(initialArgs)
  const [workingDir, setWorkingDir] = useState(initialWorkingDir)
  const [envVars, setEnvVars] = useState(initialEnvVars)
  const [groupId, setGroupId] = useState<string | null>(initialGroupId)
  const [autoLaunch, setAutoLaunch] = useState(initialAutoLaunch)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    nameInputRef.current?.focus()
    if (!initialName && !initialExePath) {
      nameInputRef.current?.select()
    }
  }, [])

  const handlePickExe = async () => {
    if (!isElectron()) {
      const path = window.prompt('Caminho completo do .exe')
      if (path) {
        setExePath(path)
        if (!name.trim()) {
          const defaultName = path.split(/[/\\]/).pop()?.replace(/\.exe$/i, '') ?? 'App'
          setName(defaultName)
        }
      }
      return
    }

    try {
      const result = await window.electronAPI.selectExe()
      if (result) {
        setExePath(result.exePath)
        if (result.iconDataUrl) setIconPath(result.iconDataUrl)
        if (!name.trim()) {
          setName(result.name)
        }
        setError(null)
      }
    } catch (err) {
      setError('Erro ao selecionar executável')
    }
  }

  const handleSave = () => {
    if (!name.trim()) {
      setError('Nome é obrigatório')
      nameInputRef.current?.focus()
      return
    }
    if (!exePath.trim()) {
      setError('Caminho do executável é obrigatório')
      return
    }
    onSave({
      name: name.trim(),
      exePath: exePath.trim(),
      iconPath,
      args: args.trim() || undefined,
      workingDir: workingDir.trim() || undefined,
      envVars: envVars.trim() || undefined,
      groupId: groupId || null,
      autoLaunch,
    })
    onClose()
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        handleSave()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [name, exePath, iconPath])

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <header className="modal-header">
          <h2>{initialName ? 'Editar App' : 'Adicionar Executável'}</h2>
          <button className="modal-close-btn" onClick={onClose}>
            &times;
          </button>
        </header>
        <div className="modal-body">
          {error && (
            <div className="form-error" style={{ marginBottom: '12px' }}>
              {error}
            </div>
          )}
          
          <div className="form-group">
            <label className="form-label">Nome do App</label>
            <Input
              ref={nameInputRef}
              fullWidth
              type="text"
              value={name}
              onChange={e => {
                setName(e.target.value)
                setError(null)
              }}
              placeholder="Ex: Visual Studio Code"
              onKeyDown={e => e.key === 'Enter' && handleSave()}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Caminho do Executável</label>
            <div className="form-input-group">
              <Input
                fullWidth
                type="text"
                value={exePath}
                onChange={e => {
                  setExePath(e.target.value)
                  setError(null)
                }}
                placeholder="C:\\Program Files\\App\\app.exe"
                style={{ flex: 1 }}
              />
              <IconButton
                variant="default"
                onClick={handlePickExe}
                disabled={!isElectron()}
                aria-label="Selecionar arquivo .exe"
                title="Selecionar arquivo .exe"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <path d="M4 4h5l2 2h5a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
                </svg>
              </IconButton>
            </div>
            {iconPath && (
              <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <img src={iconPath} alt="" style={{ width: '24px', height: '24px' }} />
                <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Ícone detectado</span>
              </div>
            )}
          </div>

          {groups.length > 0 && (
            <div className="form-group">
              <label className="form-label">Grupo</label>
              <select
                className="form-input"
                value={groupId ?? ''}
                onChange={e => setGroupId(e.target.value || null)}
              >
                <option value="">Sem grupo</option>
                {groups.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="form-group">
            <button
              type="button"
              className="apps-advanced-toggle"
              onClick={() => setShowAdvanced(v => !v)}
            >
              {showAdvanced ? '▼' : '▶'} Opcoes avancadas
            </button>
          </div>

          {showAdvanced && (
            <>
              <div className="form-group">
                <label className="form-label">Argumentos de linha de comando</label>
                <Input
                  fullWidth
                  type="text"
                  value={args}
                  onChange={e => setArgs(e.target.value)}
                  placeholder="--profile=work --new-window"
                />
                <p className="form-hint">Passados como argv ao executavel.</p>
              </div>

              <div className="form-group">
                <label className="form-label">Diretorio de trabalho</label>
                <Input
                  fullWidth
                  type="text"
                  value={workingDir}
                  onChange={e => setWorkingDir(e.target.value)}
                  placeholder="C:\\Projetos\\MeuApp"
                />
                <p className="form-hint">CWD ao iniciar o processo. Vazio = pasta do executavel.</p>
              </div>

              <div className="form-group">
                <label className="form-label">Variaveis de ambiente</label>
                <textarea
                  className="form-input"
                  value={envVars}
                  onChange={e => setEnvVars(e.target.value)}
                  placeholder="NODE_ENV=production&#10;DEBUG=app:*"
                  rows={3}
                  style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 11 }}
                />
                <p className="form-hint">Uma por linha, formato KEY=VALUE.</p>
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={autoLaunch}
                    onChange={e => setAutoLaunch(e.target.checked)}
                  />
                  <span>Auto-launch ao abrir o Organon</span>
                </label>
              </div>
            </>
          )}
        </div>
        <footer className="modal-footer">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={!name.trim() || !exePath.trim()}
          >
            {initialName ? 'Salvar' : 'Adicionar'}
          </Button>
        </footer>
      </div>
    </div>
  )
}
