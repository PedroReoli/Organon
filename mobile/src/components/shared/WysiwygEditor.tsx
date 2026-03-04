import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { WebView, type WebViewMessageEvent } from 'react-native-webview'
import { useTheme } from '../../hooks/useTheme'

interface WysiwygEditorProps {
  value: string
  onChangeText: (value: string) => void
  placeholder?: string
  minHeight?: number  // kept for backwards compat, ignored
  onBlur?: () => void
}

type SlashCommandId =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'paragraph'
  | 'bold'
  | 'italic'
  | 'quote'
  | 'list'
  | 'order'
  | 'todo'
  | 'code'
  | 'divider'
  | 'toggle'
  | 'password'
  | 'link'

interface SlashCommand {
  id: SlashCommandId
  icon: keyof typeof Feather.glyphMap
  label: string
  description: string
  keywords: string[]
}

interface EditorMessage {
  type: 'ready' | 'change' | 'slash' | 'blur'
  html?: string
  query?: string | null
}

const SLASH_COMMANDS: SlashCommand[] = [
  { id: 'h1', icon: 'type', label: 'Titulo 1', description: 'Cabecalho grande', keywords: ['h1', 'titulo', 'heading'] },
  { id: 'h2', icon: 'type', label: 'Titulo 2', description: 'Cabecalho medio', keywords: ['h2', 'titulo', 'heading'] },
  { id: 'h3', icon: 'type', label: 'Titulo 3', description: 'Cabecalho pequeno', keywords: ['h3', 'titulo', 'heading'] },
  { id: 'paragraph', icon: 'minus', label: 'Paragrafo', description: 'Texto normal', keywords: ['p', 'paragrafo', 'texto'] },
  { id: 'bold', icon: 'bold', label: 'Negrito', description: 'Destaque em negrito', keywords: ['bold', 'negrito', 'forte'] },
  { id: 'italic', icon: 'italic', label: 'Italico', description: 'Destaque em italico', keywords: ['italic', 'italico'] },
  { id: 'quote', icon: 'message-square', label: 'Citacao', description: 'Bloco de citacao', keywords: ['quote', 'citacao', 'blockquote'] },
  { id: 'list', icon: 'list', label: 'Lista', description: 'Lista com marcadores', keywords: ['list', 'lista', 'bullet', 'ul'] },
  { id: 'order', icon: 'list', label: 'Lista numerada', description: 'Lista ordenada', keywords: ['order', 'lista', 'numerada', 'ol'] },
  { id: 'todo', icon: 'check-square', label: 'Lista de tarefas', description: 'Checkboxes interativos', keywords: ['todo', 'task', 'check', 'checkbox', 'tarefa'] },
  { id: 'code', icon: 'code', label: 'Codigo', description: 'Bloco de codigo', keywords: ['code', 'codigo', 'pre'] },
  { id: 'divider', icon: 'minus', label: 'Divisor', description: 'Linha horizontal', keywords: ['divider', 'divisor', 'hr', 'separador'] },
  { id: 'toggle', icon: 'chevron-right', label: 'Bloco recolhivel', description: 'Bloco que expande e recolhe', keywords: ['toggle', 'recolhivel', 'collapsible', 'detalhe'] },
  { id: 'password', icon: 'lock', label: 'Senha / Oculto', description: 'Bloco mascarado', keywords: ['password', 'senha', 'oculto', 'secret', 'secreto'] },
  { id: 'link', icon: 'link', label: 'Link', description: 'Inserir link', keywords: ['link', 'url', 'href'] },
]

const TOOLBAR_COMMAND_IDS: SlashCommandId[] = ['bold', 'italic', 'h1', 'h2', 'quote', 'list', 'order', 'todo', 'code']

const normalizeSearchTerm = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;')

const inlineMarkdownToHtml = (value: string): string => {
  let out = escapeHtml(value)
  out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2">$1</a>')
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>')
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>')
  return out
}

