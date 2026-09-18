import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import {
  AiConfig,
  ChatbotProps,
  Message,
  NoteContext,
  PendingAction,
  PROVIDER_PRESETS,
} from './chatbot/chatbot.types'
import { ChatbotActionCard } from './chatbot/ChatbotActionCard'
import { ChatbotSettingsModal } from './chatbot/ChatbotSettingsModal'
import { ChatMessageItem } from './chatbot/ChatMessageItem'
import { calculateSimilarity, extractSnippet } from './chatbot/diffUtils'
import { generateId, parseLocalIntent } from './chatbot/intentParser'
import {
  CONTEXT_TEMPLATES,
  SUGGESTIONS_BY_CONTEXT,
  Icons,
  TypingIndicator,
} from './chatbot/chatbot.constants'
import {
  loadAiConfig,
  saveAiConfig,
  loadHistory,
  saveHistory,
} from './chatbot/chatbotStorage'
import { useChatbotVoice } from './chatbot/useChatbotVoice'

export type { AiConfig, PendingAction } from './chatbot/chatbot.types'

export const Chatbot: React.FC<ChatbotProps> = ({
  notes = [],
  folders = [],
  cards = [],
  screenContext,
  onApplyNote,
  onNavigateToNote,
  onCreateNote,
  onAddFolder,
  onUpdateFolder,
  onUpdateNote,
  isOpen: externalIsOpen,
  onClose,
  hideFloatingTrigger = false,
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false)
  const isChatOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen
  const setIsOpen = (val: boolean | ((prev: boolean) => boolean)) => {
    const nextVal = typeof val === 'function' ? val(isChatOpen) : val
    if (!nextVal && onClose) onClose()
    setInternalIsOpen(nextVal)
  }
  const [messages, setMessages] = useState<Message[]>(() => loadHistory())
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Config do Assistente & Modal
  const [aiConfig, setAiConfig] = useState<AiConfig>(() => loadAiConfig())
  const [showAiSettings, setShowAiSettings] = useState(false)
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const inputClearedRef = useRef(false)

  const { isListening, startListening, stopListening } = useChatbotVoice({
    onTranscript: (text) => setInputValue((prev) => prev + text),
    onError: (err) => setError(err),
  })

  // Get current context
  const currentContext = screenContext?.screen || 'general'
  const contextDescription = CONTEXT_TEMPLATES[currentContext] || CONTEXT_TEMPLATES.general
  const suggestions = SUGGESTIONS_BY_CONTEXT[currentContext] || SUGGESTIONS_BY_CONTEXT.general

  // Build system prompt with context
  const systemPrompt = useMemo(() => {
    let prompt = contextDescription

    prompt += `\n\nInstruções Importantes de Orquestração & Comandos no Organon:
- Ao receber solicitações do usuário para criar conteúdo, criar pastas, reorganizar notas ou alterar hubs, inclua OBRIGATORIAMENTE uma das tags de ação abaixo no final da sua resposta:

1. Criar Nota:
[ACTION:CREATE_NOTE]{"title":"Título da Nota","content":"Conteúdo completo em Markdown","folderId":"id_opcional_da_pasta"}[/ACTION]

2. Criar Pasta:
[ACTION:CREATE_FOLDER]{"name":"Nome Da Pasta","parentId":"id_opcional_da_pasta_pai"}[/ACTION]

3. Mover Nota para uma Pasta:
[ACTION:MOVE_NOTE]{"noteId":"id_da_nota","folderId":"id_da_pasta"}[/ACTION]

4. Alternar Modo Hub Central de uma Pasta (Ativar/Desativar):
[ACTION:TOGGLE_HUB]{"folderId":"id_da_pasta","isHome":true}[/ACTION]

5. Renomear Pasta:
[ACTION:RENAME_FOLDER]{"folderId":"id_da_pasta","newName":"Novo Nome"}[/ACTION]

Regras para manipulação:
- Use sempre os IDs exatos das notas e pastas fornecidos no contexto abaixo.
- Ao criar notas ou pastas, escreva uma mensagem amigável explicando o que será feito. O aplicativo exibirá um Card de Confirmação Interativo no Chat.`

    if (folders.length > 0) {
      prompt += `\n\nEstrutura de Pastas Existente (${folders.length} pastas):\n`
      prompt += folders.map(f => `- Pasta "${f.name}" (ID: "${f.id}"${f.parentId ? `, ParentID: "${f.parentId}"` : ''}${f.isHome ? ', [HUB CENTRAL]' : ''})`).join('\n')
    }

    if (notes.length > 0) {
      prompt += `\n\nNotas Existentes (${notes.length} notas):\n`
      prompt += notes.slice(0, 30).map(n => `- Nota "${n.title}" (ID: "${n.id}"${n.folderId ? `, FolderID: "${n.folderId}"` : ''})`).join('\n')
    }
    if (cards.length > 0) {
      const pending = cards.filter(c => c.status !== 'done').length
      prompt += `\nTarefas pendentes: ${pending}.`
    }

    return prompt
  }, [contextDescription, notes, folders, cards])

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Save history when messages change
  useEffect(() => {
    if (messages.length > 0) {
      saveHistory(messages)
    }
  }, [messages])

  // Focus on open
  useEffect(() => {
    if (isChatOpen) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [isChatOpen])

  // Voice transcript listener
  useEffect(() => {
    const handleTranscript = (event: Event) => {
      const customEvent = event as CustomEvent<{ text: string }>
      const text = customEvent.detail?.text
      if (text && text.trim()) {
        setInputValue(text.trim())
        setIsOpen(true)
        setTimeout(() => inputRef.current?.focus(), 350)
      }
    }
    window.addEventListener('chatbot:open', handleTranscript)
    return () => window.removeEventListener('chatbot:open', handleTranscript)
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isChatOpen) {
        setIsOpen(false)
      }
      if (e.key === 'l' && e.ctrlKey && isChatOpen) {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isChatOpen])

  // Search Notes (RAG)
  const searchNotes = useCallback((query: string, limit: number = 3): NoteContext[] => {
    if (!query.trim()) return []
    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2)

    const scored = notes.map(note => {
      const combined = `${note.title} ${note.content}`
      const similarity = calculateSimilarity(query, combined)
      const titleMatch = queryWords.some(w => note.title.toLowerCase().includes(w))
      const adjustedSimilarity = titleMatch ? similarity * 1.5 : similarity

      return {
        id: note.id,
        title: note.title,
        content: note.content,
        similarity: Math.min(adjustedSimilarity, 1),
        snippet: extractSnippet(note.content, query, 600),
      }
    })

    return scored.filter(n => n.similarity > 0.1).sort((a, b) => b.similarity - a.similarity).slice(0, limit)
  }, [notes])

  // Context builder
  const buildContext = useCallback((relevantNotes: NoteContext[], userMessage: string): string => {
    let context = `Contexto do módulo atual:\n${contextDescription}\n\n`
    context += `O usuário perguntou: "${userMessage}"\n\n`

    if (relevantNotes.length > 0) {
      context += `NOTAS RELEVANTES ENCONTRADAS NO SISTEMA:\n`
      for (const note of relevantNotes) {
        context += `\n--- ${note.title} ---\n${note.snippet}\n`
      }
    }
    return context
  }, [contextDescription])

  // Send message to LLM (with Local Orchestrator Fallback)
  const sendMessage = async (content: string, relevantNotes: NoteContext[] = []) => {
    if (!content.trim() || isLoading) return

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
      notes: relevantNotes.length > 0 ? relevantNotes : undefined,
    }

    setMessages(prev => [...prev, userMessage])
    inputClearedRef.current = false
    setIsLoading(true)
    setError(null)

    // Se nao tiver API key configurada, executa o motor local de orquestracao diretamente!
    if (!aiConfig.apiKey && aiConfig.provider !== 'ollama') {
      const localResult = parseLocalIntent(content, folders, notes as any)
      setMessages(prev => [
        ...prev,
        { id: generateId(), role: 'assistant', content: localResult.message, timestamp: new Date() },
      ])
      if (localResult.action) {
        setPendingAction(localResult.action as any)
      }
      setInputValue('')
      setIsLoading(false)
      return
    }

    const assistantMessageId = generateId()
    setMessages(prev => [...prev, {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    }])

    try {
      const context = buildContext(relevantNotes, content)
      const messagesHistory = messages.slice(-8).map(m => ({ role: m.role, content: m.content }))

      const apiMessages = [
        { role: 'system', content: systemPrompt },
        ...messagesHistory,
        { role: 'user', content: context },
      ]

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 35_000)

      const response = await fetch(aiConfig.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(aiConfig.apiKey ? { 'Authorization': `Bearer ${aiConfig.apiKey}` } : {}),
        },
        body: JSON.stringify({
          model: aiConfig.model,
          messages: apiMessages,
          stream: true,
          max_tokens: 800,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error?.message || `Erro ${response.status}: verifique a API Key e o Modelo`)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('Stream não disponível no provedor')

      const decoder = new TextDecoder()
      let fullContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') continue

            try {
              const parsed = JSON.parse(data)
              const delta = parsed.choices?.[0]?.delta?.content
              if (delta) {
                fullContent += delta
                setMessages(prev => prev.map(msg =>
                  msg.id === assistantMessageId ? { ...msg, content: fullContent } : msg
                ))
                if (!inputClearedRef.current) {
                  inputClearedRef.current = true
                  setInputValue('')
                }
              }
            } catch {}
          }
        }
      }

      // Check for action tags in final content
      const createNoteMatch = fullContent.match(/\[ACTION:CREATE_NOTE\](\{.*?\})\[\/ACTION\]/s)
      const createFolderMatch = fullContent.match(/\[ACTION:CREATE_FOLDER\](\{.*?\})\[\/ACTION\]/s)
      const moveNoteMatch = fullContent.match(/\[ACTION:MOVE_NOTE\](\{.*?\})\[\/ACTION\]/s)
      const toggleHubMatch = fullContent.match(/\[ACTION:TOGGLE_HUB\](\{.*?\})\[\/ACTION\]/s)
      const renameFolderMatch = fullContent.match(/\[ACTION:RENAME_FOLDER\](\{.*?\})\[\/ACTION\]/s)

      if (createNoteMatch) {
        try {
          const actionPayload = JSON.parse(createNoteMatch[1])
          if (actionPayload.title) {
            setPendingAction({
              id: generateId(),
              type: 'create_note',
              title: actionPayload.title,
              content: actionPayload.content || '',
              folderId: actionPayload.folderId || null,
            })
          }
        } catch {}
      } else if (createFolderMatch) {
        try {
          const actionPayload = JSON.parse(createFolderMatch[1])
          if (actionPayload.name) {
            setPendingAction({
              id: generateId(),
              type: 'create_folder',
              name: actionPayload.name,
              parentId: actionPayload.parentId || null,
            })
          }
        } catch {}
      } else if (moveNoteMatch) {
        try {
          const actionPayload = JSON.parse(moveNoteMatch[1])
          const targetNote = notes.find(n => n.id === actionPayload.noteId || n.title.toLowerCase() === (actionPayload.noteTitle || '').toLowerCase())
          const targetFolder = folders.find(f => f.id === actionPayload.folderId || f.name.toLowerCase() === (actionPayload.folderName || '').toLowerCase())
          if (targetNote && targetFolder) {
            setPendingAction({
              id: generateId(),
              type: 'move_note',
              noteId: targetNote.id,
              noteTitle: targetNote.title,
              folderId: targetFolder.id,
              folderName: targetFolder.name,
            })
          }
        } catch {}
      } else if (toggleHubMatch) {
        try {
          const actionPayload = JSON.parse(toggleHubMatch[1])
          const targetFolder = folders.find(f => f.id === actionPayload.folderId || f.name.toLowerCase() === (actionPayload.folderName || '').toLowerCase())
          if (targetFolder) {
            setPendingAction({
              id: generateId(),
              type: 'toggle_hub',
              folderId: targetFolder.id,
              folderName: targetFolder.name,
              isHome: actionPayload.isHome !== undefined ? actionPayload.isHome : !targetFolder.isHome,
            })
          }
        } catch {}
      } else if (renameFolderMatch) {
        try {
          const actionPayload = JSON.parse(renameFolderMatch[1])
          const targetFolder = folders.find(f => f.id === actionPayload.folderId || f.name.toLowerCase() === (actionPayload.folderName || '').toLowerCase())
          if (targetFolder && actionPayload.newName) {
            setPendingAction({
              id: generateId(),
              type: 'rename_folder',
              folderId: targetFolder.id,
              folderName: targetFolder.name,
              newName: actionPayload.newName,
            })
          }
        } catch {}
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao comunicar com a IA')
      setMessages(prev => prev.filter(m => m.id !== assistantMessageId))
    } finally {
      setIsLoading(false)
    }
  }

  // Action confirmations
  const handleConfirmPendingAction = () => {
    if (!pendingAction) return

    if (pendingAction.type === 'create_note') {
      if (onCreateNote) {
        onCreateNote(pendingAction.title, pendingAction.content, pendingAction.folderId)
      }
      setMessages(prev => [...prev, {
        id: generateId(),
        role: 'assistant',
        content: `Nota "${pendingAction.title}" criada com sucesso!`,
        timestamp: new Date(),
        actionPayload: { type: 'view_note', title: pendingAction.title },
      }])
    } else if (pendingAction.type === 'create_folder') {
      if (onAddFolder) {
        onAddFolder(pendingAction.name, pendingAction.parentId)
      }
      setMessages(prev => [...prev, {
        id: generateId(),
        role: 'assistant',
        content: `Pasta "${pendingAction.name}" criada com sucesso!`,
        timestamp: new Date(),
      }])
    } else if (pendingAction.type === 'move_note') {
      if (onUpdateNote) {
        const target = notes.find(n => n.id === pendingAction.noteId)
        if (target) {
          onUpdateNote(pendingAction.noteId, { ...target, folderId: pendingAction.folderId, isPinned: false, isFavorite: false })
        }
      }
      setMessages(prev => [...prev, {
        id: generateId(),
        role: 'assistant',
        content: `Nota "${pendingAction.noteTitle}" movida para a pasta "${pendingAction.folderName}" com sucesso!`,
        timestamp: new Date(),
      }])
    } else if (pendingAction.type === 'toggle_hub') {
      if (onUpdateFolder) {
        onUpdateFolder(pendingAction.folderId, { isHome: pendingAction.isHome })
      }
      setMessages(prev => [...prev, {
        id: generateId(),
        role: 'assistant',
        content: pendingAction.isHome
          ? `A pasta "${pendingAction.folderName}" agora é um Hub Central!`
          : `A pasta "${pendingAction.folderName}" deixou de ser um Hub Central.`,
        timestamp: new Date(),
      }])
    } else if (pendingAction.type === 'rename_folder') {
      if (onUpdateFolder) {
        onUpdateFolder(pendingAction.folderId, { name: pendingAction.newName })
      }
      setMessages(prev => [...prev, {
        id: generateId(),
        role: 'assistant',
        content: `Pasta "${pendingAction.folderName}" renomeada para "${pendingAction.newName}"!`,
        timestamp: new Date(),
      }])
    } else if (pendingAction.type === 'update_note') {
      if (onApplyNote) {
        onApplyNote(undefined, pendingAction.content || '')
      }
      const evt = new CustomEvent('organon:apply-note', { detail: { content: pendingAction.content } })
      window.dispatchEvent(evt)

      setMessages(prev => [...prev, {
        id: generateId(),
        role: 'assistant',
        content: `Conteúdo gravado com sucesso na nota atual!`,
        timestamp: new Date(),
      }])
    }

    setPendingAction(null)
  }

  const handleCancelPendingAction = () => {
    setPendingAction(null)
  }

  const exportConversation = () => {
    const content = messages.map(m => `## ${m.role === 'user' ? 'Você' : 'Assistente'} (${m.timestamp.toLocaleString('pt-BR')})\n\n${m.content}\n`).join('\n\n---\n\n')
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `chatbot-export-${new Date().toISOString().slice(0, 10)}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const copyToClipboard = (text: string, msgId: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(msgId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleSuggestionClick = (suggestion: string) => {
    if (suggestion.includes('Crie uma nota')) {
      const title = prompt('Título da nova nota:')
      if (title && onCreateNote) {
        onCreateNote(title, '')
        setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: `Nota "${title}" criada!`, timestamp: new Date() }])
      }
    } else {
      const relevantNotes = searchNotes(suggestion)
      sendMessage(suggestion, relevantNotes)
    }
  }

  return (
    <>
      {/* FAB (Botao flutuante opcional) */}
      {!hideFloatingTrigger && (
        <button
          className="chatbot-fab"
          onClick={() => setIsOpen(!isChatOpen)}
          title={isChatOpen ? 'Fechar' : 'Assistente IA'}
          aria-label={isChatOpen ? 'Fechar' : 'Assistente IA'}
        >
          {isChatOpen ? Icons.close : Icons.chat}
        </button>
      )}

      {/* Panel */}
      <div className={`chatbot-panel ${isChatOpen ? 'is-open' : ''}`}>
        {/* Header */}
        <div className="chatbot-header">
          <div className="chatbot-header-left">
            <div className="chatbot-avatar">{Icons.bot}</div>
            <div className="chatbot-header-info">
              <div className="chatbot-header-title">Assistente {screenContext?.title || 'Organon IA'}</div>
              <div className="chatbot-header-status">
                <span className="chatbot-status-dot"></span>
                {PROVIDER_PRESETS[aiConfig.provider]?.label || aiConfig.provider} • {aiConfig.model}
              </div>
            </div>
          </div>
          <div className="chatbot-header-actions">
            <button
              className="chatbot-header-btn"
              onClick={() => setShowAiSettings(true)}
              title="Configurações de IA (API Key)"
              aria-label="Configurações de IA"
            >
              {Icons.gear}
            </button>
            <button
              className="chatbot-header-btn"
              onClick={exportConversation}
              title="Exportar conversa"
              aria-label="Exportar conversa"
            >
              {Icons.download}
            </button>
            <button
              className="chatbot-header-btn"
              onClick={() => setMessages([])}
              title="Limpar"
              disabled={messages.length === 0}
              aria-label="Limpar"
            >
              {Icons.trash}
            </button>
            <button
              className="chatbot-header-btn"
              onClick={() => setIsOpen(false)}
              title="Minimizar"
              aria-label="Minimizar"
            >
              {Icons.minimize}
            </button>
          </div>
        </div>

        {/* Modal Configuração de IA */}
        <ChatbotSettingsModal
          isOpen={showAiSettings}
          onClose={() => setShowAiSettings(false)}
          config={aiConfig}
          onSave={cfg => {
            setAiConfig(cfg)
            saveAiConfig(cfg)
          }}
        />

        {/* Suggestions */}
        {messages.length === 0 && (
          <div className="chatbot-suggestions">
            <div className="chatbot-suggestions-title">
              <span>{Icons.lightbulb}</span> Sugestões para {screenContext?.title || 'este módulo'}
            </div>
            {suggestions.map((s, i) => (
              <button key={i} className="chatbot-suggestion" onClick={() => handleSuggestionClick(s)}>
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Messages */}
        <div className="chatbot-messages">
          {messages.length === 0 && (
            <div className="chatbot-empty">
              <div className="chatbot-empty-icon">{Icons.bot}</div>
              <div className="chatbot-empty-title">
                Olá! Sou o Assistente Inteligente Organon.
              </div>
              <div className="chatbot-empty-subtitle">
                Estou conectado ao sistema. Você pode conversar normalmente ou pedir para eu criar notas, organizar tarefas e analisar seus dados.
              </div>
            </div>
          )}

          {messages.map(msg => (
            <ChatMessageItem
              key={msg.id}
              message={msg}
              notes={notes}
              copiedId={copiedId}
              onCopy={copyToClipboard}
              onNavigateToNote={onNavigateToNote}
              onApplyNote={onApplyNote}
              onCreateNote={onCreateNote}
            />
          ))}

          {/* Card de Layout de Confirmação Pendente */}
          {pendingAction && (
            <ChatbotActionCard
              action={pendingAction}
              onConfirm={handleConfirmPendingAction}
              onCancel={handleCancelPendingAction}
            />
          )}

          {isLoading && (
            <div className="chatbot-message chatbot-message-assistant">
              <div className="chatbot-message-avatar">{Icons.bot}</div>
              <div className="chatbot-message-content">
                <div className="chatbot-message-bubble"><TypingIndicator /></div>
              </div>
            </div>
          )}
        </div>

        {/* Banner de erro */}
        {error && (
          <div className="chatbot-error-banner" role="alert">
            <span>{error}</span>
            <button type="button" onClick={() => setError(null)} aria-label="Fechar erro">×</button>
          </div>
        )}

        {/* Input Form */}
        <form
          className="chatbot-input-form"
          onSubmit={e => {
            e.preventDefault()
            const relevantNotes = searchNotes(inputValue)
            sendMessage(inputValue, relevantNotes)
          }}
        >
          <div className="chatbot-input-wrap">
            <textarea
              ref={inputRef}
              className="chatbot-input"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              placeholder={`Fale com o assistente sobre ${screenContext?.title || 'o sistema'}...`}
              rows={1}
              disabled={isLoading}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  const relevantNotes = searchNotes(inputValue)
                  sendMessage(inputValue, relevantNotes)
                }
              }}
            />
            <button
              type="button"
              className={`chatbot-mic-btn ${isListening ? 'is-listening' : ''}`}
              onClick={isListening ? stopListening : startListening}
              title={isListening ? 'Parar' : 'Gravar voz'}
              aria-label={isListening ? 'Parar' : 'Gravar voz'}
            >
              {isListening ? Icons.micOff : Icons.mic}
            </button>
            <button
              type="submit"
              className="chatbot-send-btn"
              disabled={!inputValue.trim() || isLoading}
              aria-label="Enviar"
            >
              {Icons.send}
            </button>
          </div>
          <div className="chatbot-hint">
            Enter para enviar • Ctrl+L para focar • Esc para fechar
          </div>
        </form>
      </div>
    </>
  )
}
