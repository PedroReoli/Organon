import { useState, useEffect } from 'react'
import type { Editor } from '@tiptap/react'
import { HeadingDropdown } from './HeadingDropdown'
import { ColorPickerPopover } from './ColorPickerPopover'
import { LinkPopover } from './LinkPopover'
import { TablePickerPopover } from './TablePickerPopover'
import { ImageInsertPopover } from './ImageInsertPopover'

interface FloatingToolboxPosition {
  left: number
  top: number
}

export const FullToolbar = ({
  editor,
  floating = false,
  collapsed = false,
  disableImages = false,
  position,
  toolboxRef,
  onToggleCollapsed,
  onHandlePointerDown,
  onClose,
}: {
  editor: Editor
  floating?: boolean
  collapsed?: boolean
  disableImages?: boolean
  position?: FloatingToolboxPosition
  toolboxRef?: React.RefObject<HTMLDivElement | null>
  onToggleCollapsed?: () => void
  onHandlePointerDown?: (event: React.PointerEvent<HTMLButtonElement>) => void
  onClose?: () => void
}) => {
  const [showHeading, setShowHeading] = useState(false)
  const [showTextColor, setShowTextColor] = useState(false)
  const [showHighlightColor, setShowHighlightColor] = useState(false)
  const [showLink, setShowLink] = useState(false)
  const [showTable, setShowTable] = useState(false)
  const [showImage, setShowImage] = useState(false)

  useEffect(() => {
    if (disableImages) return
    const handler = () => setShowImage(true)
    document.addEventListener('slash-insert-image', handler)
    return () => document.removeEventListener('slash-insert-image', handler)
  }, [disableImages])

  useEffect(() => {
    const handler = () => setShowLink(true)
    document.addEventListener('slash-insert-link', handler)
    return () => document.removeEventListener('slash-insert-link', handler)
  }, [])

  const getActiveHeadingLabel = () => {
    if (editor.isActive('heading', { level: 1 })) return 'H1'
    if (editor.isActive('heading', { level: 2 })) return 'H2'
    if (editor.isActive('heading', { level: 3 })) return 'H3'
    return 'Texto'
  }

  const toolbarBody = (
    <div className="editor-toolbar editor-toolbar-full">
      <div className="editor-toolbar-dropdown">
        <button type="button" className="editor-toolbar-btn editor-toolbar-btn-wide" onClick={() => setShowHeading(!showHeading)} title="Tipo de texto">
          {getActiveHeadingLabel()}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="10" height="10" style={{ marginLeft: 4 }}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        <HeadingDropdown editor={editor} show={showHeading} onClose={() => setShowHeading(false)} />
      </div>

      <div className="editor-toolbar-divider" />

      <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={`editor-toolbar-btn ${editor.isActive('bold') ? 'is-active' : ''}`} title="Negrito (Ctrl+B)">
        <strong>B</strong>
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={`editor-toolbar-btn ${editor.isActive('italic') ? 'is-active' : ''}`} title="Italico (Ctrl+I)">
        <em>I</em>
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} className={`editor-toolbar-btn ${editor.isActive('underline') ? 'is-active' : ''}`} title="Sublinhado (Ctrl+U)">
        <u>U</u>
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()} className={`editor-toolbar-btn ${editor.isActive('strike') ? 'is-active' : ''}`} title="Riscado">
        <s>S</s>
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleCode().run()} className={`editor-toolbar-btn ${editor.isActive('code') ? 'is-active' : ''}`} title="Codigo inline">
        {'</>'}
      </button>

      <div className="editor-toolbar-divider" />

      <div className="editor-toolbar-dropdown">
        <button type="button" className={`editor-toolbar-btn ${editor.isActive('highlight') ? 'is-active' : ''}`} onClick={() => setShowHighlightColor(!showHighlightColor)} title="Destaque">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
            <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
          <span className="editor-toolbar-color-bar" style={{ background: editor.getAttributes('highlight').color ?? '#fef08a' }} />
        </button>
        <ColorPickerPopover show={showHighlightColor} onClose={() => setShowHighlightColor(false)} onSelect={color => { if (color) editor.chain().focus().toggleHighlight({ color }).run(); else editor.chain().focus().unsetHighlight().run() }} activeColor={editor.getAttributes('highlight').color ?? null} />
      </div>

      <div className="editor-toolbar-dropdown">
        <button type="button" className="editor-toolbar-btn" onClick={() => setShowTextColor(!showTextColor)} title="Cor do texto">
          <span style={{ fontWeight: 700 }}>A</span>
          <span className="editor-toolbar-color-bar" style={{ background: editor.getAttributes('textStyle').color ?? 'var(--color-text)' }} />
        </button>
        <ColorPickerPopover show={showTextColor} onClose={() => setShowTextColor(false)} onSelect={color => { if (color) editor.chain().focus().setColor(color).run(); else editor.chain().focus().unsetColor().run() }} activeColor={editor.getAttributes('textStyle').color ?? null} />
      </div>

      <button type="button" onClick={() => editor.chain().focus().toggleSubscript().run()} className={`editor-toolbar-btn ${editor.isActive('subscript') ? 'is-active' : ''}`} title="Subscrito">
        X<sub style={{ fontSize: '0.65em' }}>2</sub>
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleSuperscript().run()} className={`editor-toolbar-btn ${editor.isActive('superscript') ? 'is-active' : ''}`} title="Sobrescrito">
        X<sup style={{ fontSize: '0.65em' }}>2</sup>
      </button>

      <div className="editor-toolbar-divider" />

      <button type="button" onClick={() => editor.chain().focus().setTextAlign('left').run()} className={`editor-toolbar-btn ${editor.isActive({ textAlign: 'left' }) ? 'is-active' : ''}`} title="Esquerda">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="15" y2="12" /><line x1="3" y1="18" x2="18" y2="18" /></svg>
      </button>
      <button type="button" onClick={() => editor.chain().focus().setTextAlign('center').run()} className={`editor-toolbar-btn ${editor.isActive({ textAlign: 'center' }) ? 'is-active' : ''}`} title="Centro">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><line x1="3" y1="6" x2="21" y2="6" /><line x1="6" y1="12" x2="18" y2="12" /><line x1="4" y1="18" x2="20" y2="18" /></svg>
      </button>
      <button type="button" onClick={() => editor.chain().focus().setTextAlign('right').run()} className={`editor-toolbar-btn ${editor.isActive({ textAlign: 'right' }) ? 'is-active' : ''}`} title="Direita">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><line x1="3" y1="6" x2="21" y2="6" /><line x1="9" y1="12" x2="21" y2="12" /><line x1="6" y1="18" x2="21" y2="18" /></svg>
      </button>

      <div className="editor-toolbar-divider" />

      <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={`editor-toolbar-btn ${editor.isActive('bulletList') ? 'is-active' : ''}`} title="Lista">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><line x1="9" y1="6" x2="20" y2="6" /><line x1="9" y1="12" x2="20" y2="12" /><line x1="9" y1="18" x2="20" y2="18" /><circle cx="5" cy="6" r="1.5" fill="currentColor" stroke="none" /><circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none" /><circle cx="5" cy="18" r="1.5" fill="currentColor" stroke="none" /></svg>
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={`editor-toolbar-btn ${editor.isActive('orderedList') ? 'is-active' : ''}`} title="Lista numerada">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><line x1="10" y1="6" x2="21" y2="6" /><line x1="10" y1="12" x2="21" y2="12" /><line x1="10" y1="18" x2="21" y2="18" /><text x="3" y="8" fontSize="8" fill="currentColor" stroke="none" fontWeight="700">1</text><text x="3" y="14" fontSize="8" fill="currentColor" stroke="none" fontWeight="700">2</text><text x="3" y="20" fontSize="8" fill="currentColor" stroke="none" fontWeight="700">3</text></svg>
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleTaskList().run()} className={`editor-toolbar-btn ${editor.isActive('taskList') ? 'is-active' : ''}`} title="Lista de tarefas">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><rect x="3" y="3" width="6" height="6" rx="1" /><polyline points="5 6 6.5 7.5 9 4.5" /><line x1="13" y1="6" x2="21" y2="6" /><rect x="3" y="13" width="6" height="6" rx="1" /><line x1="13" y1="16" x2="21" y2="16" /></svg>
      </button>

      <div className="editor-toolbar-divider" />

      <div className="editor-toolbar-dropdown">
        <button type="button" className={`editor-toolbar-btn ${editor.isActive('link') ? 'is-active' : ''}`} onClick={() => setShowLink(!showLink)} title="Link">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
        </button>
        <LinkPopover editor={editor} show={showLink} onClose={() => setShowLink(false)} />
      </div>

      {!disableImages && (
        <div className="editor-toolbar-dropdown">
          <button type="button" className="editor-toolbar-btn" onClick={() => setShowImage(!showImage)} title="Imagem">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></svg>
          </button>
          <ImageInsertPopover editor={editor} show={showImage} onClose={() => setShowImage(false)} />
        </div>
      )}

      <div className="editor-toolbar-dropdown">
        <button type="button" className="editor-toolbar-btn" onClick={() => setShowTable(!showTable)} title="Tabela">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" /><line x1="9" y1="3" x2="9" y2="21" /><line x1="15" y1="3" x2="15" y2="21" /></svg>
        </button>
        <TablePickerPopover editor={editor} show={showTable} onClose={() => setShowTable(false)} />
      </div>

      <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={`editor-toolbar-btn ${editor.isActive('blockquote') ? 'is-active' : ''}`} title="Citacao">
        <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179z" /></svg>
      </button>
      <button type="button" onClick={() => editor.chain().focus().setHorizontalRule().run()} className="editor-toolbar-btn" title="Divisor">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><line x1="2" y1="12" x2="22" y2="12" /></svg>
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleCodeBlock().run()} className={`editor-toolbar-btn ${editor.isActive('codeBlock') ? 'is-active' : ''}`} title="Bloco de codigo">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>
      </button>

      {editor.isActive('table') && (
        <>
          <div className="editor-toolbar-divider" />
          <button type="button" onClick={() => editor.chain().focus().addRowAfter().run()} className="editor-toolbar-btn" title="Adicionar linha">+Linha</button>
          <button type="button" onClick={() => editor.chain().focus().addColumnAfter().run()} className="editor-toolbar-btn" title="Adicionar coluna">+Col</button>
          <button type="button" onClick={() => editor.chain().focus().deleteRow().run()} className="editor-toolbar-btn editor-toolbar-btn-danger" title="Remover linha">-Linha</button>
          <button type="button" onClick={() => editor.chain().focus().deleteColumn().run()} className="editor-toolbar-btn editor-toolbar-btn-danger" title="Remover coluna">-Col</button>
          <button type="button" onClick={() => editor.chain().focus().deleteTable().run()} className="editor-toolbar-btn editor-toolbar-btn-danger" title="Excluir tabela">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-2 14H7L5 6" /><path d="M10 11v6M14 11v6" /></svg>
          </button>
        </>
      )}
    </div>
  )

  if (!floating) return toolbarBody

  return (
    <div
      ref={toolboxRef as React.RefObject<HTMLDivElement> | undefined}
      className={`editor-floating-toolbox${collapsed ? ' is-collapsed' : ''}`}
      style={position ? { left: position.left, top: position.top } : undefined}
    >
      <div className="editor-floating-toolbox-head">
        <button type="button" className="editor-floating-toolbox-drag" onPointerDown={onHandlePointerDown} title="Arrastar toolbox">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" aria-hidden="true">
            <circle cx="9" cy="7" r="1" fill="currentColor" stroke="none" /><circle cx="15" cy="7" r="1" fill="currentColor" stroke="none" />
            <circle cx="9" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="15" cy="12" r="1" fill="currentColor" stroke="none" />
            <circle cx="9" cy="17" r="1" fill="currentColor" stroke="none" /><circle cx="15" cy="17" r="1" fill="currentColor" stroke="none" />
          </svg>
          <span>Barra de ferramentas</span>
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button type="button" className="editor-floating-toolbox-toggle" onClick={onToggleCollapsed} title={collapsed ? 'Expandir toolbox' : 'Recolher toolbox'}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" aria-hidden="true">
              {collapsed ? <polyline points="6 9 12 15 18 9" /> : <polyline points="18 15 12 9 6 15" />}
            </svg>
          </button>
          {onClose && (
            <button type="button" className="editor-floating-toolbox-toggle editor-floating-toolbox-close" onClick={onClose} title="Fechar toolbox">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      </div>
      {!collapsed && toolbarBody}
    </div>
  )
}
