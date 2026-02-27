import { useEditor, EditorContent, NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from '@tiptap/react'
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
import { Extension, mergeAttributes } from '@tiptap/core'
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

// ---- Resizable Image Node View ----

const ResizableImageView = ({ node, updateAttributes, selected }: NodeViewProps) => {
  const src = node.attrs.src as string
  const alt = (node.attrs.alt as string | undefined) ?? ''
  const title = (node.attrs.title as string | undefined) ?? ''
  const width = node.attrs.width as number | null | undefined
  const [isResizing, setIsResizing] = useState(false)
  const startXRef = useRef(0)
  const startWRef = useRef(0)
  const imgRef = useRef<HTMLImageElement>(null)

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    startXRef.current = e.clientX
    startWRef.current = imgRef.current?.offsetWidth ?? (width ?? 200)
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

  return (
    <NodeViewWrapper as="span" className="resizable-image-wrapper" data-drag-handle="">
      <img
        ref={imgRef}
        src={src}
        alt={alt ?? ''}
        title={title ?? ''}
        className={`resizable-image ${selected || isResizing ? 'is-selected' : ''}`}
        style={{ width: width ? `${width}px` : undefined }}
        draggable={false}
      />
      {(selected || isResizing) && (
        <span
          className="resizable-image-handle"
          onMouseDown={handleResizeStart}
        />
      )}
    </NodeViewWrapper>
  )
}

const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: el => el.getAttribute('width') ? Number(el.getAttribute('width')) : null,
        renderHTML: attrs => (attrs.width ? { width: String(attrs.width) } : {}),
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
      ResizableImage.configure({ inline: false, allowBase64: true }),
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

// ---- Slash command menu ----

interface SlashCommand {
  id: string
  label: string
  description: string
  icon: JSX.Element
  keywords: string[]
  action: (editor: Editor) => void
}

const SLASH_COMMANDS: SlashCommand[] = [
  {
    id: 'h1',
    label: 'Título 1',
    description: 'Cabeçalho grande',
    keywords: ['h1', 'heading', 'titulo'],
    icon: <span style={{ fontWeight: 800, fontSize: 14 }}>H1</span>,
    action: ed => ed.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    id: 'h2',
    label: 'Título 2',
    description: 'Cabeçalho médio',
    keywords: ['h2', 'heading', 'titulo'],
    icon: <span style={{ fontWeight: 700, fontSize: 13 }}>H2</span>,
    action: ed => ed.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    id: 'h3',
    label: 'Título 3',
    description: 'Cabeçalho pequeno',
    keywords: ['h3', 'heading', 'titulo'],
    icon: <span style={{ fontWeight: 600, fontSize: 12 }}>H3</span>,
    action: ed => ed.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    id: 'paragraph',
    label: 'Parágrafo',
    description: 'Texto normal',
    keywords: ['p', 'paragraph', 'texto'],
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14">
        <path d="M3 3h6a3 3 0 0 1 0 6H7v4" />
        <line x1="5" y1="9" x2="5" y2="13" />
      </svg>
    ),
    action: ed => ed.chain().focus().setParagraph().run(),
  },
  {
    id: 'bullet',
    label: 'Lista com marcadores',
    description: 'Lista não ordenada',
    keywords: ['bullet', 'list', 'lista', 'ul'],
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14">
        <circle cx="3" cy="5" r="1.2" fill="currentColor" stroke="none" />
        <circle cx="3" cy="8.5" r="1.2" fill="currentColor" stroke="none" />
        <circle cx="3" cy="12" r="1.2" fill="currentColor" stroke="none" />
        <line x1="6" y1="5" x2="14" y2="5" />
        <line x1="6" y1="8.5" x2="14" y2="8.5" />
        <line x1="6" y1="12" x2="14" y2="12" />
      </svg>
    ),
    action: ed => ed.chain().focus().toggleBulletList().run(),
  },
  {
    id: 'ordered',
    label: 'Lista numerada',
    description: 'Lista ordenada',
    keywords: ['ordered', 'number', 'lista', 'ol'],
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14">
        <text x="1" y="6" fontSize="5" fill="currentColor" stroke="none" fontWeight="700">1.</text>
        <text x="1" y="10" fontSize="5" fill="currentColor" stroke="none" fontWeight="700">2.</text>
        <text x="1" y="14" fontSize="5" fill="currentColor" stroke="none" fontWeight="700">3.</text>
        <line x1="7" y1="5" x2="14" y2="5" />
        <line x1="7" y1="9" x2="14" y2="9" />
        <line x1="7" y1="13" x2="14" y2="13" />
      </svg>
    ),
    action: ed => ed.chain().focus().toggleOrderedList().run(),
  },
  {
    id: 'task',
    label: 'Lista de tarefas',
    description: 'Checkboxes interativos',
    keywords: ['task', 'todo', 'check', 'checkbox'],
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14">
        <rect x="2" y="3" width="5" height="5" rx="1" />
        <polyline points="3.5 5.5 5 7 7 4" />
        <line x1="9" y1="5.5" x2="14" y2="5.5" />
        <rect x="2" y="10" width="5" height="5" rx="1" />
        <line x1="9" y1="12.5" x2="14" y2="12.5" />
      </svg>
    ),
    action: ed => ed.chain().focus().toggleTaskList().run(),
  },
  {
    id: 'blockquote',
    label: 'Citação',
    description: 'Bloco de citação',
    keywords: ['quote', 'citacao', 'blockquote'],
    icon: (
      <svg viewBox="0 0 16 16" fill="currentColor" width="14" height="14">
        <path d="M3 7.5C3 5.6 4.4 4 6.5 3L7 4c-1.7.9-2 2.1-2 2.6.2-.1.5-.1.8-.1.9 0 1.7.7 1.7 1.8C7.5 9.4 6.7 10 5.7 10 4.3 10 3 9 3 7.5zM9 7.5C9 5.6 10.4 4 12.5 3L13 4c-1.7.9-2 2.1-2 2.6.2-.1.5-.1.8-.1.9 0 1.7.7 1.7 1.8 0 1.1-.8 1.7-1.8 1.7C10.3 10 9 9 9 7.5z" />
      </svg>
    ),
    action: ed => ed.chain().focus().toggleBlockquote().run(),
  },
  {
    id: 'code',
    label: 'Bloco de código',
    description: 'Código com syntax highlight',
    keywords: ['code', 'codigo', 'pre'],
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14">
        <polyline points="10.5 11.5 13.5 8 10.5 4.5" />
        <polyline points="5.5 4.5 2.5 8 5.5 11.5" />
      </svg>
    ),
    action: ed => ed.chain().focus().toggleCodeBlock().run(),
  },
  {
    id: 'table',
    label: 'Tabela',
    description: 'Grade de dados',
    keywords: ['table', 'tabela', 'grid'],
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14">
        <rect x="2" y="2" width="12" height="12" rx="1.5" />
        <line x1="2" y1="6.5" x2="14" y2="6.5" />
        <line x1="2" y1="11" x2="14" y2="11" />
        <line x1="7" y1="2" x2="7" y2="14" />
      </svg>
    ),
    action: ed => ed.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
  },
  {
    id: 'divider',
    label: 'Divisor',
    description: 'Linha horizontal',
    keywords: ['hr', 'divider', 'divisor', 'separador'],
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14">
        <line x1="2" y1="8" x2="14" y2="8" />
      </svg>
    ),
    action: ed => ed.chain().focus().setHorizontalRule().run(),
  },
  {
    id: 'image',
    label: 'Imagem',
    description: 'Inserir imagem',
    keywords: ['image', 'imagem', 'foto', 'img'],
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14">
        <rect x="2" y="2" width="12" height="12" rx="1.5" />
        <circle cx="6" cy="6" r="1.5" />
        <path d="m14 10-4-4L4 14" />
      </svg>
    ),
    action: (_ed) => {
      // Trigger image insert via a custom event
      document.dispatchEvent(new CustomEvent('slash-insert-image'))
    },
  },
  {
    id: 'link',
    label: 'Link',
    description: 'Inserir hyperlink',
    keywords: ['link', 'url', 'href'],
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14">
        <path d="M7 9a3 3 0 0 0 4.54.33l2-2a3 3 0 0 0-4.24-4.24L8.12 4.3" />
        <path d="M9 7a3 3 0 0 0-4.54-.33l-2 2a3 3 0 0 0 4.24 4.24L7.88 11.7" />
      </svg>
    ),
    action: (_ed) => {
      document.dispatchEvent(new CustomEvent('slash-insert-link'))
    },
  },
]

