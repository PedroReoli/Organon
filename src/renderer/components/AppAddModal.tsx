import { useEffect, useState, useRef } from 'react'
import { isElectron } from '../utils'

interface AppAddModalProps {
  onClose: () => void
  onSave: (input: { name: string; exePath: string; iconPath?: string | null }) => void
  initialName?: string
  initialExePath?: string
  initialIconPath?: string | null
}

export const AppAddModal = ({
  onClose,
  onSave,
  initialName = '',
  initialExePath = '',
  initialIconPath = null,
}: AppAddModalProps) => {
  const [name, setName] = useState(initialName)
  const [exePath, setExePath] = useState(initialExePath)
  const [iconPath, setIconPath] = useState<string | null>(initialIconPath)
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
    onSave({ name: name.trim(), exePath: exePath.trim(), iconPath })
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
            <input
              ref={nameInputRef}
              type="text"
              value={name}
              onChange={e => {
                setName(e.target.value)
                setError(null)
              }}
              className="form-input"
              placeholder="Ex: Visual Studio Code"
              onKeyDown={e => e.key === 'Enter' && handleSave()}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Caminho do Executável</label>
            <div className="form-input-group">
              <input
                type="text"
                value={exePath}
                onChange={e => {
                  setExePath(e.target.value)
                  setError(null)
                }}
                className="form-input"
                placeholder="C:\\Program Files\\App\\app.exe"
                style={{ flex: 1 }}
              />
              <button
                className="btn btn-secondary"
                onClick={handlePickExe}
                disabled={!isElectron()}
                title="Selecionar arquivo .exe"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <path d="M4 4h5l2 2h5a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
                </svg>
              </button>
            </div>
            {iconPath && (
              <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <img src={iconPath} alt="" style={{ width: '24px', height: '24px' }} />
                <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Ícone detectado</span>
              </div>
            )}
          </div>
        </div>
        <footer className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={!name.trim() || !exePath.trim()}
          >
            {initialName ? 'Salvar' : 'Adicionar'}
          </button>
        </footer>
      </div>
    </div>
  )
}
