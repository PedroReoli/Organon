import { useEffect, useMemo, useState } from 'react'
import type { ColorPalette } from '@types'
import { copyToClipboard } from '@shared/utils/clipboard'
import { Button, Input, Textarea, Dialog } from '@shared/components/primitives'
import { ColorExtractorModal } from './colors/ColorExtractorModal'

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

// ── Color Theory Helpers ───────────────────────────────────────────────────

function hexToHsl(hex: string): [number, number, number] {
  let r = 0, g = 0, b = 0
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16) * 17
    g = parseInt(hex[2] + hex[2], 16) * 17
    b = parseInt(hex[3] + hex[3], 16) * 17
  } else if (hex.length === 7) {
    r = parseInt(hex.substring(1, 3), 16)
    g = parseInt(hex.substring(3, 5), 16)
    b = parseInt(hex.substring(5, 7), 16)
  }
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0, l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break
      case g: h = (b - r) / d + 2; break
      case b: h = (r - g) / d + 4; break
    }
    h /= 6
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)]
}

function hslToHex(h: number, s: number, l: number): string {
  l /= 100
  const a = s * Math.min(l, 1 - l) / 100
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase()
}

function generateHarmonies(hex: string) {
  const [h, s, l] = hexToHsl(hex)
  return {
    monocromatico: [
      hslToHex(h, s, Math.max(0, l - 30)),
      hslToHex(h, s, Math.max(0, l - 15)),
      hex,
      hslToHex(h, s, Math.min(100, l + 15)),
      hslToHex(h, s, Math.min(100, l + 30)),
    ],
    complementar: [
      hex,
      hslToHex((h + 180) % 360, s, l),
      hslToHex((h + 180) % 360, Math.max(0, s - 20), Math.max(0, l - 15)),
    ],
    analogo: [
      hslToHex((h - 30 + 360) % 360, s, l),
      hex,
      hslToHex((h + 30) % 360, s, l)
    ],
    triadico: [
      hex,
      hslToHex((h + 120) % 360, s, l),
      hslToHex((h + 240) % 360, s, l)
    ]
  }
}

function interpolateHex(hex1: string, hex2: string, factor: number): string {
  const r1 = parseInt(hex1.substring(1, 3), 16)
  const g1 = parseInt(hex1.substring(3, 5), 16)
  const b1 = parseInt(hex1.substring(5, 7), 16)
  const r2 = parseInt(hex2.substring(1, 3), 16)
  const g2 = parseInt(hex2.substring(3, 5), 16)
  const b2 = parseInt(hex2.substring(5, 7), 16)
  const r = Math.round(r1 + (r2 - r1) * factor)
  const g = Math.round(g1 + (g2 - g1) * factor)
  const b = Math.round(b1 + (b2 - b1) * factor)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase()
}

