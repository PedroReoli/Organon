import { useEffect, useMemo, useState } from 'react'
import type { ColorPalette } from '../types'
import { isElectron } from '../utils'

interface ColorsViewProps {
  palettes: ColorPalette[]
  onAddPalette: (name: string, colors: string[]) => string
  onUpdatePalette: (paletteId: string, updates: Partial<Pick<ColorPalette, 'name' | 'colors'>>) => void
  onRemovePalette: (paletteId: string) => void
}

const HEX_TOKEN_REGEX = /#?[0-9a-fA-F]{3,8}\b/g

const normalizeHex = (value: string): string | null => {
  const raw = value.trim().replace(/^#/, '')
  if (!/^[0-9a-fA-F]+$/.test(raw)) return null
  if (raw.length !== 3 && raw.length !== 4 && raw.length !== 6 && raw.length !== 8) return null
  return `#${raw.toUpperCase()}`
}

const extractHexColors = (input: string): string[] => {
  const matches = input.match(HEX_TOKEN_REGEX) ?? []
  const colors: string[] = []
  const seen = new Set<string>()
  for (const token of matches) {
    const hex = normalizeHex(token)
    if (!hex || seen.has(hex)) continue
    seen.add(hex)
    colors.push(hex)
  }
  return colors
}

export const ColorsView = ({
  palettes,
  onAddPalette,
  onUpdatePalette,
  onRemovePalette,
}: ColorsViewProps) => {
  const [selectedPaletteId, setSelectedPaletteId] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showRemoveModal, setShowRemoveModal] = useState(false)
  const [newPaletteName, setNewPaletteName] = useState('')
  const [newPaletteInput, setNewPaletteInput] = useState('')
  const [editPaletteName, setEditPaletteName] = useState('')
  const [editPaletteInput, setEditPaletteInput] = useState('')
  const [copyFeedback, setCopyFeedback] = useState('')

  const sortedPalettes = useMemo(
    () => [...palettes].sort((a, b) => b.order - a.order),
    [palettes],
  )

  const selectedPalette = useMemo(
    () => sortedPalettes.find(p => p.id === selectedPaletteId) ?? null,
    [sortedPalettes, selectedPaletteId],
  )

  const parsedNewPaletteColors = useMemo(
    () => extractHexColors(newPaletteInput),
    [newPaletteInput],
  )

  const parsedEditPaletteColors = useMemo(
    () => extractHexColors(editPaletteInput),
    [editPaletteInput],
  )

  useEffect(() => {
    if (sortedPalettes.length === 0) {
      setSelectedPaletteId(null)
      return
    }
    if (!selectedPaletteId || !sortedPalettes.some(p => p.id === selectedPaletteId)) {
      setSelectedPaletteId(sortedPalettes[0].id)
    }
  }, [sortedPalettes, selectedPaletteId])

  const handleCreatePalette = () => {
    const name = newPaletteName.trim()
    if (!name) return
    if (parsedNewPaletteColors.length === 0) return
    const createdId = onAddPalette(name, parsedNewPaletteColors)
    setNewPaletteName('')
    setNewPaletteInput('')
    setSelectedPaletteId(createdId)
    setShowCreateModal(false)
  }

  const handleOpenEditModal = () => {
    if (!selectedPalette) return
    setEditPaletteName(selectedPalette.name)
    setEditPaletteInput(selectedPalette.colors.join(', '))
    setShowEditModal(true)
  }

  const handleSaveEditPalette = () => {
    if (!selectedPalette) return
    const nextName = editPaletteName.trim()
    if (!nextName) return
    if (parsedEditPaletteColors.length === 0) return
    onUpdatePalette(selectedPalette.id, {
      name: nextName,
      colors: parsedEditPaletteColors,
    })
    setShowEditModal(false)
  }

  const handleRemoveSelected = () => {
    if (!selectedPalette) return
    onRemovePalette(selectedPalette.id)
    setShowRemoveModal(false)
  }

  const copyText = async (value: string) => {
    try {
      if (isElectron()) {
        await window.electronAPI.copyToClipboard(value)
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value)
      } else {
        return
      }
      setCopyFeedback('Copiado')
      window.setTimeout(() => setCopyFeedback(''), 1200)
    } catch {
      setCopyFeedback('Falha ao copiar')
      window.setTimeout(() => setCopyFeedback(''), 1400)
    }
  }

  const handleCopyPalette = async () => {
    if (!selectedPalette) return
    await copyText(selectedPalette.colors.join(', '))
  }

  const handleCopySingleColor = async (hex: string) => {
    await copyText(hex)
  }

  return (
    <div className="colors-manager-layout">
      <aside className="colors-sidebar">
        <div className="colors-sidebar-header">
          <h3>Paletas</h3>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            Nova Paleta
          </button>
        </div>

        <div className="colors-sidebar-list">
          {sortedPalettes.length === 0 ? (
            <div className="colors-empty">Nenhuma paleta registrada.</div>
          ) : (
            sortedPalettes.map(palette => (
              <button
                key={palette.id}
                className={`colors-sidebar-item ${selectedPaletteId === palette.id ? 'is-active' : ''}`}
                onClick={() => setSelectedPaletteId(palette.id)}
              >
                <span className="colors-sidebar-item-name">{palette.name}</span>
                <span className="colors-sidebar-item-count">{palette.colors.length} cores</span>
              </button>
            ))
          )}
        </div>
      </aside>

      <section className="colors-workspace">
        {selectedPalette ? (
          <>
            <div className="colors-workspace-toolbar">
              <div className="colors-workspace-title-wrap">
                <h2 className="colors-workspace-title">{selectedPalette.name}</h2>
                {copyFeedback ? <span className="colors-copy-feedback">{copyFeedback}</span> : null}
              </div>
              <div className="colors-workspace-actions">
                <button className="btn btn-secondary" onClick={handleOpenEditModal}>
                  Atualizar
                </button>
                <button className="btn btn-secondary" onClick={handleCopyPalette}>
                  Copiar paleta
                </button>
                <button className="btn btn-secondary" onClick={() => setShowRemoveModal(true)}>
                  Remover
                </button>
              </div>
            </div>

            <div className="colors-palette-canvas">
              {selectedPalette.colors.length === 0 ? (
                <div className="colors-empty">Informe codigos HEX validos para visualizar.</div>
              ) : (
                <div className="colors-palette-columns">
                  {selectedPalette.colors.map(color => (
                    <div
                      key={color}
                      className="colors-column"
                      style={{ backgroundColor: color }}
                      title={`Clique para copiar ${color}`}
                      onClick={() => void handleCopySingleColor(color)}
                    >
                      <div className="colors-column-content">
                        <span className="colors-column-hex">{color}</span>
                        <span className="colors-column-copy-indicator" aria-hidden="true">
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <rect x="5" y="5" width="8" height="8" rx="1.5" />
                            <path d="M3 10V4.5A1.5 1.5 0 0 1 4.5 3H10" />
                          </svg>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="colors-empty">Crie uma paleta para comecar.</div>
        )}
      </section>

      {showCreateModal && (
        <div className="modal-backdrop" onClick={() => setShowCreateModal(false)}>
          <div className="modal colors-create-modal" onClick={e => e.stopPropagation()}>
            <header className="modal-header">
              <h2>Nova Paleta</h2>
              <button className="modal-close-btn" onClick={() => setShowCreateModal(false)} title="Fechar">
                &times;
              </button>
            </header>
            <div className="modal-body">
              <div className="form-group">
                <label>Nome da paleta</label>
                <input
                  className="form-input"
                  type="text"
                  value={newPaletteName}
                  onChange={e => setNewPaletteName(e.target.value)}
                  placeholder="Ex: Brand Primaria"
                />
              </div>
              <div className="form-group">
                <label>Cores (HEX)</label>
                <textarea
                  className="colors-create-input"
                  value={newPaletteInput}
                  onChange={e => setNewPaletteInput(e.target.value)}
                  placeholder="#A5BEFA, #B3093F, #451531, #64B7CC, #FF3877"
                />
                <small className="colors-create-help">{parsedNewPaletteColors.length} cor(es) valida(s)</small>
              </div>
            </div>
            <footer className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                onClick={handleCreatePalette}
                disabled={!newPaletteName.trim() || parsedNewPaletteColors.length === 0}
              >
                Salvar paleta
              </button>
            </footer>
          </div>
        </div>
      )}

      {showEditModal && selectedPalette && (
        <div className="modal-backdrop" onClick={() => setShowEditModal(false)}>
          <div className="modal colors-create-modal" onClick={e => e.stopPropagation()}>
            <header className="modal-header">
              <h2>Atualizar Paleta</h2>
              <button className="modal-close-btn" onClick={() => setShowEditModal(false)} title="Fechar">
                &times;
              </button>
            </header>
            <div className="modal-body">
              <div className="form-group">
                <label>Nome da paleta</label>
                <input
                  className="form-input"
                  type="text"
                  value={editPaletteName}
                  onChange={e => setEditPaletteName(e.target.value)}
                  placeholder="Ex: Brand Primaria"
                />
              </div>
              <div className="form-group">
                <label>Cores (HEX)</label>
                <textarea
                  className="colors-edit-input"
                  value={editPaletteInput}
                  onChange={e => setEditPaletteInput(e.target.value)}
                  placeholder="#A5BEFA, #B3093F, #451531, #64B7CC, #FF3877"
                />
                <small className="colors-create-help">{parsedEditPaletteColors.length} cor(es) valida(s)</small>
              </div>
            </div>
            <footer className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowEditModal(false)}>
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSaveEditPalette}
                disabled={!editPaletteName.trim() || parsedEditPaletteColors.length === 0}
              >
                Salvar alteracoes
              </button>
            </footer>
          </div>
        </div>
      )}

      {showRemoveModal && selectedPalette && (
        <div className="modal-backdrop" onClick={() => setShowRemoveModal(false)}>
          <div className="modal colors-create-modal" onClick={e => e.stopPropagation()}>
            <header className="modal-header">
              <h2>Confirmar remocao</h2>
              <button className="modal-close-btn" onClick={() => setShowRemoveModal(false)} title="Fechar">
                &times;
              </button>
            </header>
            <div className="modal-body">
              <p>Deseja remover a paleta <strong>{selectedPalette.name}</strong>?</p>
            </div>
            <footer className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowRemoveModal(false)}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={handleRemoveSelected}>
                Remover
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  )
}
