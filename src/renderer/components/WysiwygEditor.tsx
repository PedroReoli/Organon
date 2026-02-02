import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import Highlight from '@tiptap/extension-highlight'
import Underline from '@tiptap/extension-underline'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import TextAlign from '@tiptap/extension-text-align'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import TextStyle from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import Typography from '@tiptap/extension-typography'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { Extension } from '@tiptap/core'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { Plugin } from '@tiptap/pm/state'
import { copyTextToClipboard, openExternalLink } from '../utils'

interface WysiwygEditorProps {
  content: string
  onChange: (html: string) => void
  placeholder?: string
  mode?: 'compact' | 'full'
}

const PRESET_COLORS = [
  '#000000', '#434343', '#666666', '#999999',
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6',
]

const COPY_ICON_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>'
const CHECK_ICON_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>'

const getCopyTextFromNode = (container: HTMLElement, kind: 'code' | 'quote'): string => {
  const clone = container.cloneNode(true) as HTMLElement
  clone.querySelectorAll('.editor-copy-node-btn').forEach(node => node.remove())
  if (kind === 'code') {
    return (clone.querySelector('code')?.textContent ?? clone.textContent ?? '').trim()
  }
  return (clone.textContent ?? '').trim()
}

const createCopyWidgetButton = (kind: 'code' | 'quote') => {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = `editor-copy-node-btn editor-copy-node-btn-${kind}`
  button.innerHTML = COPY_ICON_SVG
  button.setAttribute('aria-label', 'Copiar')
  button.dataset.copyKind = kind
  button.setAttribute('contenteditable', 'false')

  button.addEventListener('mousedown', event => {
    event.preventDefault()
    event.stopPropagation()
  })

  button.addEventListener('click', event => {
    event.preventDefault()
    event.stopPropagation()

    const source = kind === 'code'
      ? button.closest('pre')
      : button.closest('blockquote')

    if (!(source instanceof HTMLElement)) return

    const text = getCopyTextFromNode(source, kind)
    if (!text) return

    void copyTextToClipboard(text).then(success => {
      button.classList.toggle('is-copied', success)
      button.innerHTML = success ? CHECK_ICON_SVG : COPY_ICON_SVG
      button.setAttribute('aria-label', success ? 'Copiado' : 'Copiar')
      window.setTimeout(() => {
        button.classList.remove('is-copied')
        button.innerHTML = COPY_ICON_SVG
        button.setAttribute('aria-label', 'Copiar')
      }, 1200)
    })
  })

  return button
}

const CopyNodeControlsExtension = Extension.create({
  name: 'copyNodeControls',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          decorations: state => {
            const decorations: Decoration[] = []

            state.doc.descendants((node, pos) => {
              if (node.type.name === 'codeBlock') {
                decorations.push(
                  Decoration.widget(pos + 1, () => createCopyWidgetButton('code'), {
                    side: -1,
                    ignoreSelection: true,
                  }),
                )
              }

              if (node.type.name === 'blockquote') {
                decorations.push(
                  Decoration.widget(pos + 1, () => createCopyWidgetButton('quote'), {
                    side: -1,
                    ignoreSelection: true,
                  }),
                )
              }

              return true
            })

            return DecorationSet.create(state.doc, decorations)
          },
        },
      }),
    ]
  },
})

const getExtensions = (mode: 'compact' | 'full', placeholderText: string) => {
  const base = [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
    }),
    Placeholder.configure({ placeholder: placeholderText }),
    Underline,
    TextStyle,
    Typography,
    Link.configure({
      openOnClick: false,
      HTMLAttributes: { class: 'editor-link' },
    }),
  ]

  if (mode === 'full') {
    return [
      ...base,
      CopyNodeControlsExtension,
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      Highlight.configure({ multicolor: true }),
      Subscript,
      Superscript,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Image.configure({ inline: false, allowBase64: true }),
      Color,
    ]
  }

  return base
}

interface LinkQuickMenuState {
  href: string
  left: number
  top: number
}

// ---- Popovers / Dropdowns internos ----

