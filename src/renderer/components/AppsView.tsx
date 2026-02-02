import { useState } from 'react'
import type { AppItem, AppMacro } from '../types'
import { isElectron } from '../utils'
import { AppAddModal } from './AppAddModal'

interface AppsViewProps {
  apps: AppItem[]
  macros: AppMacro[]
  onAddApp: (input: { name: string; exePath: string; iconPath?: string | null }) => string
  onUpdateApp?: (appId: string, updates: Partial<Pick<AppItem, 'name' | 'exePath' | 'iconPath'>>) => void
  onRemoveApp: (appId: string) => void
  onAddMacro: (input: { name: string; appIds: string[]; mode: 'sequential' | 'simultaneous' }) => string
  onUpdateMacro: (macroId: string, updates: Partial<Pick<AppMacro, 'name' | 'appIds' | 'mode'>>) => void
  onRemoveMacro: (macroId: string) => void
}

export const AppsView = ({
  apps,
  macros,
  onAddApp,
  onUpdateApp,
  onRemoveApp,
  onAddMacro,
  onUpdateMacro,
  onRemoveMacro,
}: AppsViewProps) => {
  const [selectedApps, setSelectedApps] = useState<string[]>([])
  const [showMacroModal, setShowMacroModal] = useState(false)
  const [showAppModal, setShowAppModal] = useState(false)
  const [editingApp, setEditingApp] = useState<AppItem | null>(null)
  const [newMacroName, setNewMacroName] = useState('')
  const [macroMode, setMacroMode] = useState<'sequential' | 'simultaneous'>('simultaneous')

  const toggleAppSelection = (appId: string) => {
    setSelectedApps(prev =>
      prev.includes(appId)
        ? prev.filter(id => id !== appId)
        : [...prev, appId]
    )
  }

  const handleAddExecutable = () => {
    setEditingApp(null)
    setShowAppModal(true)
  }

  const handleEditApp = (app: AppItem) => {
    setEditingApp(app)
    setShowAppModal(true)
  }

  const handleSaveApp = (input: { name: string; exePath: string; iconPath?: string | null }) => {
    if (editingApp && onUpdateApp) {
      onUpdateApp(editingApp.id, input)
    } else {
      onAddApp(input)
    }
    setShowAppModal(false)
    setEditingApp(null)
  }

  const handleLaunchSelected = () => {
    if (!isElectron()) {
      console.log('Launching apps:', selectedApps)
      return
    }

    const exePaths = apps
      .filter(app => selectedApps.includes(app.id))
      .map(app => app.exePath)
      .filter(Boolean)
    window.electronAPI.launchMany(exePaths, 'simultaneous').catch(() => {})
  }

  const handleAddMacro = () => {
    if (!newMacroName.trim() || selectedApps.length === 0) return
    onAddMacro({
      name: newMacroName.trim(),
      appIds: selectedApps,
      mode: macroMode,
    })
    setNewMacroName('')
    setSelectedApps([])
    setShowMacroModal(false)
  }

  const handleRunMacro = (macro: AppMacro) => {
    if (!isElectron()) {
      console.log('Running macro:', macro)
      return
    }

    const exePaths = macro.appIds
      .map(id => apps.find(a => a.id === id)?.exePath)
      .filter((p): p is string => !!p)
    window.electronAPI.launchMany(exePaths, macro.mode).catch(() => {})
  }

  return (
    <div className="apps-layout">
      <header className="apps-header">
        <div>
          <h2>Apps</h2>
          <p>Gerencie executáveis, crie macros e organize seus aplicativos. {apps.length > 0 && <span>{apps.length} app(s) cadastrado(s)</span>}</p>
        </div>
        <div className="apps-header-actions">
          {selectedApps.length > 0 && (
            <>
              <span className="apps-selection-label">{selectedApps.length} selecionado(s)</span>
              <button className="btn btn-secondary" onClick={handleLaunchSelected}>
                Abrir Selecionados
              </button>
              <button className="btn btn-secondary" onClick={() => setShowMacroModal(true)}>
                Criar Macro
              </button>
            </>
          )}
          <button className="btn btn-primary" onClick={handleAddExecutable}>
            + Adicionar App
          </button>
        </div>
      </header>

      <div className="apps-content">
        <section className="apps-section apps-section-main">
          <div className="apps-section-header">
            <div className="apps-section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <rect x="2" y="2" width="20" height="20" rx="2" />
                <path d="M8 8h8M8 12h8M8 16h4" />
              </svg>
              <h3>Executáveis</h3>
              {apps.length > 0 && <span className="apps-section-count">{apps.length}</span>}
            </div>
            <div className="apps-section-actions">
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setSelectedApps(apps.map(a => a.id))}
                title="Selecionar todos"
              >
                Selecionar Todos
              </button>
              {selectedApps.length > 0 && (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setSelectedApps([])}
                  title="Limpar seleção"
                >
                  Limpar
                </button>
              )}
            </div>
          </div>

          {apps.length === 0 ? (
            <div className="apps-empty">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="40" height="40">
                <rect x="2" y="2" width="20" height="20" rx="2" />
                <path d="M8 8h8M8 12h8M8 16h4" />
              </svg>
              <p>Nenhum executavel cadastrado.</p>
              <p>Adicione arquivos .exe para gerencia-los aqui.</p>
            </div>
          ) : (
            <div className="apps-grid">
              {apps.map(app => (
                <div
                  key={app.id}
                  className={`apps-card ${selectedApps.includes(app.id) ? 'selected' : ''}`}
                  onClick={() => toggleAppSelection(app.id)}
                >
                  <div className="apps-card-check">
                    {selectedApps.includes(app.id) && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="12" height="12">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                  <div className="apps-card-icon">
                    {app.iconPath ? (
                      <img src={app.iconPath} alt="" />
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                        <rect x="2" y="2" width="20" height="20" rx="2" />
                        <path d="M8 8h8M8 12h8M8 16h4" />
                      </svg>
                    )}
                  </div>
                  <div className="apps-card-name">{app.name}</div>
                  <div className="apps-card-actions">
                    <button
                      className="apps-card-btn apps-card-btn-play"
                      onClick={e => {
                        e.stopPropagation()
                        if (!isElectron()) return
                        window.electronAPI.launchExe(app.exePath).catch(() => {})
                      }}
                      title="Abrir"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                    </button>
                    <button
                      className="apps-card-btn apps-card-btn-edit"
                      onClick={e => { e.stopPropagation(); handleEditApp(app) }}
                      title="Editar"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button
                      className="apps-card-btn apps-card-btn-delete"
                      onClick={e => { e.stopPropagation(); onRemoveApp(app.id) }}
                      title="Excluir"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="apps-section apps-section-macros">
          <div className="apps-section-header">
            <div className="apps-section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              <h3>Macros</h3>
              {macros.length > 0 && <span className="apps-macro-count">{macros.length}</span>}
            </div>
          </div>

          {macros.length === 0 ? (
            <div className="apps-empty apps-empty-small">
              <p>Nenhuma macro. Selecione apps e crie uma.</p>
            </div>
          ) : (
            <div className="apps-macros-list">
              {macros.map(macro => (
                <div key={macro.id} className="apps-macro-item">
                  <div className="apps-macro-info">
                    <span className="apps-macro-name">{macro.name}</span>
                    <span className="apps-macro-meta">
                      {macro.appIds.length} app(s) · {macro.mode === 'simultaneous' ? 'Simultaneo' : 'Sequencial'}
                    </span>
                  </div>
                  <div className="apps-macro-actions">
                    <button className="apps-card-btn apps-card-btn-play" onClick={() => handleRunMacro(macro)} title="Executar">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                    </button>
                    <button className="apps-card-btn apps-card-btn-delete" onClick={() => onRemoveMacro(macro.id)} title="Excluir">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {showMacroModal && (
        <div className="modal-backdrop" onClick={() => setShowMacroModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <header className="modal-header">
              <h2>Nova Macro</h2>
              <button className="modal-close-btn" onClick={() => setShowMacroModal(false)}>
                &times;
              </button>
            </header>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Nome da Macro</label>
                <input
                  type="text"
                  value={newMacroName}
                  onChange={e => setNewMacroName(e.target.value)}
                  className="form-input"
                  placeholder="Ex: Abrir ferramentas de trabalho"
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="form-label">Modo de Execucao</label>
                <div className="form-radio-group">
                  <label className="form-radio">
                    <input
                      type="radio"
                      checked={macroMode === 'simultaneous'}
                      onChange={() => setMacroMode('simultaneous')}
                    />
                    Simultaneo (todos de uma vez)
                  </label>
                  <label className="form-radio">
                    <input
                      type="radio"
                      checked={macroMode === 'sequential'}
                      onChange={() => setMacroMode('sequential')}
                    />
                    Sequencial (um apos o outro)
                  </label>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Apps selecionados ({selectedApps.length})</label>
                <div className="macro-apps-list">
                  {selectedApps.map(appId => {
                    const app = apps.find(a => a.id === appId)
                    return app ? <span key={appId} className="macro-app-tag">{app.name}</span> : null
                  })}
                </div>
              </div>
            </div>
            <footer className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowMacroModal(false)}>
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                onClick={handleAddMacro}
                disabled={!newMacroName.trim() || selectedApps.length === 0}
              >
                Criar Macro
              </button>
            </footer>
          </div>
        </div>
      )}

      {showAppModal && (
        <AppAddModal
          onClose={() => {
            setShowAppModal(false)
            setEditingApp(null)
          }}
          onSave={handleSaveApp}
          initialName={editingApp?.name ?? ''}
          initialExePath={editingApp?.exePath ?? ''}
          initialIconPath={editingApp?.iconPath ?? null}
        />
      )}
    </div>
  )
}
