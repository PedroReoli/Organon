import React, { useState, useEffect, useRef, useCallback } from 'react'
import type { Editor } from '@tiptap/react'
import {
  Plus,
  GripVertical,
  Heading1,
  Heading2,
  Heading3,
  Type,
  List,
  CheckSquare,
  Quote,
  Code,
  Copy,
  Trash2,
  Info,
} from 'lucide-react'

interface BlockDragHandleProps {
  editor: Editor | null
  containerRef: React.RefObject<HTMLDivElement | null>
}

interface HandlePosition {
  top: number
  targetEl: HTMLElement
  pos: number
}

export const BlockDragHandle: React.FC<BlockDragHandleProps> = ({ editor, containerRef }) => {
  const [handlePos, setHandlePos] = useState<HandlePosition | null>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const handleRef = useRef<HTMLDivElement>(null)

  // Find top-level block under cursor
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!editor || !editor.view || isMenuOpen) return
      const editorDom = editor.view.dom
      if (!editorDom) return

      const clientX = e.clientX
      const clientY = e.clientY

      // Target element under mouse
      const element = document.elementFromPoint(clientX, clientY)
      if (!element || !editorDom.contains(element)) {
        // If hovering the handle itself, don't hide
        if (handleRef.current && handleRef.current.contains(element)) return
        setHandlePos(null)
        return
      }

      // Find direct child of editorDom (or top-level block)
      let current: HTMLElement | null = element as HTMLElement
      while (current && current.parentElement !== editorDom && current !== editorDom) {
        current = current.parentElement
      }

      if (!current || current === editorDom) {
        setHandlePos(null)
        return
      }

      const rect = current.getBoundingClientRect()
      const containerRect = containerRef.current?.getBoundingClientRect() || { top: 0, left: 0 }

      try {
        const pos = editor.view.posAtDOM(current, 0)
        setHandlePos({
          top: rect.top - containerRect.top,
          targetEl: current,
          pos: Math.max(0, pos),
        })
      } catch {
        // posAtDOM might fail for temporary decorative DOM nodes
      }
    },
    [editor, containerRef, isMenuOpen]
  )

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.addEventListener('mousemove', handleMouseMove)
    return () => container.removeEventListener('mousemove', handleMouseMove)
  }, [containerRef, handleMouseMove])

  // Close menu on outside click
  useEffect(() => {
    if (!isMenuOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        handleRef.current &&
        !handleRef.current.contains(e.target as Node)
      ) {
        setIsMenuOpen(false)
      }
    }
    window.addEventListener('mousedown', handleClickOutside)
    return () => window.removeEventListener('mousedown', handleClickOutside)
  }, [isMenuOpen])

  if (!editor || !handlePos) return null

  // Action: Insert empty paragraph below
  const handleInsertBelow = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const { pos } = handlePos
    const node = editor.view.state.doc.nodeAt(pos)
    const insertPos = pos + (node ? node.nodeSize : 0)

    editor
      .chain()
      .focus()
      .insertContentAt(insertPos, { type: 'paragraph' })
      .setTextSelection(insertPos + 1)
      .run()

    setIsMenuOpen(false)
  }

  // Action: Select and Transform or Delete
  const handleAction = (actionKey: string) => {
    const { pos } = handlePos
    const node = editor.view.state.doc.nodeAt(pos)
    if (!node) return

    editor.chain().focus().setNodeSelection(pos).run()

    switch (actionKey) {
      case 'p':
        editor.chain().focus().setParagraph().run()
        break
      case 'h1':
        editor.chain().focus().toggleHeading({ level: 1 }).run()
        break
      case 'h2':
        editor.chain().focus().toggleHeading({ level: 2 }).run()
        break
      case 'h3':
        editor.chain().focus().toggleHeading({ level: 3 }).run()
        break
      case 'bullet':
        editor.chain().focus().toggleBulletList().run()
        break
      case 'ordered':
        editor.chain().focus().toggleOrderedList().run()
        break
      case 'todo':
        editor.chain().focus().toggleTaskList().run()
        break
      case 'quote':
        editor.chain().focus().toggleBlockquote().run()
        break
      case 'code':
        editor.chain().focus().toggleCodeBlock().run()
        break
      case 'callout':
        ;(editor.chain().focus() as any).setCallout({ type: 'note' }).run()
        break
      case 'duplicate': {
        const nodeJson = node.toJSON()
        const endPos = pos + node.nodeSize
        editor.chain().focus().insertContentAt(endPos, nodeJson).run()
        break
      }
      case 'delete': {
        editor.chain().focus().deleteRange({ from: pos, to: pos + node.nodeSize }).run()
        break
      }
    }

    setIsMenuOpen(false)
    setHandlePos(null)
  }

  return (
    <div
      ref={handleRef}
      style={{
        top: `${handlePos.top}px`,
        transform: 'translateX(-100%)',
      }}
      className="absolute left-1 flex items-center gap-0.5 pr-2 z-30 transition-transform duration-75 select-none"
    >
      {/* Botão + para inserir bloco abaixo */}
      <button
        type="button"
        onClick={handleInsertBelow}
        title="Inserir bloco abaixo"
        className="w-5 h-5 rounded flex items-center justify-center text-slate-500 hover:text-slate-200 hover:bg-white/10 transition-colors cursor-pointer"
      >
        <Plus size={13} strokeWidth={2.5} />
      </button>

      {/* Botão ⋮⋮ para abrir menu do bloco */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setIsMenuOpen((prev) => !prev)
        }}
        title="Opções do bloco (Clique para transformar / duplicar)"
        className={`w-5 h-5 rounded flex items-center justify-center transition-colors cursor-pointer ${
          isMenuOpen
            ? 'bg-[var(--color-primary)] text-white'
            : 'text-slate-500 hover:text-slate-200 hover:bg-white/10'
        }`}
      >
        <GripVertical size={13} strokeWidth={2.5} />
      </button>

      {/* Popover Menu do Bloco */}
      {isMenuOpen && (
        <div
          ref={menuRef}
          style={{
            background: 'var(--color-surface, #181f33)',
            borderColor: 'var(--color-border, rgba(255,255,255,0.12))',
            boxShadow: '0 16px 36px -8px rgba(0,0,0,0.5)',
          }}
          className="absolute left-6 top-0 w-52 rounded-xl border p-1 text-xs z-50 animate-in fade-in zoom-in-95 duration-100 shadow-2xl text-[var(--color-text)]"
        >
          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Transformar em
          </div>

          <div className="space-y-0.5">
            <button
              type="button"
              onClick={() => handleAction('p')}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/10 cursor-pointer text-left"
            >
              <Type size={13} className="text-slate-400" />
              <span>Texto</span>
            </button>
            <button
              type="button"
              onClick={() => handleAction('h1')}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/10 cursor-pointer text-left"
            >
              <Heading1 size={13} className="text-indigo-400" />
              <span>Título 1</span>
            </button>
            <button
              type="button"
              onClick={() => handleAction('h2')}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/10 cursor-pointer text-left"
            >
              <Heading2 size={13} className="text-indigo-400" />
              <span>Título 2</span>
            </button>
            <button
              type="button"
              onClick={() => handleAction('h3')}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/10 cursor-pointer text-left"
            >
              <Heading3 size={13} className="text-indigo-400" />
              <span>Título 3</span>
            </button>
            <button
              type="button"
              onClick={() => handleAction('todo')}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/10 cursor-pointer text-left"
            >
              <CheckSquare size={13} className="text-emerald-400" />
              <span>Lista de Tarefas</span>
            </button>
            <button
              type="button"
              onClick={() => handleAction('bullet')}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/10 cursor-pointer text-left"
            >
              <List size={13} className="text-amber-400" />
              <span>Marcadores</span>
            </button>
            <button
              type="button"
              onClick={() => handleAction('callout')}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/10 cursor-pointer text-left"
            >
              <Info size={13} className="text-blue-400" />
              <span>Callout / Destaque</span>
            </button>
            <button
              type="button"
              onClick={() => handleAction('quote')}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/10 cursor-pointer text-left"
            >
              <Quote size={13} className="text-purple-400" />
              <span>Citação</span>
            </button>
            <button
              type="button"
              onClick={() => handleAction('code')}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/10 cursor-pointer text-left"
            >
              <Code size={13} className="text-slate-400" />
              <span>Código</span>
            </button>
          </div>

          <div className="h-px bg-white/5 my-1" />

          <div className="space-y-0.5">
            <button
              type="button"
              onClick={() => handleAction('duplicate')}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/10 cursor-pointer text-left text-slate-300"
            >
              <Copy size={13} className="text-slate-400" />
              <span>Duplicar bloco</span>
            </button>
            <button
              type="button"
              onClick={() => handleAction('delete')}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-rose-500/15 text-rose-400 cursor-pointer text-left"
            >
              <Trash2 size={13} />
              <span>Excluir bloco</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