const HeadingDropdown = ({ editor, show, onClose }: { editor: Editor; show: boolean; onClose: () => void }) => {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!show) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [show, onClose])

  if (!show) return null

  const items = [
    { label: 'Paragrafo', action: () => editor.chain().focus().setParagraph().run(), active: editor.isActive('paragraph') && !editor.isActive('heading') },
    { label: 'Titulo 1', action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), active: editor.isActive('heading', { level: 1 }) },
    { label: 'Titulo 2', action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: editor.isActive('heading', { level: 2 }) },
    { label: 'Titulo 3', action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), active: editor.isActive('heading', { level: 3 }) },
  ]

  const currentLabel = items.find(i => i.active)?.label ?? 'Paragrafo'

  return (
    <div ref={ref} className="editor-toolbar-dropdown-menu">
      {items.map(item => (
        <button
          key={item.label}
          type="button"
          className={`editor-toolbar-dropdown-item ${item.active ? 'active' : ''}`}
          onClick={() => { item.action(); onClose() }}
        >
          {item.label}
          {item.label === currentLabel && (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" style={{ marginLeft: 'auto' }}>
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </button>
      ))}
    </div>
  )
}

const ColorPickerPopover = ({
  show,
  onClose,
  onSelect,
  activeColor,
}: {
  show: boolean
  onClose: () => void
  onSelect: (color: string) => void
  activeColor: string | null
}) => {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!show) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [show, onClose])

  if (!show) return null

  return (
    <div ref={ref} className="editor-color-picker">
      <button
        type="button"
        className={`editor-color-swatch ${!activeColor ? 'active' : ''}`}
        style={{ background: 'transparent', border: '2px dashed var(--color-border)' }}
        onClick={() => { onSelect(''); onClose() }}
        title="Remover cor"
      />
      {PRESET_COLORS.map(color => (
        <button
          key={color}
          type="button"
          className={`editor-color-swatch ${activeColor === color ? 'active' : ''}`}
          style={{ background: color }}
          onClick={() => { onSelect(color); onClose() }}
          title={color}
        />
      ))}
    </div>
  )
}

