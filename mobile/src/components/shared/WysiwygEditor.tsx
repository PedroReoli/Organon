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
  minHeight?: number
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
  | 'code'
  | 'divider'
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
  { id: 'code', icon: 'code', label: 'Codigo', description: 'Bloco de codigo', keywords: ['code', 'codigo', 'pre'] },
  { id: 'divider', icon: 'minus', label: 'Divisor', description: 'Linha horizontal', keywords: ['divider', 'divisor', 'hr', 'separador'] },
  { id: 'link', icon: 'link', label: 'Link', description: 'Inserir link', keywords: ['link', 'url', 'href'] },
]

const TOOLBAR_COMMAND_IDS: SlashCommandId[] = ['h1', 'bold', 'italic', 'quote', 'list', 'order', 'code', 'link']

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
  minHeight: number
}): string => {
  const {
    textColor,
    placeholderColor,
    selectionColor,
    codeBackground,
    borderColor,
    placeholder,
    minHeight,
  } = params

  const escapedPlaceholder = escapeHtml(placeholder)

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<style>
  html, body {
    margin: 0;
    padding: 0;
    background: transparent;
    color: ${textColor};
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }
  body {
    min-height: ${Math.max(80, minHeight)}px;
  }
  #editor {
    min-height: ${Math.max(80, minHeight)}px;
    padding: 12px;
    box-sizing: border-box;
    line-height: 1.5;
    font-size: 15px;
    outline: none;
    word-break: break-word;
    caret-color: ${selectionColor};
  }
  #editor.is-empty::before {
    content: "${escapedPlaceholder}";
    color: ${placeholderColor};
    pointer-events: none;
  }
  #editor p,
  #editor h1,
  #editor h2,
  #editor h3,
  #editor blockquote,
  #editor pre,
  #editor ul,
  #editor ol {
    margin: 0 0 8px 0;
  }
  #editor h1 { font-size: 1.55em; }
  #editor h2 { font-size: 1.3em; }
  #editor h3 { font-size: 1.15em; }
  #editor blockquote {
    border-left: 3px solid ${borderColor};
    padding-left: 10px;
    opacity: 0.92;
  }
  #editor pre {
    background: ${codeBackground};
    padding: 10px;
    border-radius: 8px;
    overflow-x: auto;
  }
  #editor code {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  }
  #editor hr {
    border: none;
    border-top: 1px solid ${borderColor};
    margin: 12px 0;
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
          .replace(/<br\s*\/?\s*>/gi, '')
          .replace(/&nbsp;/gi, '')
          .replace(/\s+/g, '')
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
        const text = probe.toString().replace(/\u00A0/g, ' ')

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
          case 'code': document.execCommand('formatBlock', false, 'PRE'); break
          case 'divider': document.execCommand('insertHorizontalRule', false); break
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
  minHeight = 220,
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
    minHeight,
  }), [minHeight, placeholder, theme.primary, theme.text])

  const s = StyleSheet.create({
    root: {
      borderWidth: 1,
      borderColor: `${theme.text}22`,
      borderRadius: 12,
      backgroundColor: theme.surface,
      overflow: 'hidden',
      marginTop: 6,
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: `${theme.text}14`,
      backgroundColor: theme.background,
    },
    topTitle: {
      color: `${theme.text}88`,
      fontSize: 12,
      fontWeight: '700',
    },
    toolbar: {
      borderBottomWidth: 1,
      borderBottomColor: `${theme.text}14`,
      backgroundColor: theme.background,
    },
    toolbarInner: {
      paddingHorizontal: 8,
      paddingVertical: 8,
      gap: 8,
      alignItems: 'center',
    },
    toolBtn: {
      width: 34,
      height: 34,
      borderRadius: 9,
      borderWidth: 1,
      borderColor: `${theme.text}2c`,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.surface,
    },
    slashMenu: {
      borderBottomWidth: 1,
      borderBottomColor: `${theme.text}14`,
      backgroundColor: theme.surface,
      maxHeight: 220,
    },
    slashMenuHint: {
      color: `${theme.text}66`,
      fontSize: 11,
      fontWeight: '600',
      paddingHorizontal: 12,
      paddingTop: 8,
      paddingBottom: 4,
    },
    slashMenuList: {
      paddingHorizontal: 8,
      paddingBottom: 8,
    },
    slashItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 8,
      paddingVertical: 8,
      borderRadius: 8,
    },
    slashItemIconWrap: {
      width: 26,
      height: 26,
      borderRadius: 7,
      borderWidth: 1,
      borderColor: `${theme.text}1e`,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.background,
    },
    slashItemText: {
      flex: 1,
      minWidth: 0,
    },
    slashItemLabel: {
      color: theme.text,
      fontSize: 13,
      fontWeight: '600',
    },
    slashItemDesc: {
      color: `${theme.text}70`,
      fontSize: 11,
      marginTop: 1,
    },
    editorSurface: {
      minHeight,
      backgroundColor: theme.surface,
    },
  })

  return (
    <View style={s.root}>
      <View style={s.topBar}>
        <Text style={s.topTitle}>Editor</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.toolbar} contentContainerStyle={s.toolbarInner}>
        {toolbarCommands.map(command => (
          <TouchableOpacity
            key={command.id}
            style={s.toolBtn}
            onPress={() => runCommand(command, false)}
            accessibilityLabel={command.label}
          >
            <Feather name={command.icon} size={15} color={`${theme.text}d0`} />
          </TouchableOpacity>
        ))}
      </ScrollView>

      {slashQuery !== null && filteredSlashCommands.length > 0 ? (
        <View style={s.slashMenu}>
          <Text style={s.slashMenuHint}>Comandos com /</Text>
          <ScrollView style={s.slashMenuList} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
            {filteredSlashCommands.map(command => (
              <TouchableOpacity
                key={command.id}
                style={s.slashItem}
                onPress={() => runCommand(command, true)}
                accessibilityLabel={`Inserir ${command.label}`}
              >
                <View style={s.slashItemIconWrap}>
                  <Feather name={command.icon} size={14} color={`${theme.text}d0`} />
                </View>
                <View style={s.slashItemText}>
                  <Text style={s.slashItemLabel}>{command.label}</Text>
                  <Text style={s.slashItemDesc}>{command.description}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      ) : null}

      <View style={s.editorSurface}>
        <WebView
          ref={webViewRef}
          source={{ html: htmlDocument }}
          onMessage={onMessage}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
          hideKeyboardAccessoryView
          keyboardDisplayRequiresUserAction={false}
          scrollEnabled={false}
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
          style={{ backgroundColor: 'transparent' }}
        />
      </View>
    </View>
  )
}