interface SlashMenuState {
  open: boolean
  query: string
  top: number
  left: number
  selectedIndex: number
}

const SlashCommandMenu = ({
  menu,
  onSelect,
  onClose,
}: {
  menu: SlashMenuState
  onSelect: (item: SlashCommand) => void
  onClose: () => void
}) => {
  const filteredItems = SLASH_COMMANDS.filter(cmd => {
    if (!menu.query) return true
    const q = menu.query.toLowerCase()
    return cmd.label.toLowerCase().includes(q) || cmd.keywords.some(k => k.includes(q))
  })

  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  // Scroll selected item into view
  useEffect(() => {
    const el = ref.current?.querySelector(`[data-index="${menu.selectedIndex}"]`) as HTMLElement | null
    el?.scrollIntoView({ block: 'nearest' })
  }, [menu.selectedIndex])

  if (!filteredItems.length) return null

  return (
    <div
      ref={ref}
      className="slash-menu"
      style={{ top: menu.top, left: menu.left }}
    >
      {filteredItems.map((item, idx) => (
        <button
          key={item.id}
          data-index={idx}
          className={`slash-menu-item ${idx === menu.selectedIndex ? 'selected' : ''}`}
          onMouseDown={e => { e.preventDefault(); onSelect(item) }}
          onMouseEnter={() => { /* handled via selectedIndex */ }}
        >
          <span className="slash-menu-item-icon">{item.icon}</span>
          <span className="slash-menu-item-text">
            <span className="slash-menu-item-label">{item.label}</span>
            <span className="slash-menu-item-desc">{item.description}</span>
          </span>
        </button>
      ))}
    </div>
  )
}

