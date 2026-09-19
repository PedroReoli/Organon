import { useEditor, EditorContent } from '@tiptap/react'
import type { Editor } from '@tiptap/react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { copyTextToClipboard, getShortcutTitleFromUrl, normalizeUrl, openExternalLink } from '@utils'
import { markdownToHtml } from '../notes/utils'
import { sanitizePastedHtml, looksLikeMarkdownPaste, looksLikeTabularData, tabularTextToHtmlTable } from './sanitize'
import { getExtensions } from './getExtensions'
import { SLASH_COMMANDS, TOOLBOX_SLASH_COMMAND } from './slashCommands'
import type { SlashCommand } from '@types'
import { FullToolbar } from './toolbars/FullToolbar'
import { CompactToolbar } from './toolbars/CompactToolbar'
import { SlashCommandMenu, type SlashMenuState } from './menus/SlashCommandMenu'
import { TableFloatingMenu } from './menus/TableFloatingMenu'
import { EditorBubbleMenu } from './menus/EditorBubbleMenu'
import { AiAssistantMenu } from './menus/AiAssistantMenu'

export interface WysiwygEditorProps {
  content: string
  onChange: (html: string) => void
  placeholder?: string
  mode?: 'compact' | 'full'
  currentNoteId?: string
  readOnly?: boolean
  floatingToolbox?: boolean
  disableImages?: boolean
  noteTitlesById?: Record<string, string>
  onNoteMentionClick?: (noteId: string) => void
}

interface LinkQuickMenuState {
  href: string
  left: number
  top: number
}

interface LinkPasteMenuState {
  url: string
  left: number
  top: number
  from: number
  to: number
}

interface FloatingToolboxPosition {
  left: number
  top: number
}

