import { useEffect, useRef, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { ImageEditorModal } from '../modals/ImageEditorModal'

export const ImageInsertPopover = ({
  editor,
  show,
  onClose,
}: {
  editor: Editor
  show: boolean
  onClose: () => void
}) => {
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [url, setUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [pendingImageSrc, setPendingImageSrc] = useState<string | null>(null)

  useEffect(() => {
    if (show) {
      setUrl('')
      setPendingImageSrc(null)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [show])

  useEffect(() => {
    if (!show || pendingImageSrc) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [show, onClose, pendingImageSrc])

  if (!show) return null

  const insertFromUrl = () => {
    if (url.trim()) {
      editor.chain().focus().setImage({ src: url.trim() }).run()
    }
    onClose()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      setPendingImageSrc(dataUrl)
      setUploading(false)
    }
    reader.onerror = () => setUploading(false)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleEditorInsert = (processedSrc: string) => {
    editor.chain().focus().setImage({ src: processedSrc }).run()
    setPendingImageSrc(null)
    onClose()
  }

  return (
    <>
      {pendingImageSrc && (
        <ImageEditorModal
          src={pendingImageSrc}
          onInsert={handleEditorInsert}
          onCancel={() => setPendingImageSrc(null)}
        />
      )}
      <div ref={ref} className="editor-image-popover">
        <div className="editor-image-popover-tabs">
          <div className="editor-image-popover-section">
            <p className="editor-image-popover-label">Arquivo local</p>
            <button
              type="button"
              className="btn btn-secondary btn-sm editor-image-upload-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              {uploading ? 'Carregando...' : 'Escolher arquivo'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          </div>
          <div className="editor-image-popover-divider">ou</div>
          <div className="editor-image-popover-section">
            <p className="editor-image-popover-label">URL da imagem</p>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                ref={inputRef}
                type="text"
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && insertFromUrl()}
                placeholder="https://..."
                className="form-input"
                style={{ flex: 1, fontSize: 12 }}
              />
              <button type="button" className="btn btn-primary btn-sm" onClick={insertFromUrl}>
                OK
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