// ---- Popovers / Dropdowns ----

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

// ---- Image Editor Modal ----

interface ImageEditorModalProps {
  src: string
  onInsert: (processedSrc: string) => void
  onCancel: () => void
}

const ImageEditorModal = ({ src, onInsert, onCancel }: ImageEditorModalProps) => {
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
              <img
                ref={imgRef}
                src={src}
                className="image-editor-img"
                draggable={false}
                alt="preview"
              />
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
    // Reset input so the same file can be re-selected
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

// ---- Full toolbar ----

const FullToolbar = ({ editor }: { editor: Editor }) => {
  const [showHeading, setShowHeading] = useState(false)
  const [showTextColor, setShowTextColor] = useState(false)
  const [showHighlightColor, setShowHighlightColor] = useState(false)
  const [showLink, setShowLink] = useState(false)
  const [showTable, setShowTable] = useState(false)
  const [showImage, setShowImage] = useState(false)

  // React to external "open image" requests (from slash menu)
  useEffect(() => {
    const handler = () => setShowImage(true)
    document.addEventListener('slash-insert-image', handler)
    return () => document.removeEventListener('slash-insert-image', handler)
  }, [])

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

      {/* Grupo 3: Cores */}
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
      <button type="button" onClick={() => editor.chain().focus().setTextAlign('left').run()} className={`editor-toolbar-btn ${editor.isActive({ textAlign: 'left' }) ? 'is-active' : ''}`} title="Esquerda">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
          <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="15" y2="12" /><line x1="3" y1="18" x2="18" y2="18" />
        </svg>
      </button>
      <button type="button" onClick={() => editor.chain().focus().setTextAlign('center').run()} className={`editor-toolbar-btn ${editor.isActive({ textAlign: 'center' }) ? 'is-active' : ''}`} title="Centro">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
          <line x1="3" y1="6" x2="21" y2="6" /><line x1="6" y1="12" x2="18" y2="12" /><line x1="4" y1="18" x2="20" y2="18" />
        </svg>
      </button>
      <button type="button" onClick={() => editor.chain().focus().setTextAlign('right').run()} className={`editor-toolbar-btn ${editor.isActive({ textAlign: 'right' }) ? 'is-active' : ''}`} title="Direita">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
          <line x1="3" y1="6" x2="21" y2="6" /><line x1="9" y1="12" x2="21" y2="12" /><line x1="6" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      <div className="editor-toolbar-divider" />

      {/* Grupo 5: Listas */}
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

      <button type="button" onClick={() => editor.chain().focus().setHorizontalRule().run()} className="editor-toolbar-btn" title="Divisor">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
          <line x1="2" y1="12" x2="22" y2="12" />
        </svg>
      </button>

      <button type="button" onClick={() => editor.chain().focus().toggleCodeBlock().run()} className={`editor-toolbar-btn ${editor.isActive('codeBlock') ? 'is-active' : ''}`} title="Bloco de codigo">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
          <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
        </svg>
      </button>

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

// ---- Compact toolbar ----

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

// ---- Main component ----

export const WysiwygEditor = ({
  content,
  onChange,
  placeholder = 'Escreva uma descricao detalhada...',
  mode = 'compact',
}: WysiwygEditorProps) => {
  const [linkQuickMenu, setLinkQuickMenu] = useState<LinkQuickMenuState | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)
  const [slashMenu, setSlashMenu] = useState<SlashMenuState | null>(null)
  const editorViewportRef = useRef<HTMLDivElement>(null)
  const linkMenuRef = useRef<HTMLDivElement>(null)
  const linkCopiedTimeoutRef = useRef<number | null>(null)
  const slashMenuRef = useRef<SlashMenuState | null>(null)
  const editorRef = useRef<Editor | null>(null)

  // Keep slashMenuRef in sync with state
  slashMenuRef.current = slashMenu

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

  const executeSlashCommand = useCallback((item: SlashCommand) => {
    const editor = editorRef.current
    if (!editor) return

    const { state } = editor
    const { selection } = state
    const { $from } = selection
    const paraStart = $from.start()
    const cursorPos = selection.from

    if (cursorPos > paraStart) {
      editor.chain().focus().deleteRange({ from: paraStart, to: cursorPos }).run()
    }

    item.action(editor)
    setSlashMenu(null)
  }, [])

  const getFilteredSlashItems = (query: string) => {
    if (!query) return SLASH_COMMANDS
    const q = query.toLowerCase()
    return SLASH_COMMANDS.filter(cmd =>
      cmd.label.toLowerCase().includes(q) || cmd.keywords.some(k => k.includes(q))
    )
  }

  const editor = useEditor({
    extensions: getExtensions(mode, placeholder),
    content,
    onUpdate: ({ editor: ed }) => {
      requestAnimationFrame(() => {
        const html = ed.getHTML()
        onChange(html)

        if (mode !== 'full') return

        const { state } = ed
        const { selection } = state
        const { $from } = selection

        if ($from.parent.type.name !== 'paragraph') {
          setSlashMenu(null)
          return
        }

        const lineText = $from.parent.textContent
        if (lineText.startsWith('/') && $from.parentOffset >= 1) {
          const query = lineText.slice(1)
          const items = getFilteredSlashItems(query.toLowerCase())
          if (items.length === 0) {
            setSlashMenu(null)
            return
          }

          const coords = ed.view.coordsAtPos(selection.from)
          setSlashMenu(prev => ({
            open: true,
            query,
            top: coords.bottom + 8,
            left: Math.max(8, Math.min(coords.left, window.innerWidth - 248)),
            selectedIndex: prev?.query === query ? (prev?.selectedIndex ?? 0) : 0,
          }))
        } else {
          setSlashMenu(null)
        }
      })
    },
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none focus:outline-none',
      },
      handleKeyDown: (_view, event) => {
        const menu = slashMenuRef.current
        if (!menu?.open) return false

        const items = getFilteredSlashItems(menu.query.toLowerCase())
        if (!items.length) return false

        if (event.key === 'ArrowDown') {
          event.preventDefault()
          setSlashMenu(prev => prev ? { ...prev, selectedIndex: (prev.selectedIndex + 1) % items.length } : null)
          return true
        }
        if (event.key === 'ArrowUp') {
          event.preventDefault()
          setSlashMenu(prev => prev ? { ...prev, selectedIndex: (prev.selectedIndex - 1 + items.length) % items.length } : null)
          return true
        }
        if (event.key === 'Enter') {
          event.preventDefault()
          const item = items[menu.selectedIndex]
          if (item) executeSlashCommand(item)
          return true
        }
        if (event.key === 'Escape') {
          event.preventDefault()
          setSlashMenu(null)
          return true
        }
        return false
      },
    },
  })

  // Keep editorRef in sync
  editorRef.current = editor ?? null

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
      setSlashMenu(null)
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

        {/* Slash command menu */}
        {mode === 'full' && slashMenu?.open && (
          <SlashCommandMenu
            menu={slashMenu}
            onSelect={executeSlashCommand}
            onClose={() => setSlashMenu(null)}
          />
        )}

        {/* Link quick menu */}
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
