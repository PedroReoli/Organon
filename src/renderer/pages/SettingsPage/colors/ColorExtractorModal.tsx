/**
 * ColorExtractorModal — modal que extrai paleta de uma imagem.
 *
 * Recebe upload via dropzone, extrai com node-vibrant, mostra preview
 * da imagem + swatches clicaveis. Usuario escolhe quais cores adicionar
 * a uma paleta nova ou existente. Upgrade 04.
 */

import React, { useCallback, useRef, useState } from 'react'
import type { ColorPalette } from '@types'
import { Button, Input } from '@shared/components/primitives'
import {
  extractPaletteFromDataUrl,
  fileToDataUrl,
  paletteToList,
  type ExtractedColor,
  type ExtractedPalette,
} from '@shared/utils/colorExtractor'

interface ColorExtractorModalProps {
  existingPalettes: ColorPalette[]
  onCreatePalette: (name: string, colors: string[]) => void
  onAppendToPalette: (paletteId: string, colors: string[]) => void
  onClose: () => void
}

export const ColorExtractorModal: React.FC<ColorExtractorModalProps> = ({
  existingPalettes,
  onCreatePalette,
  onAppendToPalette,
  onClose,
}) => {
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null)
  const [palette, setPalette] = useState<ExtractedPalette | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newPaletteName, setNewPaletteName] = useState('')
  const [targetPaletteId, setTargetPaletteId] = useState<string>('__new__')
  const [isDragOver, setIsDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Arquivo invalido. Use uma imagem.')
      return
    }
    setError(null)
    setIsLoading(true)
    try {
      const dataUrl = await fileToDataUrl(file)
      setImageDataUrl(dataUrl)
      const extracted = await extractPaletteFromDataUrl(dataUrl)
      setPalette(extracted)
      // Pre-seleciona todas as cores
      const allHex = new Set(paletteToList(extracted).map((c) => c.hex))
      setSelected(allHex)
      // Auto-nome baseado no arquivo
      if (!newPaletteName.trim()) {
        setNewPaletteName(file.name.replace(/\.[^.]+$/, '').slice(0, 40))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao extrair paleta')
    } finally {
      setIsLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) void handleFile(file)
  }

  const handleSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) void handleFile(file)
  }

  const toggleColor = (hex: string) => {
    const next = new Set(selected)
    if (next.has(hex)) next.delete(hex)
    else next.add(hex)
    setSelected(next)
  }

  const handleSave = () => {
    if (selected.size === 0) return
    const colors = Array.from(selected)
    if (targetPaletteId === '__new__') {
      const name = newPaletteName.trim() || 'Paleta extraida'
      onCreatePalette(name, colors)
    } else {
      onAppendToPalette(targetPaletteId, colors)
    }
    onClose()
  }

  const extractedList: ExtractedColor[] = palette ? paletteToList(palette) : []

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal color-extractor-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-header">
          <h2>Extrair cores de uma imagem</h2>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            &times;
          </button>
        </header>

        <div className="modal-body">
          {!imageDataUrl ? (
            <div
              className={`color-extractor-dropzone ${isDragOver ? 'is-over' : ''}`}
              onDragOver={(e) => {
                e.preventDefault()
                setIsDragOver(true)
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                width="48"
                height="48"
                style={{ opacity: 0.4 }}
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <p>Arraste uma imagem aqui ou clique para selecionar</p>
              <p className="color-extractor-hint">PNG, JPG, WEBP</p>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                onChange={handleSelectFile}
                style={{ display: 'none' }}
              />
            </div>
          ) : (
            <div className="color-extractor-preview">
              <div className="color-extractor-image-wrapper">
                <img src={imageDataUrl} alt="Preview" />
                <button
                  type="button"
                  className="color-extractor-change-btn"
                  onClick={() => {
                    setImageDataUrl(null)
                    setPalette(null)
                    setSelected(new Set())
                    setError(null)
                  }}
                >
                  Trocar imagem
                </button>
              </div>

              {isLoading && (
                <div className="color-extractor-loading">Extraindo cores...</div>
              )}

              {error && <div className="color-extractor-error">{error}</div>}

              {palette && extractedList.length > 0 && (
                <>
                  <div className="color-extractor-swatches">
                    {extractedList.map((color) => (
                      <button
                        key={color.hex}
                        type="button"
                        className={`color-extractor-swatch ${selected.has(color.hex) ? 'is-selected' : ''}`}
                        style={{ background: color.hex }}
                        onClick={() => toggleColor(color.hex)}
                        title={`${color.name} - ${color.hex}`}
                      >
                        <span className="color-extractor-swatch-label">
                          {color.name}
                        </span>
                        <span className="color-extractor-swatch-hex">
                          {color.hex}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="color-extractor-save">
                    <label className="form-label">Adicionar em:</label>
                    <select
                      className="form-input"
                      value={targetPaletteId}
                      onChange={(e) => setTargetPaletteId(e.target.value)}
                    >
                      <option value="__new__">+ Nova paleta</option>
                      {existingPalettes.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>

                    {targetPaletteId === '__new__' && (
                      <Input
                        type="text"
                        value={newPaletteName}
                        onChange={(e) => setNewPaletteName(e.target.value)}
                        placeholder="Nome da paleta"
                        fullWidth
                      />
                    )}

                    <p className="color-extractor-count">
                      {selected.size} cor{selected.size === 1 ? '' : 'es'} selecionada
                      {selected.size === 1 ? '' : 's'}
                    </p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <footer className="modal-footer">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleSave}
            disabled={selected.size === 0}
          >
            {targetPaletteId === '__new__' ? 'Criar paleta' : 'Adicionar'}
          </Button>
        </footer>
      </div>
    </div>
  )
}
