import { useState, useRef } from 'react'

interface ImageEditorModalProps {
  src: string
  onInsert: (processedSrc: string) => void
  onCancel: () => void
}

export const ImageEditorModal = ({ src, onInsert, onCancel }: ImageEditorModalProps) => {
  const [scale, setScale] = useState(100)
  const [quality, setQuality] = useState(90)
  const [crop, setCrop] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const drawStartRef = useRef<{ x: number; y: number } | null>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)

  const getRelativePos = (e: React.MouseEvent) => {
    const rect = overlayRef.current!.getBoundingClientRect()
    return {
      x: Math.max(0, Math.min(e.clientX - rect.left, rect.width)),
      y: Math.max(0, Math.min(e.clientY - rect.top, rect.height)),
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return
    e.preventDefault()
    const pos = getRelativePos(e)
    drawStartRef.current = pos
    setIsDrawing(true)
    setCrop({ x: pos.x, y: pos.y, w: 0, h: 0 })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || !drawStartRef.current) return
    const pos = getRelativePos(e)
    const start = drawStartRef.current
    setCrop({
      x: Math.min(start.x, pos.x),
      y: Math.min(start.y, pos.y),
      w: Math.abs(pos.x - start.x),
      h: Math.abs(pos.y - start.y),
    })
  }

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isDrawing) return
    const pos = getRelativePos(e)
    const start = drawStartRef.current
    if (!start || (Math.abs(pos.x - start.x) < 6 && Math.abs(pos.y - start.y) < 6)) {
      setCrop(null)
    }
    setIsDrawing(false)
    drawStartRef.current = null
  }

  const handleInsert = () => {
    const img = imgRef.current
    if (!img) return
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dispW = img.offsetWidth
    const dispH = img.offsetHeight
    const natW = img.naturalWidth
    const natH = img.naturalHeight
    const rx = natW / dispW
    const ry = natH / dispH

    let sx = 0, sy = 0, sw = natW, sh = natH
    if (crop && crop.w > 6 && crop.h > 6) {
      sx = Math.round(crop.x * rx)
      sy = Math.round(crop.y * ry)
      sw = Math.round(crop.w * rx)
      sh = Math.round(crop.h * ry)
    }

    const targetW = Math.max(1, Math.round(sw * scale / 100))
    const targetH = Math.max(1, Math.round(sh * scale / 100))
    canvas.width = targetW
    canvas.height = targetH
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetW, targetH)

    onInsert(canvas.toDataURL('image/jpeg', quality / 100))
  }

  const overlayStyle = (area: 'top' | 'bottom' | 'left' | 'right') => {
    const base: React.CSSProperties = { position: 'absolute', background: 'rgba(0,0,0,0.45)', pointerEvents: 'none' }
    if (!crop || crop.w < 2 || crop.h < 2) return { ...base, display: 'none' }
    switch (area) {
      case 'top':    return { ...base, top: 0, left: 0, right: 0, height: crop.y }
      case 'bottom': return { ...base, top: crop.y + crop.h, left: 0, right: 0, bottom: 0 }
      case 'left':   return { ...base, top: crop.y, left: 0, width: crop.x, height: crop.h }
      case 'right':  return { ...base, top: crop.y, left: crop.x + crop.w, right: 0, height: crop.h }
    }
  }

  return (
    <div className="image-editor-overlay">
      <div className="image-editor-modal">
        <div className="image-editor-header">
          <span>Editar imagem antes de inserir</span>
          <button type="button" className="image-editor-close" onClick={onCancel}>&times;</button>
        </div>
        <div className="image-editor-body">
          <div className="image-editor-preview-wrap">
            <div
              ref={overlayRef}
              className="image-editor-crop-area"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <img ref={imgRef} src={src} className="image-editor-img" draggable={false} alt="preview" />
              <div style={overlayStyle('top')} />
              <div style={overlayStyle('bottom')} />
              <div style={overlayStyle('left')} />
              <div style={overlayStyle('right')} />
              {crop && crop.w > 2 && crop.h > 2 && (
                <div style={{
                  position: 'absolute',
                  left: crop.x, top: crop.y,
                  width: crop.w, height: crop.h,
                  border: '2px solid #63b3ed',
                  boxSizing: 'border-box',
                  pointerEvents: 'none',
                }} />
              )}
            </div>
            <p className="image-editor-hint">Arraste para selecionar área de corte</p>
          </div>
          <div className="image-editor-controls">
            <label className="image-editor-label">
              Escala: <strong>{scale}%</strong>
              <br /><small>Tamanho final: aproximado</small>
            </label>
            <input type="range" min={5} max={200} value={scale} onChange={e => setScale(Number(e.target.value))} className="image-editor-slider" />
            <label className="image-editor-label" style={{ marginTop: 12 }}>
              Qualidade JPEG: <strong>{quality}%</strong>
            </label>
            <input type="range" min={10} max={100} value={quality} onChange={e => setQuality(Number(e.target.value))} className="image-editor-slider" />
            {crop && crop.w > 2 && crop.h > 2 && (
              <button type="button" className="btn btn-secondary btn-sm" style={{ marginTop: 10, width: '100%' }} onClick={() => setCrop(null)}>
                Limpar corte
              </button>
            )}
          </div>
        </div>
        <div className="image-editor-footer">
          <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancelar</button>
          <button type="button" className="btn btn-primary" onClick={handleInsert}>Inserir imagem</button>
        </div>
      </div>
    </div>
  )
}