const markdownToHtml = (markdown: string): string => {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const html: string[] = []
  let inCode = false
  let codeBuffer: string[] = []
  let listMode: 'ul' | 'ol' | null = null

  const closeList = () => {
    if (!listMode) return
    html.push(listMode === 'ul' ? '</ul>' : '</ol>')
    listMode = null
  }

  const flushCode = () => {
    if (!inCode) return
    html.push(`<pre><code>${escapeHtml(codeBuffer.join('\n'))}</code></pre>`)
    inCode = false
    codeBuffer = []
  }

  for (const rawLine of lines) {
    const line = rawLine ?? ''

    if (line.trim().startsWith('```')) {
      closeList()
      if (inCode) {
        flushCode()
      } else {
        inCode = true
        codeBuffer = []
      }
      continue
    }

    if (inCode) {
      codeBuffer.push(line)
      continue
    }

    if (!line.trim()) {
      closeList()
      html.push('<p><br></p>')
      continue
    }

    if (/^###\s+/.test(line)) {
      closeList()
      html.push(`<h3>${inlineMarkdownToHtml(line.replace(/^###\s+/, ''))}</h3>`)
      continue
    }

    if (/^##\s+/.test(line)) {
      closeList()
      html.push(`<h2>${inlineMarkdownToHtml(line.replace(/^##\s+/, ''))}</h2>`)
      continue
    }

    if (/^#\s+/.test(line)) {
      closeList()
      html.push(`<h1>${inlineMarkdownToHtml(line.replace(/^#\s+/, ''))}</h1>`)
      continue
    }

    if (/^>\s+/.test(line)) {
      closeList()
      html.push(`<blockquote><p>${inlineMarkdownToHtml(line.replace(/^>\s+/, ''))}</p></blockquote>`)
      continue
    }

    const ordered = line.match(/^(\d+)\.\s+(.*)$/)
    if (ordered) {
      if (listMode !== 'ol') {
        closeList()
        html.push('<ol>')
        listMode = 'ol'
      }
      html.push(`<li>${inlineMarkdownToHtml(ordered[2] ?? '')}</li>`)
      continue
    }

    if (/^[-*]\s+/.test(line)) {
      if (listMode !== 'ul') {
        closeList()
        html.push('<ul>')
        listMode = 'ul'
      }
      html.push(`<li>${inlineMarkdownToHtml(line.replace(/^[-*]\s+/, ''))}</li>`)
      continue
    }

    if (/^---+$/.test(line.trim())) {
      closeList()
      html.push('<hr />')
      continue
    }

    closeList()
    html.push(`<p>${inlineMarkdownToHtml(line)}</p>`)
  }

  if (inCode) flushCode()
  closeList()

  const result = html.join('')
  return result.trim() ? result : '<p><br></p>'
}

const normalizeIncomingToHtml = (value: string): string => {
  const trimmed = value.trim()
  if (!trimmed) return '<p><br></p>'
  if (/<\/?[a-z][^>]*>/i.test(trimmed)) return value
  return markdownToHtml(value)
}