export const WysiwygEditor = ({
  content,
  onChange,
  placeholder = 'Escreva uma descricao detalhada...',
  mode = 'compact',
  currentNoteId,
  readOnly = false,
  floatingToolbox = false,
  disableImages = false,
  noteTitlesById,
  onNoteMentionClick,
}: WysiwygEditorProps) => {
  const [linkQuickMenu, setLinkQuickMenu] = useState<LinkQuickMenuState | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)
  const [_linkPasteMenu, setLinkPasteMenu] = useState<LinkPasteMenuState | null>(null)
  const [slashMenu, setSlashMenu] = useState<SlashMenuState | null>(null)
  const [isAiMenuOpen, setIsAiMenuOpen] = useState(false)
  const [toolboxVisible, setToolboxVisible] = useState(false)
  const [toolboxCollapsed, setToolboxCollapsed] = useState(false)
  const [toolboxPosition, setToolboxPosition] = useState<FloatingToolboxPosition>({ left: 16, top: 16 })
  const editorContainerRef = useRef<HTMLDivElement>(null)
  const editorViewportRef = useRef<HTMLDivElement>(null)
  const floatingToolboxRef = useRef<HTMLDivElement>(null)
  const linkMenuRef = useRef<HTMLDivElement>(null)
  const linkPasteMenuRef = useRef<HTMLDivElement>(null)
  const linkCopiedTimeoutRef = useRef<number | null>(null)
  const slashMenuRef = useRef<SlashMenuState | null>(null)
  const editorRef = useRef<Editor | null>(null)
  const isApplyingExternalContentRef = useRef(false)
  const lastEmittedHtmlRef = useRef(content ?? '')
  const toolboxDragRef = useRef<{ pointerId: number; offsetX: number; offsetY: number } | null>(null)

  slashMenuRef.current = slashMenu

  const availableSlashCommands = useMemo(() => {
    const commands = floatingToolbox && mode === 'full'
      ? [TOOLBOX_SLASH_COMMAND, ...SLASH_COMMANDS]
      : SLASH_COMMANDS
    return disableImages ? commands.filter(command => command.id !== 'image') : commands
  }, [disableImages, floatingToolbox, mode])

  const clearLinkCopiedTimeout = useCallback(() => {
    if (linkCopiedTimeoutRef.current !== null) {
      window.clearTimeout(linkCopiedTimeoutRef.current)
      linkCopiedTimeoutRef.current = null
    }
  }, [])

  const clampToolboxPosition = useCallback((next: FloatingToolboxPosition): FloatingToolboxPosition => {
    const container = editorContainerRef.current
    if (!container) return next
    const box = floatingToolboxRef.current
    const boxWidth = box?.offsetWidth ?? (toolboxCollapsed ? 172 : 520)
    const boxHeight = box?.offsetHeight ?? (toolboxCollapsed ? 48 : 150)
    const maxLeft = Math.max(16, container.clientWidth - boxWidth - 16)
    const maxTop = Math.max(16, container.clientHeight - boxHeight - 16)
    return {
      left: Math.max(16, Math.min(next.left, maxLeft)),
      top: Math.max(16, Math.min(next.top, maxTop)),
    }
  }, [toolboxCollapsed])

  const openFloatingToolbox = useCallback(() => {
    if (!floatingToolbox) return
    setToolboxVisible(true)
    setToolboxCollapsed(false)
    setTimeout(() => setToolboxPosition(prev => clampToolboxPosition(prev)), 0)
  }, [clampToolboxPosition, floatingToolbox])

  const showLinkQuickMenu = useCallback((anchor: HTMLAnchorElement) => {
    const href = anchor.getAttribute('href')?.trim() ?? ''
    const viewport = editorViewportRef.current
    if (!href || !viewport) return
    const viewportRect = viewport.getBoundingClientRect()
    const anchorRect = anchor.getBoundingClientRect()
    const menuWidth = 320
    const menuHeight = 36

    // Horizontal: tenta alinhar com o link, mas não sai do viewport
    let left = anchorRect.left - viewportRect.left
    if (left + menuWidth > viewport.clientWidth - 8) {
      left = viewport.clientWidth - menuWidth - 8
    }
    left = Math.max(8, left)

    // Vertical: prefere abaixo, se não cabe vai acima
    let top = anchorRect.bottom - viewportRect.top + 8
    if (top + menuHeight > viewport.clientHeight - 8) {
      top = anchorRect.top - viewportRect.top - menuHeight - 8
    }
    top = Math.max(8, top)
    clearLinkCopiedTimeout()
    setLinkCopied(false)
    setLinkQuickMenu(prev => {
      if (prev && prev.href === href && prev.left === left && prev.top === top) return prev
      return { href, left, top }
    })
  }, [clearLinkCopiedTimeout])

  const getFilteredSlashItems = useCallback((query: string) => {
    if (!query) return availableSlashCommands
    const q = query.toLowerCase()
    return availableSlashCommands.filter(cmd =>
      cmd.label.toLowerCase().includes(q) || cmd.keywords.some(k => k.includes(q))
    )
  }, [availableSlashCommands])

  const handleToolboxHandlePointerDown = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    if (!floatingToolbox) return
    const container = editorContainerRef.current
    if (!container) return
    event.preventDefault()
    const rect = container.getBoundingClientRect()
    toolboxDragRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left - toolboxPosition.left,
      offsetY: event.clientY - rect.top - toolboxPosition.top,
    }
  }, [floatingToolbox, toolboxPosition.left, toolboxPosition.top])

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

  const insertImageFromFile = useCallback((file: File, editorInstance: Editor) => {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      const img = new window.Image()
      img.onload = () => {
        const MAX_W = 1200
        const MAX_H = 1200
        let { width, height } = img
        if (width > MAX_W || height > MAX_H) {
          const ratio = Math.min(MAX_W / width, MAX_H / height)
          width = Math.round(width * ratio)
          height = Math.round(height * ratio)
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        ctx.drawImage(img, 0, 0, width, height)
        const compressed = canvas.toDataURL('image/jpeg', 0.88)
        editorInstance.chain().focus().setImage({ src: compressed }).run()
      }
      img.src = dataUrl
    }
    reader.readAsDataURL(file)
  }, [])

  const editor = useEditor({
    extensions: getExtensions(mode, placeholder, noteTitlesById),
    content,
    editable: !readOnly,
    onUpdate: ({ editor: ed }) => {
      if (isApplyingExternalContentRef.current) return
      const html = ed.getHTML()
      lastEmittedHtmlRef.current = html
      onChange(html)

      if (mode !== 'full') return
      const { state } = ed
      const { selection } = state
      const { $from } = selection
      if ($from.parent.type.name !== 'paragraph') { setSlashMenu(null); return }
      const lineText = $from.parent.textContent
      if (lineText.startsWith('/') && $from.parentOffset >= 1) {
        const query = lineText.slice(1)
        const items = getFilteredSlashItems(query.toLowerCase())
        if (items.length === 0) { setSlashMenu(null); return }
        // Usa a posição exata do cursor para a caixa aparecer exatamente colada no /
        const coords = ed.view.coordsAtPos($from.pos)
        const menuEstimatedHeight = Math.min(320, items.length * 48 + 16)
        const menuWidth = 260

        // Horizontal: alinha exatamente com a barra
        let menuLeft = coords.left
        if (menuLeft + menuWidth > window.innerWidth - 8) {
          menuLeft = window.innerWidth - menuWidth - 8
        }
        if (menuLeft < 8) menuLeft = 8

        // Vertical: prefere abaixo da linha (cursor)
        let menuTop = coords.bottom + 4
        // Se nao cabe embaixo, vai pra cima sem tampar a linha
        if (menuTop + menuEstimatedHeight > window.innerHeight - 8) {
          menuTop = coords.top - menuEstimatedHeight - 4
        }
        // Clamp para nao sair da viewport
        if (menuTop < 8) menuTop = 8

        setSlashMenu(prev => ({
          open: true,
          query,
          top: menuTop,
          left: menuLeft,
          selectedIndex: prev?.query === query ? (prev?.selectedIndex ?? 0) : 0,
        }))
      } else {
        setSlashMenu(null)
      }
    },
    editorProps: {
      attributes: { class: 'prose prose-invert max-w-none focus:outline-none' },
      handlePaste: (_view, event) => {
        if (!(editorRef.current?.isEditable ?? true)) return true
        const items = Array.from(event.clipboardData?.items ?? [])
        const imageItem = items.find(item => item.type.startsWith('image/'))
        if (imageItem) {
          if (disableImages) { event.preventDefault(); return true }
          event.preventDefault()
          const file = imageItem.getAsFile()
          if (!file) return false
          const editorInstance = editorRef.current
          if (!editorInstance) return true
          insertImageFromFile(file, editorInstance)
          return true
        }

        const editorInstance = editorRef.current
        if (!editorInstance) return false
        const rawText = event.clipboardData?.getData('text/plain') ?? ''
        const rawHtml = event.clipboardData?.getData('text/html') ?? ''

        const isRichSemanticHtml = Boolean(
          rawHtml && /<(table|thead|tbody|tr|td|h[1-6]|ul|ol|li|img|blockquote)[\s>]/i.test(rawHtml)
        )

        if (looksLikeMarkdownPaste(rawText) && (!rawHtml || !isRichSemanticHtml)) {
          event.preventDefault()
          editorInstance.chain().focus().insertContentAt(
            { from: editorInstance.state.selection.from, to: editorInstance.state.selection.to },
            markdownToHtml(rawText),
          ).run()
          return true
        }

        if (rawHtml) {
          const sanitized = sanitizePastedHtml(rawHtml)
          if (sanitized) {
            event.preventDefault()
            editorInstance.chain().focus().insertContentAt(
              { from: editorInstance.state.selection.from, to: editorInstance.state.selection.to },
              sanitized,
            ).run()
            return true
          }
        }

        if (looksLikeTabularData(rawText)) {
          const tableHtml = tabularTextToHtmlTable(rawText)
          if (tableHtml) {
            event.preventDefault()
            editorInstance.chain().focus().insertContentAt(
              { from: editorInstance.state.selection.from, to: editorInstance.state.selection.to },
              tableHtml,
            ).run()
            return true
          }
        }

        if (looksLikeMarkdownPaste(rawText)) {
          event.preventDefault()
          editorInstance.chain().focus().insertContentAt(
            { from: editorInstance.state.selection.from, to: editorInstance.state.selection.to },
            markdownToHtml(rawText),
          ).run()
          return true
        }

        if (!floatingToolbox || mode !== 'full') return false
        const normalized = normalizeUrl(rawText.trim())
        if (!normalized) return false
        try { new URL(normalized) } catch { return false }

        event.preventDefault()
        const range = { from: editorInstance.state.selection.from, to: editorInstance.state.selection.to }
        const label = getShortcutTitleFromUrl(normalized) || normalized
        if (range.from !== range.to) {
          editorInstance.chain().focus().setTextSelection(range).setLink({ href: normalized }).run()
        } else {
          editorInstance.chain().focus()
            .insertContentAt(range, [{ type: 'text', text: label }])
            .setTextSelection({ from: range.from, to: range.from + label.length })
            .setLink({ href: normalized }).run()
        }
        return true
      },
      handleDrop: (_view, event) => {
        if (!(editorRef.current?.isEditable ?? true)) return true
        const files = Array.from(event.dataTransfer?.files ?? [])
        const imageFile = files.find(f => f.type.startsWith('image/'))
        if (!imageFile) return false
        if (disableImages) { event.preventDefault(); return true }
        event.preventDefault()
        const editorInstance = editorRef.current
        if (!editorInstance) return true
        insertImageFromFile(imageFile, editorInstance)
        return true
      },
      handleKeyDown: (_view, event) => {
        if (!(editorRef.current?.isEditable ?? true)) return false
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

  editorRef.current = editor ?? null

  // Sync subpage block titles
  useEffect(() => {
    if (!editor || !noteTitlesById) return
    const { state, view } = editor
    let tr = state.tr
    let changed = false
    state.doc.descendants((node, pos) => {
      if (node.type.name !== 'subpageBlock') return
      const noteId = typeof node.attrs.noteId === 'string' ? node.attrs.noteId : ''
      if (!noteId) return
      const nextTitle = noteTitlesById[noteId]?.trim()
      if (!nextTitle || nextTitle === node.attrs.noteTitle) return
      tr = tr.setNodeMarkup(pos, undefined, { ...node.attrs, noteTitle: nextTitle })
      changed = true
    })
    if (changed) view.dispatch(tr)
  }, [editor, noteTitlesById])

  useEffect(() => { if (editor) editor.setEditable(!readOnly) }, [editor, readOnly])

  // Mention click handler
  useEffect(() => {
    if (!editor || !onNoteMentionClick) return
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      const mention = target.closest('.mention')
      if (!mention) return
      const noteId = mention.getAttribute('data-id')
      if (noteId) { event.preventDefault(); onNoteMentionClick(noteId) }
    }
    const editorElement = editor.view.dom
    editorElement.addEventListener('click', handleClick)
    return () => editorElement.removeEventListener('click', handleClick)
  }, [editor, onNoteMentionClick])

  // Sync external content
  useEffect(() => {
    if (!editor) return
    const nextContent = content ?? ''
    if (lastEmittedHtmlRef.current === nextContent) return
    const currentHtml = editor.getHTML()
    if (currentHtml === nextContent) { lastEmittedHtmlRef.current = nextContent; return }
    isApplyingExternalContentRef.current = true
    editor.commands.setContent(nextContent, false)
    lastEmittedHtmlRef.current = nextContent
    isApplyingExternalContentRef.current = false
  }, [editor, content])

  // Custom events for external inserts
  useEffect(() => {
    if (!editor) return
    const handleInsert = (e: Event) => {
      const { text } = (e as CustomEvent<{ text: string }>).detail
      if (editor.isEditable) {
        editor.chain().focus().insertContent(text).run()
      }
    }
    document.addEventListener('wysiwyg-insert-content', handleInsert)
    return () => document.removeEventListener('wysiwyg-insert-content', handleInsert)
  }, [editor])

  // Floating toolbox events
  useEffect(() => {
    if (!floatingToolbox || mode !== 'full') return
    const handleOpenToolbox = () => openFloatingToolbox()
    document.addEventListener('slash-open-toolbox', handleOpenToolbox)
    return () => document.removeEventListener('slash-open-toolbox', handleOpenToolbox)
  }, [floatingToolbox, mode, openFloatingToolbox])

  useEffect(() => {
    if (!floatingToolbox || mode !== 'full') return
    const handlePointerMove = (event: PointerEvent) => {
      const drag = toolboxDragRef.current
      const container = editorContainerRef.current
      if (!drag || !container || drag.pointerId !== event.pointerId) return
      const rect = container.getBoundingClientRect()
      setToolboxPosition(clampToolboxPosition({
        left: event.clientX - rect.left - drag.offsetX,
        top: event.clientY - rect.top - drag.offsetY,
      }))
    }
    const handlePointerUp = (event: PointerEvent) => {
      const drag = toolboxDragRef.current
      if (drag && drag.pointerId === event.pointerId) toolboxDragRef.current = null
    }
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [clampToolboxPosition, floatingToolbox, mode])

  useEffect(() => {
    if (!floatingToolbox || mode !== 'full') return
    setToolboxPosition(prev => clampToolboxPosition(prev))
  }, [clampToolboxPosition, floatingToolbox, mode, toolboxCollapsed])

  // Link quick menu
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
      if (event.type === 'click') { event.preventDefault(); event.stopPropagation() }
      showLinkQuickMenu(anchor)
    }
    const handleOutsideMouseDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (linkMenuRef.current?.contains(target)) return
      if (linkPasteMenuRef.current?.contains(target)) return
      if (floatingToolboxRef.current?.contains(target)) return
      if (target instanceof HTMLElement) {
        const anchor = target.closest('a[href]')
        if (anchor && editorRoot.contains(anchor)) return
      }
      setLinkQuickMenu(null)
      setLinkPasteMenu(null)
    }
    const handleScroll = () => { setLinkQuickMenu(null); setLinkPasteMenu(null) }
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
    if (mode !== 'full') { setLinkQuickMenu(null); setLinkPasteMenu(null); setSlashMenu(null); setToolboxVisible(false) }
  }, [mode])

  useEffect(() => {
    setLinkQuickMenu(null); setLinkPasteMenu(null); setSlashMenu(null); setToolboxVisible(false)
  }, [currentNoteId])

  useEffect(() => { return () => clearLinkCopiedTimeout() }, [clearLinkCopiedTimeout])

  // Posicionamento inteligente do link hover menu
  useLayoutEffect(() => {
    const el = linkMenuRef.current
    const viewport = editorViewportRef.current
    if (!el || !linkQuickMenu || !viewport) return
    const rect = el.getBoundingClientRect()
    const viewportRect = viewport.getBoundingClientRect()
    let { left, top } = linkQuickMenu

    // Se sai pela direita do viewport
    if (viewportRect.left + left + rect.width > viewportRect.right - 8) {
      left = viewport.clientWidth - rect.width - 8
    }
    // Se sai pela esquerda
    if (left < 8) left = 8
    // Se sai por baixo
    if (viewportRect.top + top + rect.height > viewportRect.bottom - 8) {
      top = top - rect.height - 40
    }
    // Se sai por cima
    if (top < 8) top = 8

    if (left !== linkQuickMenu.left || top !== linkQuickMenu.top) {
      el.style.left = `${left}px`
      el.style.top = `${top}px`
    }
  }, [linkQuickMenu])

  // Subpage creation
  const subpageInsertPosRef = useRef<number | null>(null)
  useEffect(() => {
    if (!currentNoteId) return
    const handleSlash = () => {
      const editor = editorRef.current
      subpageInsertPosRef.current = editor ? editor.state.selection.from : null
      document.dispatchEvent(new CustomEvent('notes-create-subpage', { detail: { parentNoteId: currentNoteId } }))
    }
    const handleReady = (e: Event) => {
      const { noteId, noteTitle } = (e as CustomEvent<{ noteId: string; noteTitle: string }>).detail
      const editor = editorRef.current
      if (!editor) return
      const insertPos = subpageInsertPosRef.current
      if (insertPos == null) return
      subpageInsertPosRef.current = null
      editor.chain().focus().insertContentAt(insertPos, { type: 'subpageBlock', attrs: { noteId, noteTitle } }).run()
    }
    document.addEventListener('slash-create-subpage', handleSlash)
    document.addEventListener('notes-subpage-ready', handleReady)
    return () => {
      document.removeEventListener('slash-create-subpage', handleSlash)
      document.removeEventListener('notes-subpage-ready', handleReady)
    }
  }, [currentNoteId])

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

  if (!editor) return null

  return (
    <div ref={editorContainerRef} className={`editor-container${readOnly ? ' is-readonly' : ''}`}>
      {!readOnly && mode === 'full' && !floatingToolbox && (
        <FullToolbar editor={editor} disableImages={disableImages} />
      )}
      {!readOnly && mode === 'compact' && (
        <CompactToolbar editor={editor} />
      )}
      {!readOnly && mode === 'full' && (
        <>
          <EditorBubbleMenu editor={editor} onOpenAiMenu={() => setIsAiMenuOpen(true)} />
          <div className="sticky top-2 z-20 flex justify-center pointer-events-none">
            <div className="pointer-events-auto">
              <TableFloatingMenu editor={editor} />
            </div>
          </div>
        </>
      )}
      <div ref={editorViewportRef} className="tiptap-editor">
        <EditorContent editor={editor} />

        {mode === 'full' && linkQuickMenu && (
          <div ref={linkMenuRef} className="editor-link-hover-menu" style={{ left: `${linkQuickMenu.left}px`, top: `${linkQuickMenu.top}px` }}>
            <button type="button" className="editor-link-hover-menu-btn editor-link-hover-menu-btn-icon" onMouseDown={e => e.preventDefault()} onClick={handleOpenLink} title="Abrir link" aria-label="Abrir link">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" aria-hidden="true"><path d="M14 3h7v7" /><path d="M10 14 21 3" /><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" /></svg>
            </button>
            <button type="button" className={`editor-link-hover-menu-btn editor-link-hover-menu-btn-icon ${linkCopied ? 'is-copied' : ''}`} onMouseDown={e => e.preventDefault()} onClick={() => { void handleCopyLink() }} title={linkCopied ? 'Copiado' : 'Copiar link'}>
              {linkCopied ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><polyline points="20 6 9 17 4 12" /></svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
              )}
            </button>
            <div className="editor-link-hover-menu-divider" />
            <button type="button" className="editor-link-hover-menu-btn" onMouseDown={e => e.preventDefault()} onClick={() => { const ed = editorRef.current; if (!ed || !linkQuickMenu) return; ed.chain().focus().insertContent({ type: 'linkCard', attrs: { url: linkQuickMenu.href, display: 'bookmark' } }).run(); setLinkQuickMenu(null) }} title="Converter para bookmark">Bookmark</button>
            <button type="button" className="editor-link-hover-menu-btn" onMouseDown={e => e.preventDefault()} onClick={() => { const ed = editorRef.current; if (!ed || !linkQuickMenu) return; ed.chain().focus().insertContent({ type: 'linkCard', attrs: { url: linkQuickMenu.href, display: 'embed' } }).run(); setLinkQuickMenu(null) }} title="Converter para embed">Embed</button>
            <button type="button" className="editor-link-hover-menu-btn" onMouseDown={e => e.preventDefault()} onClick={() => { const ed = editorRef.current; if (!ed || !linkQuickMenu) return; ed.chain().focus().unsetLink().run(); setLinkQuickMenu(null) }} title="Remover link">Texto</button>
          </div>
        )}
      </div>

      <AiAssistantMenu
        isOpen={isAiMenuOpen}
        onClose={() => setIsAiMenuOpen(false)}
        editor={editor}
      />

      {mode === 'full' && slashMenu?.open && (
        <SlashCommandMenu
          menu={slashMenu}
          items={getFilteredSlashItems(slashMenu.query.toLowerCase())}
          onSelect={executeSlashCommand}
          onHover={index => setSlashMenu(prev => (prev ? { ...prev, selectedIndex: index } : prev))}
          onClose={() => setSlashMenu(null)}
        />
      )}

      {!readOnly && mode === 'full' && floatingToolbox && toolboxVisible && (
        <FullToolbar
          editor={editor}
          floating
          collapsed={toolboxCollapsed}
          disableImages={disableImages}
          position={toolboxPosition}
          toolboxRef={floatingToolboxRef}
          onToggleCollapsed={() => setToolboxCollapsed(prev => !prev)}
          onHandlePointerDown={handleToolboxHandlePointerDown}
          onClose={() => setToolboxVisible(false)}
        />
      )}
    </div>
  )
}