export const ColorsView = ({
  palettes,
  onAddPalette,
  onUpdatePalette,
  onRemovePalette,
}: ColorsViewProps) => {
  const [selectedPaletteId, setSelectedPaletteId] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showExtractorModal, setShowExtractorModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showRemoveModal, setShowRemoveModal] = useState(false)
  const [newPaletteName, setNewPaletteName] = useState('')
  const [newPaletteInput, setNewPaletteInput] = useState('')
  const [editPaletteName, setEditPaletteName] = useState('')
  const [editPaletteInput, setEditPaletteInput] = useState('')
  const [copyFeedback, setCopyFeedback] = useState('')
  const [copiedColor, setCopiedColor] = useState<string | null>(null)
  const [selectedHexes, setSelectedHexes] = useState<string[]>([])

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
    setSelectedHexes([])
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
    const result = await copyToClipboard(value)
    setCopyFeedback(result.ok ? 'Copiado' : 'Falha ao copiar')
    window.setTimeout(() => setCopyFeedback(''), result.ok ? 1200 : 1400)
  }

  const handleCopyPalette = async () => {
    if (!selectedPalette) return
    await copyText(selectedPalette.colors.join(', '))
  }

  const handleCopySingleColor = async (hex: string) => {
    await copyText(hex)
    setCopiedColor(hex)
    window.setTimeout(() => {
      setCopiedColor(prev => prev === hex ? null : prev)
    }, 1200)
  }

  const handleColorClick = (e: React.MouseEvent, hex: string) => {
    if (e.ctrlKey || e.metaKey || e.shiftKey) {
      e.preventDefault()
      setSelectedHexes(prev => prev.includes(hex) ? prev.filter(c => c !== hex) : [...prev, hex])
    } else {
      void handleCopySingleColor(hex)
    }
  }

  const harmonyData = useMemo(() => {
    if (selectedHexes.length === 1) return generateHarmonies(selectedHexes[0])
    return null
  }, [selectedHexes])

  const blendedData = useMemo(() => {
    if (selectedHexes.length >= 2) {
      const h1 = selectedHexes[0]
      const h2 = selectedHexes[selectedHexes.length - 1]
      return [h1, interpolateHex(h1, h2, 0.25), interpolateHex(h1, h2, 0.5), interpolateHex(h1, h2, 0.75), h2]
    }
    return null
  }, [selectedHexes])

  return (
    <div className="projects-shell projects-theme" style={{ height: '100%', display: 'flex' }}>
      <style>{`
        @keyframes popIn {
          0% { transform: scale(0.5); opacity: 0; }
          70% { transform: scale(1.2); }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-pop { animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
      `}</style>
      <aside className="projects-sidebar">
        <div className="projects-sidebar-header">
          <h2>Paletas de Cores</h2>
        </div>

        <div className="projects-sidebar-scroll">
          {sortedPalettes.length === 0 ? (
            <div style={{ padding: '16px', color: 'var(--text-muted)', textAlign: 'center', fontSize: '13px' }}>Nenhuma paleta registrada.</div>
          ) : (
            sortedPalettes.map(palette => (
              <button
                key={palette.id}
                className={`projects-sidebar-item ${selectedPaletteId === palette.id ? 'is-active' : ''}`}
                onClick={() => setSelectedPaletteId(palette.id)}
              >
                <span style={{ flex: 1, textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{palette.name}</span>
                <span style={{ fontSize: '11px', background: 'var(--bg-primary)', padding: '2px 6px', borderRadius: '8px' }}>{palette.colors.length}</span>
              </button>
            ))
          )}
        </div>

        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button className="projects-btn" style={{ width: '100%', justifyContent: 'center', background: 'var(--bg-primary)' }} onClick={() => setShowExtractorModal(true)} title="Extrair cores de imagem">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" style={{ marginRight: '8px' }}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            Extrair de Imagem
          </button>
          <button className="projects-btn" style={{ width: '100%', justifyContent: 'center', background: 'var(--accent-primary)', color: '#fff', border: 'none' }} onClick={() => setShowCreateModal(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" style={{ marginRight: '8px' }}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Nova Paleta
          </button>
        </div>
      </aside>

      <div className="projects-content-wrapper">
        {selectedPalette ? (
          <div className="projects-content-scroll" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="projects-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <h1 className="projects-title">{selectedPalette.name}</h1>
                {copyFeedback && <span style={{ fontSize: '12px', color: '#10b981', background: '#10b98115', padding: '4px 8px', borderRadius: '4px' }}>{copyFeedback}</span>}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="projects-btn" onClick={handleCopyPalette} title="Copiar Paleta">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" style={{ marginRight: '6px' }}><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                  Copiar
                </button>
                <button className="projects-btn" onClick={handleOpenEditModal} title="Atualizar Paleta">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                </button>
                <button className="projects-btn" style={{ color: '#ef4444' }} onClick={() => setShowRemoveModal(true)} title="Excluir Paleta">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-2 14H7L5 6" /><path d="M10 11v6M14 11v6" /></svg>
                </button>
              </div>
            </div>

            <div>
              {selectedPalette.colors.length === 0 ? (
                <div style={{ padding: '64px', textAlign: 'center', color: 'var(--text-muted)' }}>Informe codigos HEX validos para visualizar.</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '16px' }}>
                  {selectedPalette.colors.map(color => {
                    const isCopied = copiedColor === color
                    const isSelected = selectedHexes.includes(color)
                    return (
                      <div
                        key={color}
                        className="projects-task-card"
                        style={{ padding: '0', overflow: 'hidden', cursor: 'pointer', border: isCopied ? '2px solid #10b981' : isSelected ? '2px solid var(--accent-primary)' : '1px solid var(--border)', transition: 'all 0.2s', display: 'flex', flexDirection: 'column' }}
                        title={`Clique para copiar ${color}\nCtrl+Clique para selecionar`}
                        onClick={(e) => handleColorClick(e, color)}
                      >
                        <div style={{ backgroundColor: color, height: '100px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {isSelected && <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" width="24" height="24" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}><polyline points="20 6 9 17 4 12" /></svg>}
                        </div>
                        <div style={{ padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-primary)' }}>
                          <span style={{ fontWeight: 600, fontSize: '14px', color: isCopied ? '#10b981' : isSelected ? 'var(--accent-primary)' : 'var(--text-primary)' }}>{color}</span>
                          {isCopied ? (
                            <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3" width="16" height="16" className="animate-pop">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          ) : (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" style={{ color: 'var(--text-muted)' }}>
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* SECAO DE HARMONIAS */}
            {(selectedHexes.length > 0) && (
              <div style={{ marginTop: '24px', borderTop: '1px solid var(--border)', paddingTop: '24px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/></svg>
                  Estúdio de Combinações
                  <span style={{ fontSize: '12px', fontWeight: 'normal', color: 'var(--text-muted)', marginLeft: '8px' }}>Clique nas cores para copiar</span>
                </h2>
                
                {selectedHexes.length === 1 && harmonyData && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
                    {[
                      { label: 'Monocromático', colors: harmonyData.monocromatico },
                      { label: 'Complementar', colors: harmonyData.complementar },
                      { label: 'Análogo', colors: harmonyData.analogo },
                      { label: 'Triádico', colors: harmonyData.triadico },
                    ].map(harm => (
                      <div key={harm.label}>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 500 }}>{harm.label}</div>
                        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }}>
                          {harm.colors.map((c, i) => (
                            <div key={i} onClick={() => void handleCopySingleColor(c)} style={{ cursor: 'pointer', flexShrink: 0, width: '60px', display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                              <div style={{ width: '100%', height: '40px', backgroundColor: c, borderRadius: '6px', border: '1px solid var(--border)' }} />
                              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{c}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {selectedHexes.length >= 2 && blendedData && (
                  <div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 500 }}>Mistura (Interpolação)</div>
                    <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px' }}>
                      {blendedData.map((c, i) => (
                        <div key={i} onClick={() => void handleCopySingleColor(c)} style={{ cursor: 'pointer', flexShrink: 0, width: '80px', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                          <div style={{ width: '100%', height: '60px', backgroundColor: c, borderRadius: '8px', border: '1px solid var(--border)' }} />
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>{c}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            <div style={{ textAlign: 'center' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48" style={{ marginBottom: '16px', opacity: 0.5 }}><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              <p style={{ fontSize: '16px', fontWeight: 500, color: 'var(--text-primary)' }}>Nenhuma paleta selecionada</p>
              <p style={{ fontSize: '14px' }}>Selecione ou crie uma paleta ao lado para começar.</p>
            </div>
          </div>
        )}
      </div>

      {/* Modal: criar paleta */}
      <Dialog.Root open={showCreateModal} onOpenChange={setShowCreateModal}>
        <Dialog.Portal>
          <Dialog.Overlay />
          <Dialog.Content>
            <Dialog.Title>Nova Paleta</Dialog.Title>
            <div className="form-group">
              <label>Nome da paleta</label>
              <Input
                fullWidth
                value={newPaletteName}
                onChange={e => setNewPaletteName(e.target.value)}
                placeholder="Ex: Brand Primaria"
              />
            </div>
            <div className="form-group">
              <label>Cores (HEX)</label>
              <Textarea
                fullWidth
                value={newPaletteInput}
                onChange={e => setNewPaletteInput(e.target.value)}
                placeholder="#A5BEFA, #B3093F, #451531, #64B7CC, #FF3877"
              />
              <small className="colors-create-help">{parsedNewPaletteColors.length} cor(es) valida(s)</small>
            </div>
            <div className="ds-dialog-footer">
              <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={handleCreatePalette}
                disabled={!newPaletteName.trim() || parsedNewPaletteColors.length === 0}
              >
                Salvar paleta
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Modal: editar paleta */}
      <Dialog.Root open={showEditModal} onOpenChange={setShowEditModal}>
        <Dialog.Portal>
          <Dialog.Overlay />
          <Dialog.Content>
            <Dialog.Title>Atualizar Paleta</Dialog.Title>
            <div className="form-group">
              <label>Nome da paleta</label>
              <Input
                fullWidth
                value={editPaletteName}
                onChange={e => setEditPaletteName(e.target.value)}
                placeholder="Ex: Brand Primaria"
              />
            </div>
            <div className="form-group">
              <label>Cores (HEX)</label>
              <Textarea
                fullWidth
                value={editPaletteInput}
                onChange={e => setEditPaletteInput(e.target.value)}
                placeholder="#A5BEFA, #B3093F, #451531, #64B7CC, #FF3877"
              />
              <small className="colors-create-help">{parsedEditPaletteColors.length} cor(es) valida(s)</small>
            </div>
            <div className="ds-dialog-footer">
              <Button variant="secondary" onClick={() => setShowEditModal(false)}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveEditPalette}
                disabled={!editPaletteName.trim() || parsedEditPaletteColors.length === 0}
              >
                Salvar alteracoes
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Modal: confirmar remocao */}
      <Dialog.Root open={showRemoveModal} onOpenChange={setShowRemoveModal}>
        <Dialog.Portal>
          <Dialog.Overlay />
          <Dialog.Content>
            <Dialog.Title>Confirmar remocao</Dialog.Title>
            <Dialog.Description>
              {selectedPalette && (
                <>Deseja remover a paleta <strong>{selectedPalette.name}</strong>?</>
              )}
            </Dialog.Description>
            <div className="ds-dialog-footer">
              <Button variant="secondary" onClick={() => setShowRemoveModal(false)}>
                Cancelar
              </Button>
              <Button variant="danger" onClick={handleRemoveSelected}>
                Remover
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {showExtractorModal && (
        <ColorExtractorModal
          existingPalettes={sortedPalettes}
          onCreatePalette={(name, colors) => {
            const id = onAddPalette(name, colors)
            setSelectedPaletteId(id)
          }}
          onAppendToPalette={(paletteId, colors) => {
            const target = sortedPalettes.find(p => p.id === paletteId)
            if (!target) return
            const merged = [...target.colors]
            for (const c of colors) {
              if (!merged.includes(c)) merged.push(c)
            }
            onUpdatePalette(paletteId, { colors: merged })
            setSelectedPaletteId(paletteId)
          }}
          onClose={() => setShowExtractorModal(false)}
        />
      )}
    </div>
  )
}