const createEditorHtmlDocument = (params: {
  textColor: string
  placeholderColor: string
  selectionColor: string
  codeBackground: string
  borderColor: string
  placeholder: string
}): string => {
  const {
    textColor,
    placeholderColor,
    selectionColor,
    codeBackground,
    borderColor,
    placeholder,
  } = params

  const escapedPlaceholder = escapeHtml(placeholder)

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<style>
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    background: transparent;
    color: ${textColor};
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    height: 100%;
  }
  #editor {
    min-height: 100%;
    padding: 16px;
    line-height: 1.6;
    font-size: 16px;
    outline: none;
    word-break: break-word;
    caret-color: ${selectionColor};
  }
  #editor.is-empty::before {
    content: "${escapedPlaceholder}";
    color: ${placeholderColor};
    pointer-events: none;
    position: absolute;
  }
  #editor p,
  #editor h1,
  #editor h2,
  #editor h3,
  #editor blockquote,
  #editor pre,
  #editor ul,
  #editor ol {
    margin: 0 0 10px 0;
  }
  #editor h1 { font-size: 1.7em; font-weight: 700; }
  #editor h2 { font-size: 1.35em; font-weight: 600; }
  #editor h3 { font-size: 1.15em; font-weight: 600; }
  #editor blockquote {
    border-left: 3px solid ${selectionColor};
    padding-left: 12px;
    opacity: 0.85;
    margin-left: 0;
  }
  #editor pre {
    background: ${codeBackground};
    padding: 12px;
    border-radius: 8px;
    overflow-x: auto;
  }
  #editor code {
    font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
    font-size: 0.9em;
  }
  #editor p code {
    background: ${codeBackground};
    padding: 1px 5px;
    border-radius: 4px;
  }
  #editor hr {
    border: none;
    border-top: 1px solid ${borderColor};
    margin: 14px 0;
  }
  #editor ul, #editor ol { padding-left: 22px; }
  #editor li { margin-bottom: 4px; }
  #editor a { color: ${selectionColor}; }
  .todo-item {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    margin: 4px 0;
  }
  .todo-item input[type="checkbox"] {
    margin-top: 3px;
    flex-shrink: 0;
    width: 16px;
    height: 16px;
    cursor: pointer;
    accent-color: ${selectionColor};
  }
  .todo-item span {
    flex: 1;
    outline: none;
  }
  .toggle-block {
    border: 1px solid ${borderColor};
    border-radius: 8px;
    margin: 6px 0;
    overflow: hidden;
  }
  .toggle-summary {
    padding: 10px 14px;
    cursor: pointer;
    font-weight: 600;
    background: ${codeBackground};
    list-style: none;
    outline: none;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .toggle-summary::marker { display: none; }
  .toggle-block[open] .toggle-summary {
    border-bottom: 1px solid ${borderColor};
  }
  .toggle-block > p, .toggle-block > div {
    padding: 10px 14px;
    margin: 0;
  }
  [data-type="password-block"] {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    border-radius: 8px;
    background: ${codeBackground};
    margin: 6px 0;
    border: 1px solid ${borderColor};
  }
</style>
</head>
<body>
  <div id="editor" contenteditable="true" spellcheck="true"></div>
  <script>
    (function () {
      const editor = document.getElementById('editor')
      const blockTags = new Set(['P', 'DIV', 'LI', 'BLOCKQUOTE', 'H1', 'H2', 'H3', 'PRE'])
      let suppress = false

      const post = (payload) => {
        if (!window.ReactNativeWebView || !window.ReactNativeWebView.postMessage) return
        window.ReactNativeWebView.postMessage(JSON.stringify(payload))
      }

      const closestBlock = (node) => {
        let current = node && node.nodeType === 3 ? node.parentNode : node
        while (current && current !== editor) {
          if (current.nodeType === 1 && blockTags.has(current.tagName)) return current
          current = current.parentNode
        }
        return editor
      }

      const isBlankHtml = (html) => {
        const plain = html
          .replace(/<br\\s*\\/?>\\s*/gi, '')
          .replace(/&nbsp;/gi, '')
          .replace(/\\s+/g, '')
          .replace(/<[^>]+>/g, '')
          .trim()
        return plain.length === 0
      }

      const syncEmptyState = () => {
        editor.classList.toggle('is-empty', isBlankHtml(editor.innerHTML || ''))
      }

      const getSlashState = () => {
        const sel = window.getSelection()
        if (!sel || !sel.rangeCount || !sel.isCollapsed) return null
        const range = sel.getRangeAt(0)
        if (!editor.contains(range.endContainer)) return null

        const block = closestBlock(range.endContainer)
        const probe = range.cloneRange()
        probe.setStart(block, 0)
        const text = probe.toString().replace(/\\u00A0/g, ' ')

        if (!text.startsWith('/')) return null
        return { range: probe, query: text.slice(1) }
      }

      const postSlashState = () => {
        const state = getSlashState()
        post({ type: 'slash', query: state ? state.query : null })
      }

      const postChange = () => {
        if (suppress) return
        syncEmptyState()
        post({ type: 'change', html: editor.innerHTML })
        postSlashState()
      }

      const focusEnd = () => {
        const range = document.createRange()
        range.selectNodeContents(editor)
        range.collapse(false)
        const sel = window.getSelection()
        if (!sel) return
        sel.removeAllRanges()
        sel.addRange(range)
      }

      const setContent = (html, moveCaretToEnd) => {
        suppress = true
        editor.innerHTML = html && html.trim() ? html : '<p><br></p>'
        if (moveCaretToEnd) focusEnd()
        syncEmptyState()
        suppress = false
      }

      const insertTodoItem = () => {
        const sel = window.getSelection()
        if (!sel || !sel.rangeCount) return
        const range = sel.getRangeAt(0)
        const div = document.createElement('div')
        div.className = 'todo-item'
        div.setAttribute('contenteditable', 'false')
        const cb = document.createElement('input')
        cb.type = 'checkbox'
        cb.addEventListener('change', postChange)
        const span = document.createElement('span')
        span.setAttribute('contenteditable', 'true')
        span.textContent = '\\u200b'
        div.appendChild(cb)
        div.appendChild(span)
        range.deleteContents()
        range.insertNode(div)
        const p = document.createElement('p')
        p.innerHTML = '<br>'
        if (div.parentNode) div.parentNode.insertBefore(p, div.nextSibling)
        const r2 = document.createRange()
        r2.setStart(span, 0)
        r2.collapse(true)
        sel.removeAllRanges()
        sel.addRange(r2)
      }

      const insertToggleBlock = () => {
        const sel = window.getSelection()
        if (!sel || !sel.rangeCount) return
        const details = document.createElement('details')
        details.className = 'toggle-block'
        details.setAttribute('open', '')
        const summary = document.createElement('summary')
        summary.className = 'toggle-summary'
        summary.setAttribute('contenteditable', 'true')
        summary.textContent = 'Titulo do bloco'
        const p = document.createElement('p')
        p.innerHTML = '<br>'
        details.appendChild(summary)
        details.appendChild(p)
        const range = sel.getRangeAt(0)
        range.deleteContents()
        range.insertNode(details)
        const after = document.createElement('p')
        after.innerHTML = '<br>'
        if (details.parentNode) details.parentNode.insertBefore(after, details.nextSibling)
        const r2 = document.createRange()
        r2.setStart(p, 0)
        r2.collapse(true)
        sel.removeAllRanges()
        sel.addRange(r2)
      }

      const insertPasswordBlock = () => {
        const wrapper = document.createElement('div')
        wrapper.setAttribute('contenteditable', 'false')
        wrapper.setAttribute('data-type', 'password-block')
        const lock = document.createElement('span')
        lock.textContent = '\\uD83D\\uDD12'
        lock.style.fontSize = '14px'
        const masked = document.createElement('span')
        masked.setAttribute('data-masked', 'true')
        masked.setAttribute('data-value', '')
        masked.style.cssText = 'flex:1;letter-spacing:3px;font-size:16px;opacity:0.7;'
        masked.textContent = '\\u25CF\\u25CF\\u25CF\\u25CF\\u25CF\\u25CF\\u25CF\\u25CF'
        const btn = document.createElement('button')
        btn.type = 'button'
        btn.style.cssText = 'background:none;border:none;cursor:pointer;padding:4px;opacity:0.6;font-size:12px;'
        btn.textContent = '\\uD83D\\uDC41'
        btn.onclick = function() {
          const isRevealed = masked.getAttribute('data-masked') === 'false'
          if (isRevealed) {
            masked.setAttribute('data-masked', 'true')
            const val = masked.getAttribute('data-value') || ''
            masked.textContent = '\\u25CF'.repeat(Math.max(6, val.length || 8))
            masked.setAttribute('contenteditable', 'false')
            masked.style.letterSpacing = '3px'
          } else {
            masked.setAttribute('data-masked', 'false')
            masked.setAttribute('contenteditable', 'true')
            masked.textContent = masked.getAttribute('data-value') || ''
            masked.style.letterSpacing = 'normal'
          }
        }
        masked.addEventListener('input', function() {
          masked.setAttribute('data-value', masked.textContent || '')
          postChange()
        })
        wrapper.appendChild(lock)
        wrapper.appendChild(masked)
        wrapper.appendChild(btn)

        const sel = window.getSelection()
        if (sel && sel.rangeCount) {
          const range = sel.getRangeAt(0)
          range.deleteContents()
          range.insertNode(wrapper)
          const p = document.createElement('p')
          p.innerHTML = '<br>'
          if (wrapper.parentNode) wrapper.parentNode.insertBefore(p, wrapper.nextSibling)
        } else {
          editor.appendChild(wrapper)
        }
      }

      const exec = (command, payload) => {
        editor.focus()
        switch (command) {
          case 'h1': document.execCommand('formatBlock', false, 'H1'); break
          case 'h2': document.execCommand('formatBlock', false, 'H2'); break
          case 'h3': document.execCommand('formatBlock', false, 'H3'); break
          case 'paragraph': document.execCommand('formatBlock', false, 'P'); break
          case 'bold': document.execCommand('bold', false); break
          case 'italic': document.execCommand('italic', false); break
          case 'quote': document.execCommand('formatBlock', false, 'BLOCKQUOTE'); break
          case 'list': document.execCommand('insertUnorderedList', false); break
          case 'order': document.execCommand('insertOrderedList', false); break
          case 'todo': insertTodoItem(); break
          case 'code': document.execCommand('formatBlock', false, 'PRE'); break
          case 'divider': document.execCommand('insertHorizontalRule', false); break
          case 'toggle': insertToggleBlock(); break
          case 'password': insertPasswordBlock(); break
          case 'link': {
            const url = payload && payload.url ? payload.url : 'https://'
            document.execCommand('createLink', false, url)
            break
          }
          default: break
        }
        postChange()
      }

      const applySlash = (command, payload) => {
        const state = getSlashState()
        if (state) {
          state.range.deleteContents()
        }
        exec(command, payload)
      }

      window.__ORGANON_EDITOR__ = {
        setContent,
        exec,
        applySlash,
      }

      editor.addEventListener('input', postChange)
      editor.addEventListener('focus', postSlashState)
      editor.addEventListener('blur', () => {
        post({ type: 'blur' })
      })

      document.addEventListener('selectionchange', () => {
        const sel = window.getSelection()
        if (!sel || !sel.rangeCount) return
        const container = sel.anchorNode
        if (container && editor.contains(container)) {
          postSlashState()
        }
      })

      setContent('<p><br></p>', false)
      post({ type: 'ready' })
    })()
  </script>
</body>
</html>`
}

const commandToScriptPayload = (command: SlashCommand): string => {
  const payload = command.id === 'link' ? { url: 'https://' } : null
  return JSON.stringify(payload)
}

export function WysiwygEditor({
  value,
  onChangeText,
  placeholder = 'Digite aqui...',
  onBlur,
}: WysiwygEditorProps) {
  const theme = useTheme()
  const webViewRef = useRef<WebView>(null)
  const [isEditorReady, setIsEditorReady] = useState(false)
  const [slashQuery, setSlashQuery] = useState<string | null>(null)

  const normalizedIncomingHtml = useMemo(
    () => normalizeIncomingToHtml(value),
    [value],
  )
  const lastKnownHtmlRef = useRef<string>(normalizedIncomingHtml)

  const toolbarCommands = useMemo(
    () => TOOLBAR_COMMAND_IDS
      .map(id => SLASH_COMMANDS.find(cmd => cmd.id === id))
      .filter((cmd): cmd is SlashCommand => Boolean(cmd)),
    [],
  )

  const filteredSlashCommands = useMemo(() => {
    if (slashQuery === null) return []

    const query = normalizeSearchTerm(slashQuery)
    if (!query) return SLASH_COMMANDS

    return SLASH_COMMANDS.filter(command => {
      const label = normalizeSearchTerm(command.label)
      const description = normalizeSearchTerm(command.description)
      const keywords = command.keywords.map(keyword => normalizeSearchTerm(keyword))
      return (
        label.includes(query)
        || description.includes(query)
        || keywords.some(keyword => keyword.includes(query))
      )
    })
  }, [slashQuery])

  const injectScript = useCallback((jsCode: string) => {
    webViewRef.current?.injectJavaScript(`${jsCode};true;`)
  }, [])

  useEffect(() => {
    if (!isEditorReady) return
    if (normalizedIncomingHtml === lastKnownHtmlRef.current) return

    const htmlLiteral = JSON.stringify(normalizedIncomingHtml)
    injectScript(`window.__ORGANON_EDITOR__ && window.__ORGANON_EDITOR__.setContent(${htmlLiteral}, false)`)
    lastKnownHtmlRef.current = normalizedIncomingHtml
  }, [injectScript, isEditorReady, normalizedIncomingHtml])

  const runCommand = useCallback((command: SlashCommand, fromSlashMenu: boolean) => {
    if (!isEditorReady) return

    const payloadLiteral = commandToScriptPayload(command)
    if (fromSlashMenu) {
      injectScript(`window.__ORGANON_EDITOR__ && window.__ORGANON_EDITOR__.applySlash(${JSON.stringify(command.id)}, ${payloadLiteral})`)
      setSlashQuery(null)
      return
    }

    injectScript(`window.__ORGANON_EDITOR__ && window.__ORGANON_EDITOR__.exec(${JSON.stringify(command.id)}, ${payloadLiteral})`)
  }, [injectScript, isEditorReady])

  const onMessage = useCallback((event: WebViewMessageEvent) => {
    let data: EditorMessage | null = null
    try {
      data = JSON.parse(event.nativeEvent.data) as EditorMessage
    } catch {
      return
    }

    if (!data || !data.type) return

    if (data.type === 'ready') {
      setIsEditorReady(true)
      const htmlLiteral = JSON.stringify(normalizedIncomingHtml)
      injectScript(`window.__ORGANON_EDITOR__ && window.__ORGANON_EDITOR__.setContent(${htmlLiteral}, true)`)
      lastKnownHtmlRef.current = normalizedIncomingHtml
      return
    }

    if (data.type === 'change' && typeof data.html === 'string') {
      lastKnownHtmlRef.current = data.html
      onChangeText(data.html)
      return
    }

    if (data.type === 'slash') {
      setSlashQuery(typeof data.query === 'string' ? data.query : null)
      return
    }

    if (data.type === 'blur') {
      onBlur?.()
    }
  }, [injectScript, normalizedIncomingHtml, onBlur, onChangeText])

  const htmlDocument = useMemo(() => createEditorHtmlDocument({
    textColor: theme.text,
    placeholderColor: `${theme.text}66`,
    selectionColor: theme.primary,
    codeBackground: `${theme.text}10`,
    borderColor: `${theme.text}2b`,
    placeholder,
  }), [placeholder, theme.primary, theme.text])

  const s = useMemo(() => StyleSheet.create({
    toolbar: {
      flexShrink: 0,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: `${theme.text}20`,
      backgroundColor: theme.surface,
    },
    toolbarInner: {
      paddingHorizontal: 10,
      paddingVertical: 8,
      gap: 6,
      alignItems: 'center',
    },
    toolBtn: {
      width: 36,
      height: 36,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: `${theme.text}08`,
    },
    slashPanel: {
      flexShrink: 0,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: `${theme.text}20`,
      backgroundColor: theme.surface,
      maxHeight: 240,
    },
    slashHint: {
      color: `${theme.text}55`,
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      paddingHorizontal: 14,
      paddingTop: 10,
      paddingBottom: 4,
    },
    slashItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 12,
      paddingVertical: 9,
    },
    slashIconWrap: {
      width: 28,
      height: 28,
      borderRadius: 7,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: `${theme.text}0c`,
    },
    slashLabel: {
      color: theme.text,
      fontSize: 14,
      fontWeight: '600',
    },
    slashDesc: {
      color: `${theme.text}66`,
      fontSize: 12,
      marginTop: 1,
    },
  }), [theme])

  return (
    <View style={{ flex: 1, backgroundColor: theme.surface }}>
      {/* Editor WebView — fills all available space */}
      <WebView
        ref={webViewRef}
        source={{ html: htmlDocument }}
        onMessage={onMessage}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        hideKeyboardAccessoryView
        keyboardDisplayRequiresUserAction={false}
        scrollEnabled
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        style={{ flex: 1, backgroundColor: 'transparent' }}
      />

      {/* Slash command panel — appears above toolbar when user types / */}
      {slashQuery !== null && filteredSlashCommands.length > 0 && (
        <View style={s.slashPanel}>
          <Text style={s.slashHint}>Comandos</Text>
          <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled showsVerticalScrollIndicator={false}>
            {filteredSlashCommands.map(command => (
              <TouchableOpacity
                key={command.id}
                style={s.slashItem}
                onPress={() => runCommand(command, true)}
                activeOpacity={0.6}
              >
                <View style={s.slashIconWrap}>
                  <Feather name={command.icon} size={14} color={theme.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.slashLabel}>{command.label}</Text>
                  <Text style={s.slashDesc}>{command.description}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Formatting toolbar — anchored at bottom, stays above keyboard */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.toolbar}
        contentContainerStyle={s.toolbarInner}
        keyboardShouldPersistTaps="handled"
      >
        {toolbarCommands.map(command => (
          <TouchableOpacity
            key={command.id}
            style={s.toolBtn}
            onPress={() => runCommand(command, false)}
            accessibilityLabel={command.label}
            activeOpacity={0.6}
          >
            <Feather name={command.icon} size={16} color={theme.text} />
          </TouchableOpacity>
        ))}
        {/* Separator + slash hint */}
        <View style={{ width: StyleSheet.hairlineWidth, height: 20, backgroundColor: `${theme.text}30`, marginHorizontal: 4 }} />
        <View style={{ paddingHorizontal: 6, justifyContent: 'center' }}>
          <Text style={{ color: `${theme.text}55`, fontSize: 13, fontFamily: 'monospace' }}>/</Text>
        </View>
      </ScrollView>
    </View>
  )
}
