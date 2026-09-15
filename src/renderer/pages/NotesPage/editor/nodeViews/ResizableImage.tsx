import { useState, useRef } from 'react'
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from '@tiptap/react'
import { mergeAttributes } from '@tiptap/core'
import Image from '@tiptap/extension-image'
import type { ImageAlign, ImageMode, FrameAspect } from '@types'
import { FRAME_ASPECTS } from '../types'

const ResizableImageView = ({ node, updateAttributes, selected, deleteNode }: NodeViewProps) => {
  const src = node.attrs.src as string
  const alt = (node.attrs.alt as string | undefined) ?? ''
  const title = (node.attrs.title as string | undefined) ?? ''
  const width = node.attrs.width as number | null | undefined
  const align: ImageAlign = (node.attrs.align as ImageAlign | undefined) ?? 'center'
  const mode: ImageMode = (node.attrs.mode as ImageMode | undefined) ?? 'free'
  const frameAspect: FrameAspect = (node.attrs.frameAspect as FrameAspect | undefined) ?? '16:9'

  const [isResizing, setIsResizing] = useState(false)
  const startXRef = useRef(0)
  const startWRef = useRef(0)
  const innerRef = useRef<HTMLDivElement>(null)

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    startXRef.current = e.clientX
    startWRef.current = innerRef.current?.offsetWidth ?? (width ?? 200)
    setIsResizing(true)

    const handleMouseMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startXRef.current
      const newW = Math.max(40, startWRef.current + dx)
      updateAttributes({ width: Math.round(newW) })
    }
    const handleMouseUp = () => {
      setIsResizing(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  const textAlign = align === 'center' ? 'center' : align === 'right' ? 'right' : 'left'
  const aspectCss = FRAME_ASPECTS.find(a => a.value === frameAspect)?.css ?? '16 / 9'
  const showToolbar = selected && !isResizing

  return (
    <NodeViewWrapper as="div" className="resizable-image-outer" data-drag-handle="" style={{ textAlign }}>
      <div
        ref={innerRef}
        className={`resizable-image-inner${selected || isResizing ? ' is-selected' : ''}`}
        style={width ? { width: `${width}px` } : undefined}
      >
        {showToolbar && (
          <div className="image-floating-toolbar" contentEditable={false}>
            <div className="image-toolbar-group">
              {(['left', 'center', 'right'] as const).map(a => (
                <button
                  key={a}
                  type="button"
                  className={`image-toolbar-btn${align === a ? ' active' : ''}`}
                  onMouseDown={e => { e.preventDefault(); updateAttributes({ align: a }) }}
                  title={a === 'left' ? 'Alinhar à esquerda' : a === 'center' ? 'Centralizar' : 'Alinhar à direita'}
                >
                  <svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor">
                    <rect x="1" y="2" width="14" height="2" rx="1"/>
                    <rect x={a === 'left' ? '1' : a === 'center' ? '3.5' : '6'} y="6" width="9" height="2" rx="1"/>
                    <rect x={a === 'left' ? '1' : a === 'center' ? '2.5' : '4'} y="10" width="11" height="2" rx="1"/>
                  </svg>
                </button>
              ))}
            </div>

            <div className="image-toolbar-sep" />

            <div className="image-toolbar-group">
              <button
                type="button"
                className={`image-toolbar-btn image-toolbar-btn-text${mode === 'free' ? ' active' : ''}`}
                onMouseDown={e => { e.preventDefault(); updateAttributes({ mode: 'free' }) }}
                title="Tamanho original"
              >
                Livre
              </button>
              <button
                type="button"
                className={`image-toolbar-btn image-toolbar-btn-text${mode === 'frame' ? ' active' : ''}`}
                onMouseDown={e => { e.preventDefault(); updateAttributes({ mode: 'frame' }) }}
                title="Frame com proporção fixa"
              >
                Frame
              </button>
            </div>

            {mode === 'frame' && (
              <>
                <div className="image-toolbar-sep" />
                <div className="image-toolbar-group">
                  {FRAME_ASPECTS.map(a => (
                    <button
                      key={a.value}
                      type="button"
                      className={`image-toolbar-btn image-toolbar-btn-text${frameAspect === a.value ? ' active' : ''}`}
                      onMouseDown={e => { e.preventDefault(); updateAttributes({ frameAspect: a.value }) }}
                      title={a.label}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </>
            )}

            <div className="image-toolbar-sep" />

            <button
              type="button"
              className="image-toolbar-btn image-toolbar-btn-danger"
              onMouseDown={e => { e.preventDefault(); deleteNode() }}
              title="Remover imagem"
            >
              <svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor">
                <path d="M6 2h4a1 1 0 0 1 1 1H5a1 1 0 0 1 1-1zM2 4h12v1H3.1l.8 8h8.2l.8-8H14v-1H2zm2.9 1h6.2L10.3 13H5.7L4.9 5z"/>
              </svg>
            </button>
          </div>
        )}

        {mode === 'frame' ? (
          <div className="image-frame" style={{ aspectRatio: aspectCss }}>
            <img src={src} alt={alt} title={title} className="image-frame-img" draggable={false} />
          </div>
        ) : (
          <img
            src={src}
            alt={alt}
            title={title}
            className="resizable-image-img"
            style={width ? { width: '100%', height: 'auto' } : { maxWidth: '100%', height: 'auto', display: 'block' }}
            draggable={false}
          />
        )}

        {(selected || isResizing) && (
          <span className="resizable-image-handle" onMouseDown={handleResizeStart} />
        )}
      </div>
    </NodeViewWrapper>
  )
}

export const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: el => el.getAttribute('width') ? Number(el.getAttribute('width')) : null,
        renderHTML: attrs => (attrs.width ? { width: String(attrs.width) } : {}),
      },
      align: {
        default: 'center',
        parseHTML: el => (el.getAttribute('data-align') as ImageAlign | null) ?? 'center',
        renderHTML: attrs => ({ 'data-align': attrs.align ?? 'center' }),
      },
      mode: {
        default: 'free',
        parseHTML: el => (el.getAttribute('data-mode') as ImageMode | null) ?? 'free',
        renderHTML: attrs => ({ 'data-mode': attrs.mode ?? 'free' }),
      },
      frameAspect: {
        default: '16:9',
        parseHTML: el => (el.getAttribute('data-frame-aspect') as FrameAspect | null) ?? '16:9',
        renderHTML: attrs => ({ 'data-frame-aspect': attrs.frameAspect ?? '16:9' }),
      },
    }
  },
  renderHTML({ HTMLAttributes }) {
    return ['img', mergeAttributes(this.options.HTMLAttributes ?? {}, HTMLAttributes)]
  },
  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView)
  },
})