const LinkPopover = ({
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
  const [url, setUrl] = useState('')

  useEffect(() => {
    if (show) {
      const existingUrl = editor.getAttributes('link').href ?? ''
      setUrl(existingUrl)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [show, editor])

  useEffect(() => {
    if (!show) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [show, onClose])

  if (!show) return null

  const applyLink = () => {
    if (url.trim()) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run()
    } else {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
    }
    onClose()
  }

  return (
    <div ref={ref} className="editor-link-popover">
      <input
        ref={inputRef}
        type="text"
        value={url}
        onChange={e => setUrl(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && applyLink()}
        placeholder="https://..."
        className="form-input"
      />
      <button type="button" className="btn btn-primary btn-sm" onClick={applyLink}>
        OK
      </button>
      {editor.isActive('link') && (
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => { editor.chain().focus().unsetLink().run(); onClose() }}
          style={{ color: 'var(--color-danger)' }}
        >
          Remover
        </button>
      )}
    </div>
  )
}

const TablePickerPopover = ({
  editor,
  show,
  onClose,
}: {
  editor: Editor
  show: boolean
  onClose: () => void
}) => {
  const ref = useRef<HTMLDivElement>(null)
  const [hoverRows, setHoverRows] = useState(0)
  const [hoverCols, setHoverCols] = useState(0)

  useEffect(() => {
    if (!show) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [show, onClose])

  if (!show) return null

  return (
    <div ref={ref} className="editor-table-picker">
      <div className="editor-table-picker-label">
        {hoverRows > 0 ? `${hoverRows} x ${hoverCols}` : 'Selecione tamanho'}
      </div>
      <div className="editor-table-grid">
        {Array.from({ length: 5 }, (_, row) =>
          Array.from({ length: 5 }, (_, col) => (
            <button
              key={`${row}-${col}`}
              type="button"
              className={`editor-table-cell ${row < hoverRows && col < hoverCols ? 'active' : ''}`}
              onMouseEnter={() => { setHoverRows(row + 1); setHoverCols(col + 1) }}
              onClick={() => {
                editor.chain().focus().insertTable({ rows: row + 1, cols: col + 1, withHeaderRow: true }).run()
                onClose()
              }}
            />
          ))
        )}
      </div>
    </div>
  )
}

// ---- Toolbar para modo full ----

const ImageInsertPopover = ({
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
  const [url, setUrl] = useState('')

  useEffect(() => {
    if (show) {
      setUrl('')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [show])

  useEffect(() => {
    if (!show) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [show, onClose])

  if (!show) return null

  const insertImage = () => {
    if (url.trim()) {
      editor.chain().focus().setImage({ src: url.trim() }).run()
    }
    onClose()
  }

  return (
    <div ref={ref} className="editor-link-popover">
      <input
        ref={inputRef}
        type="text"
        value={url}
        onChange={e => setUrl(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && insertImage()}
        placeholder="URL da imagem..."
        className="form-input"
      />
      <button type="button" className="btn btn-primary btn-sm" onClick={insertImage}>
        OK
      </button>
    </div>
  )
}

const FullToolbar = ({ editor }: { editor: Editor }) => {
  const [showHeading, setShowHeading] = useState(false)
  const [showTextColor, setShowTextColor] = useState(false)
  const [showHighlightColor, setShowHighlightColor] = useState(false)
  const [showLink, setShowLink] = useState(false)
  const [showTable, setShowTable] = useState(false)
  const [showImage, setShowImage] = useState(false)

  const getActiveHeadingLabel = () => {
    if (editor.isActive('heading', { level: 1 })) return 'H1'
    if (editor.isActive('heading', { level: 2 })) return 'H2'
    if (editor.isActive('heading', { level: 3 })) return 'H3'
    return 'Texto'
  }

  return (
    <div className="editor-toolbar editor-toolbar-full">
      {/* Grupo 1: Tipo de texto */}
      <div className="editor-toolbar-dropdown">
        <button
          type="button"
          className="editor-toolbar-btn editor-toolbar-btn-wide"
          onClick={() => setShowHeading(!showHeading)}
          title="Tipo de texto"
        >
          {getActiveHeadingLabel()}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="10" height="10" style={{ marginLeft: 4 }}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        <HeadingDropdown editor={editor} show={showHeading} onClose={() => setShowHeading(false)} />
      </div>

      <div className="editor-toolbar-divider" />

      {/* Grupo 2: Formatacao basica */}
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

      {/* Grupo 3: Formatacao avancada */}
      <div className="editor-toolbar-dropdown">
        <button
          type="button"
          className={`editor-toolbar-btn ${editor.isActive('highlight') ? 'is-active' : ''}`}
          onClick={() => setShowHighlightColor(!showHighlightColor)}
          title="Destaque"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
          <span className="editor-toolbar-color-bar" style={{ background: editor.getAttributes('highlight').color ?? '#fef08a' }} />
        </button>
        <ColorPickerPopover
          show={showHighlightColor}
          onClose={() => setShowHighlightColor(false)}
          onSelect={color => {
            if (color) {
              editor.chain().focus().toggleHighlight({ color }).run()
            } else {
              editor.chain().focus().unsetHighlight().run()
            }
          }}
          activeColor={editor.getAttributes('highlight').color ?? null}
        />
      </div>

      <div className="editor-toolbar-dropdown">
        <button
          type="button"
          className="editor-toolbar-btn"
          onClick={() => setShowTextColor(!showTextColor)}
          title="Cor do texto"
        >
          <span style={{ fontWeight: 700 }}>A</span>
          <span className="editor-toolbar-color-bar" style={{ background: editor.getAttributes('textStyle').color ?? 'var(--color-text)' }} />
        </button>
        <ColorPickerPopover
          show={showTextColor}
          onClose={() => setShowTextColor(false)}
          onSelect={color => {
            if (color) {
              editor.chain().focus().setColor(color).run()
            } else {
              editor.chain().focus().unsetColor().run()
            }
          }}
          activeColor={editor.getAttributes('textStyle').color ?? null}
        />
      </div>

      <button type="button" onClick={() => editor.chain().focus().toggleSubscript().run()} className={`editor-toolbar-btn ${editor.isActive('subscript') ? 'is-active' : ''}`} title="Subscrito">
        X<sub style={{ fontSize: '0.65em' }}>2</sub>
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleSuperscript().run()} className={`editor-toolbar-btn ${editor.isActive('superscript') ? 'is-active' : ''}`} title="Sobrescrito">
        X<sup style={{ fontSize: '0.65em' }}>2</sup>
      </button>

      <div className="editor-toolbar-divider" />

      {/* Grupo 4: Alinhamento */}
      <button type="button" onClick={() => editor.chain().focus().setTextAlign('left').run()} className={`editor-toolbar-btn ${editor.isActive({ textAlign: 'left' }) ? 'is-active' : ''}`} title="Alinhar esquerda">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
          <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="15" y2="12" /><line x1="3" y1="18" x2="18" y2="18" />
        </svg>
      </button>
      <button type="button" onClick={() => editor.chain().focus().setTextAlign('center').run()} className={`editor-toolbar-btn ${editor.isActive({ textAlign: 'center' }) ? 'is-active' : ''}`} title="Centralizar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
          <line x1="3" y1="6" x2="21" y2="6" /><line x1="6" y1="12" x2="18" y2="12" /><line x1="4" y1="18" x2="20" y2="18" />
        </svg>
      </button>
      <button type="button" onClick={() => editor.chain().focus().setTextAlign('right').run()} className={`editor-toolbar-btn ${editor.isActive({ textAlign: 'right' }) ? 'is-active' : ''}`} title="Alinhar direita">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
          <line x1="3" y1="6" x2="21" y2="6" /><line x1="9" y1="12" x2="21" y2="12" /><line x1="6" y1="18" x2="21" y2="18" />
        </svg>
      </button>
      <button type="button" onClick={() => editor.chain().focus().setTextAlign('justify').run()} className={`editor-toolbar-btn ${editor.isActive({ textAlign: 'justify' }) ? 'is-active' : ''}`} title="Justificar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
          <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      <div className="editor-toolbar-divider" />

      {/* Grupo 5: Listas */}
      <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={`editor-toolbar-btn ${editor.isActive('bulletList') ? 'is-active' : ''}`} title="Lista com marcadores">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
          <line x1="9" y1="6" x2="20" y2="6" /><line x1="9" y1="12" x2="20" y2="12" /><line x1="9" y1="18" x2="20" y2="18" />
          <circle cx="5" cy="6" r="1.5" fill="currentColor" stroke="none" /><circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none" /><circle cx="5" cy="18" r="1.5" fill="currentColor" stroke="none" />
        </svg>
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={`editor-toolbar-btn ${editor.isActive('orderedList') ? 'is-active' : ''}`} title="Lista numerada">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
          <line x1="10" y1="6" x2="21" y2="6" /><line x1="10" y1="12" x2="21" y2="12" /><line x1="10" y1="18" x2="21" y2="18" />
          <text x="3" y="8" fontSize="8" fill="currentColor" stroke="none" fontWeight="700">1</text>
          <text x="3" y="14" fontSize="8" fill="currentColor" stroke="none" fontWeight="700">2</text>
          <text x="3" y="20" fontSize="8" fill="currentColor" stroke="none" fontWeight="700">3</text>
        </svg>
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleTaskList().run()} className={`editor-toolbar-btn ${editor.isActive('taskList') ? 'is-active' : ''}`} title="Lista de tarefas">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
          <rect x="3" y="3" width="6" height="6" rx="1" /><polyline points="5 6 6.5 7.5 9 4.5" /><line x1="13" y1="6" x2="21" y2="6" />
          <rect x="3" y="13" width="6" height="6" rx="1" /><line x1="13" y1="16" x2="21" y2="16" />
        </svg>
      </button>

      <div className="editor-toolbar-divider" />

      {/* Grupo 6: Inserir */}
      <div className="editor-toolbar-dropdown">
        <button
          type="button"
          className={`editor-toolbar-btn ${editor.isActive('link') ? 'is-active' : ''}`}
          onClick={() => setShowLink(!showLink)}
          title="Link"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
        </button>
        <LinkPopover editor={editor} show={showLink} onClose={() => setShowLink(false)} />
      </div>

      <div className="editor-toolbar-dropdown">
        <button type="button" className="editor-toolbar-btn" onClick={() => setShowImage(!showImage)} title="Imagem">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
            <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" />
          </svg>
        </button>
        <ImageInsertPopover editor={editor} show={showImage} onClose={() => setShowImage(false)} />
      </div>

      <div className="editor-toolbar-dropdown">
        <button type="button" className="editor-toolbar-btn" onClick={() => setShowTable(!showTable)} title="Tabela">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
            <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" /><line x1="9" y1="3" x2="9" y2="21" /><line x1="15" y1="3" x2="15" y2="21" />
          </svg>
        </button>
        <TablePickerPopover editor={editor} show={showTable} onClose={() => setShowTable(false)} />
      </div>

      <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={`editor-toolbar-btn ${editor.isActive('blockquote') ? 'is-active' : ''}`} title="Citacao">
        <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
          <path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179z" />
        </svg>
      </button>

      <button type="button" onClick={() => editor.chain().focus().setHorizontalRule().run()} className="editor-toolbar-btn" title="Linha horizontal">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
          <line x1="2" y1="12" x2="22" y2="12" />
        </svg>
      </button>

      <button type="button" onClick={() => editor.chain().focus().toggleCodeBlock().run()} className={`editor-toolbar-btn ${editor.isActive('codeBlock') ? 'is-active' : ''}`} title="Bloco de codigo">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
          <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
        </svg>
      </button>

      {/* Controles de tabela (aparecem quando estiver dentro de uma tabela) */}
      {editor.isActive('table') && (
        <>
          <div className="editor-toolbar-divider" />
          <button type="button" onClick={() => editor.chain().focus().addRowAfter().run()} className="editor-toolbar-btn" title="Adicionar linha">
            +Linha
          </button>
          <button type="button" onClick={() => editor.chain().focus().addColumnAfter().run()} className="editor-toolbar-btn" title="Adicionar coluna">
            +Col
          </button>
          <button type="button" onClick={() => editor.chain().focus().deleteRow().run()} className="editor-toolbar-btn editor-toolbar-btn-danger" title="Remover linha">
            -Linha
          </button>
          <button type="button" onClick={() => editor.chain().focus().deleteColumn().run()} className="editor-toolbar-btn editor-toolbar-btn-danger" title="Remover coluna">
            -Col
          </button>
          <button type="button" onClick={() => editor.chain().focus().deleteTable().run()} className="editor-toolbar-btn editor-toolbar-btn-danger" title="Excluir tabela">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <polyline points="3 6 5 6 21 6" /><path d="M19 6l-2 14H7L5 6" /><path d="M10 11v6M14 11v6" />
            </svg>
          </button>
        </>
      )}
    </div>
  )
}

// ---- Toolbar compacta (para CardModal) ----

const CompactToolbar = ({ editor }: { editor: Editor }) => (
  <div className="editor-toolbar">
    <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={`editor-toolbar-btn ${editor.isActive('heading', { level: 1 }) ? 'is-active' : ''}`} title="Titulo 1">
      H1
    </button>
    <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={`editor-toolbar-btn ${editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}`} title="Titulo 2">
      H2
    </button>
    <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={`editor-toolbar-btn ${editor.isActive('heading', { level: 3 }) ? 'is-active' : ''}`} title="Titulo 3">
      H3
    </button>

    <div className="editor-toolbar-divider" />

    <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={`editor-toolbar-btn ${editor.isActive('bold') ? 'is-active' : ''}`} title="Negrito (Ctrl+B)">
      <strong>B</strong>
    </button>
    <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={`editor-toolbar-btn ${editor.isActive('italic') ? 'is-active' : ''}`} title="Italico (Ctrl+I)">
      <em>I</em>
    </button>
    <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()} className={`editor-toolbar-btn ${editor.isActive('strike') ? 'is-active' : ''}`} title="Riscado">
      <s>S</s>
    </button>
    <button type="button" onClick={() => editor.chain().focus().toggleCode().run()} className={`editor-toolbar-btn ${editor.isActive('code') ? 'is-active' : ''}`} title="Codigo inline">
      {'</>'}
    </button>

    <div className="editor-toolbar-divider" />

    <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={`editor-toolbar-btn ${editor.isActive('bulletList') ? 'is-active' : ''}`} title="Lista">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
        <line x1="9" y1="6" x2="20" y2="6" /><line x1="9" y1="12" x2="20" y2="12" /><line x1="9" y1="18" x2="20" y2="18" />
        <circle cx="5" cy="6" r="1.5" fill="currentColor" stroke="none" /><circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none" /><circle cx="5" cy="18" r="1.5" fill="currentColor" stroke="none" />
      </svg>
    </button>
    <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={`editor-toolbar-btn ${editor.isActive('orderedList') ? 'is-active' : ''}`} title="Lista numerada">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
        <line x1="10" y1="6" x2="21" y2="6" /><line x1="10" y1="12" x2="21" y2="12" /><line x1="10" y1="18" x2="21" y2="18" />
        <text x="3" y="8" fontSize="8" fill="currentColor" stroke="none" fontWeight="700">1</text>
        <text x="3" y="14" fontSize="8" fill="currentColor" stroke="none" fontWeight="700">2</text>
        <text x="3" y="20" fontSize="8" fill="currentColor" stroke="none" fontWeight="700">3</text>
      </svg>
    </button>

    <div className="editor-toolbar-divider" />

    <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={`editor-toolbar-btn ${editor.isActive('blockquote') ? 'is-active' : ''}`} title="Citacao">
      <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
        <path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179z" />
      </svg>
    </button>
    <button type="button" onClick={() => editor.chain().focus().setHorizontalRule().run()} className="editor-toolbar-btn" title="Linha horizontal">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
        <line x1="2" y1="12" x2="22" y2="12" />
      </svg>
    </button>
    <button type="button" onClick={() => editor.chain().focus().toggleCodeBlock().run()} className={`editor-toolbar-btn ${editor.isActive('codeBlock') ? 'is-active' : ''}`} title="Bloco de codigo">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
        <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
      </svg>
    </button>
  </div>
)

// ---- Componente principal ----

export const WysiwygEditor = ({
  content,
  onChange,
  placeholder = 'Escreva uma descricao detalhada...',
  mode = 'compact',
}: WysiwygEditorProps) => {
  const [linkQuickMenu, setLinkQuickMenu] = useState<LinkQuickMenuState | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)
  const editorViewportRef = useRef<HTMLDivElement>(null)
  const linkMenuRef = useRef<HTMLDivElement>(null)
  const linkCopiedTimeoutRef = useRef<number | null>(null)

  const clearLinkCopiedTimeout = useCallback(() => {
    if (linkCopiedTimeoutRef.current !== null) {
      window.clearTimeout(linkCopiedTimeoutRef.current)
      linkCopiedTimeoutRef.current = null
    }
  }, [])

  const showLinkQuickMenu = useCallback((anchor: HTMLAnchorElement) => {
    const href = anchor.getAttribute('href')?.trim() ?? ''
    const viewport = editorViewportRef.current
    if (!href || !viewport) return

    const viewportRect = viewport.getBoundingClientRect()
    const anchorRect = anchor.getBoundingClientRect()
    const menuWidth = 92
    const menuHeight = 50

    let left = anchorRect.left - viewportRect.left
    left = Math.max(8, Math.min(left, viewport.clientWidth - menuWidth - 8))

    let top = anchorRect.bottom - viewportRect.top + 8
    if (top + menuHeight > viewport.clientHeight - 8) {
      top = Math.max(8, anchorRect.top - viewportRect.top - menuHeight - 8)
    }

    clearLinkCopiedTimeout()
    setLinkCopied(false)
    setLinkQuickMenu(prev => {
      if (prev && prev.href === href && prev.left === left && prev.top === top) {
        return prev
      }
      return { href, left, top }
    })
  }, [clearLinkCopiedTimeout])

  const editor = useEditor({
    extensions: getExtensions(mode, placeholder),
    content,
    onUpdate: ({ editor: ed }) => {
      requestAnimationFrame(() => {
        const html = ed.getHTML()
        onChange(html)
      })
    },
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none focus:outline-none',
      },
    },
  })

  useEffect(() => {
    if (!editor || mode !== 'full') return

    const editorRoot = editor.view.dom as HTMLElement
    const viewport = editorViewportRef.current
    if (!viewport) return

    const handleLinkInteraction = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      if (!target) return

      const anchor = target.closest('a[href]') as HTMLAnchorElement | null
      if (!anchor || !editorRoot.contains(anchor)) return

      if (event.type === 'click') {
        event.preventDefault()
        event.stopPropagation()
      }

      showLinkQuickMenu(anchor)
    }

    const handleOutsideMouseDown = (event: MouseEvent) => {
      const target = event.target as Node

      if (linkMenuRef.current?.contains(target)) return

      if (target instanceof HTMLElement) {
        const anchor = target.closest('a[href]')
        if (anchor && editorRoot.contains(anchor)) return
      }

      setLinkQuickMenu(null)
    }

    const handleScroll = () => setLinkQuickMenu(null)

    editorRoot.addEventListener('click', handleLinkInteraction)
    viewport.addEventListener('scroll', handleScroll)
    document.addEventListener('mousedown', handleOutsideMouseDown)

    return () => {
      editorRoot.removeEventListener('click', handleLinkInteraction)
      viewport.removeEventListener('scroll', handleScroll)
      document.removeEventListener('mousedown', handleOutsideMouseDown)
    }
  }, [editor, mode, showLinkQuickMenu])

  useEffect(() => {
    if (mode !== 'full') {
      setLinkQuickMenu(null)
    }
  }, [mode])

  useEffect(() => {
    return () => clearLinkCopiedTimeout()
  }, [clearLinkCopiedTimeout])

  const handleOpenLink = () => {
    if (!linkQuickMenu) return
    void openExternalLink(linkQuickMenu.href)
    setLinkQuickMenu(null)
  }

  const handleCopyLink = async () => {
    if (!linkQuickMenu) return

    const success = await copyTextToClipboard(linkQuickMenu.href)
    clearLinkCopiedTimeout()
    setLinkCopied(success)

    if (success) {
      linkCopiedTimeoutRef.current = window.setTimeout(() => {
        setLinkCopied(false)
        linkCopiedTimeoutRef.current = null
      }, 1200)
    }
  }

  // Sem useEffect de sync - o key prop no NotesView recria o editor ao trocar nota

  if (!editor) {
    return null
  }

  return (
    <div className="editor-container">
      {mode === 'full' ? (
        <FullToolbar editor={editor} />
      ) : (
        <CompactToolbar editor={editor} />
      )}
      <div ref={editorViewportRef} className="tiptap-editor">
        <EditorContent editor={editor} />
        {mode === 'full' && linkQuickMenu && (
          <div
            ref={linkMenuRef}
            className="editor-link-hover-menu"
            style={{ left: `${linkQuickMenu.left}px`, top: `${linkQuickMenu.top}px` }}
          >
            <button
              type="button"
              className="editor-link-hover-menu-btn editor-link-hover-menu-btn-icon"
              onMouseDown={e => e.preventDefault()}
              onClick={handleOpenLink}
              title="Abrir link"
              aria-label="Abrir link"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" aria-hidden="true">
                <path d="M14 3h7v7" />
                <path d="M10 14 21 3" />
                <path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" />
              </svg>
            </button>
            <button
              type="button"
              className={`editor-link-hover-menu-btn editor-link-hover-menu-btn-icon ${linkCopied ? 'is-copied' : ''}`}
              onMouseDown={e => e.preventDefault()}
              onClick={() => { void handleCopyLink() }}
              title={linkCopied ? 'Copiado' : 'Copiar link'}
              aria-label={linkCopied ? 'Copiado' : 'Copiar link'}
            >
              {linkCopied ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" aria-hidden="true">
                  <rect x="9" y="9" width="13" height="13" rx="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
