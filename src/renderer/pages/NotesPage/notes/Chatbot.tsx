import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'

// ============================================================
// TYPES
// ============================================================

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  notes?: NoteContext[]
  action?: 'summarize' | 'expand' | 'rewrite' | 'ask' | 'diff'
  originalText?: string
  diffResult?: DiffResult
}

interface NoteContext {
  id: string
  title: string
  content: string
  similarity: number
  snippet: string
}

interface DiffResult {
  original: string
  rewritten: string
  changes: DiffChange[]
}

interface DiffChange {
  type: 'add' | 'remove' | 'equal'
  text: string
}

interface ChatAction {
  id: string
  label: string
  icon: React.ReactNode
  prompt: string
  requiresSelection?: boolean
  context?: 'notes' | 'habits' | 'cards' | 'calendar' | 'finance' | 'crm' | 'general'
}

interface ScreenContext {
  screen: string
  title: string
  items: Array<{ id: string; title: string; type: string }>
}

// ============================================================
// CONFIG & PROVIDERS
// ============================================================

export interface AiConfig {
  apiKey: string
  provider: 'openrouter' | 'openai' | 'gemini' | 'groq' | 'ollama'
  model: string
  baseUrl: string
}

const STORAGE_KEY = 'organon-chatbot-history'
const AI_CONFIG_KEY = 'organon-ai-config'
const MAX_HISTORY_MESSAGES = 50

const DEFAULT_AI_CONFIG: AiConfig = {
  apiKey: import.meta.env?.VITE_OPENROUTER_API_KEY || '',
  provider: 'openrouter',
  model: 'openai/gpt-4o',
  baseUrl: 'https://openrouter.ai/api/v1/chat/completions',
}

const PROVIDER_PRESETS: Record<string, { label: string; url: string; defaultModel: string }> = {
  openrouter: { label: 'OpenRouter (OpenAI, Claude, etc)', url: 'https://openrouter.ai/api/v1/chat/completions', defaultModel: 'openai/gpt-4o' },
  openai: { label: 'OpenAI (Oficial)', url: 'https://api.openai.com/v1/chat/completions', defaultModel: 'gpt-4o' },
  gemini: { label: 'Google Gemini API', url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', defaultModel: 'gemini-1.5-pro' },
  groq: { label: 'Groq (Respostas Ultra-Rápidas)', url: 'https://api.groq.com/openai/v1/chat/completions', defaultModel: 'llama-3.3-70b-versatile' },
  ollama: { label: 'Ollama Local (Offline / Grátis)', url: 'http://localhost:11434/v1/chat/completions', defaultModel: 'llama3' },
}

function loadAiConfig(): AiConfig {
  try {
    const saved = localStorage.getItem(AI_CONFIG_KEY)
    if (saved) return JSON.parse(saved)
  } catch {}
  return DEFAULT_AI_CONFIG
}

function saveAiConfig(cfg: AiConfig) {
  localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(cfg))
}

// ============================================================
// SAVE CONVERSATION TO FILE (Desktop)
// ============================================================

async function saveConversationToFile(messages: Message[], conversationId?: string): Promise<string | null> {
  const id = conversationId || `chat-${new Date().toISOString().slice(0, 10)}-${Date.now()}`

  try {
    // Check if running in Electron
    if (window.electronAPI?.saveConversation) {
      const content = formatConversationForFile(messages, id)
      const filePath = await window.electronAPI.saveConversation(id, content)
      return filePath
    } else {
      // Fallback: save to localStorage with metadata
      const conversation = {
        id,
        timestamp: new Date().toISOString(),
        messages: messages.map(m => ({
          ...m,
          timestamp: m.timestamp.toISOString()
        })),
        context: 'notes'
      }
      const key = `organon-conversation-${id}`
      localStorage.setItem(key, JSON.stringify(conversation))
      return key
    }
  } catch (e) {
    console.error('Failed to save conversation:', e)
    return null
  }
}

function formatConversationForFile(messages: Message[], id: string): string {
  const date = new Date().toLocaleString('pt-BR')

  let content = `# Conversa do Organon - ${date}\n`
  content += `## ID: ${id}\n\n---\n\n`

  for (const msg of messages) {
    const time = new Date(msg.timestamp).toLocaleString('pt-BR')
    const role = msg.role === 'user' ? '## 👤 Você' : '## 🤖 Assistente'

    content += `${role}\n`
    content += `*${time}*\n\n`
    content += `${msg.content}\n\n`

    if (msg.notes && msg.notes.length > 0) {
      content += `### 📄 Notas consultadas:\n`
      for (const note of msg.notes) {
        content += `- "${note.title}" (${Math.round(note.similarity * 100)}% similar)\n`
      }
      content += '\n'
    }

    content += '---\n\n'
  }

  content += `\n*Conversa salva automaticamente pelo Organon*\n`
  return content
}

// Load conversations from localStorage
function loadAllConversations(): Array<{ id: string; timestamp: string; preview: string }> {
  const conversations: Array<{ id: string; timestamp: string; preview: string }> = []

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('organon-conversation-')) {
        const data = JSON.parse(localStorage.getItem(key) || '{}')
        conversations.push({
          id: data.id,
          timestamp: data.timestamp,
          preview: data.messages?.[0]?.content?.slice(0, 100) || 'Sem conteúdo'
        })
      }
    }
  } catch (e) {
    console.error('Failed to load conversations:', e)
  }

  return conversations.sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )
}

// ============================================================
// CONTEXT TEMPLATES
// ============================================================

const CONTEXT_TEMPLATES: Record<string, string> = {
  notes: `Você está no módulo de Notas do Organon. O usuário está visualizando suas notas pessoais.
Contexto: O usuário pode buscar, resumir, expandir e reescrever notas. Pode também criar novas notas.
Formato preferido para resumos: bullet points com os pontos principais.
Ao resumir, identifique os pontos mais importantes e agrupe por tema se aplicável.`,

  habits: `Você está no módulo de Hábitos do Organon. O usuário está gerenciando seus hábitos diários.
Contexto: Hábitos incluem rastreamento de frequência, metas de consistência, e padrões de comportamento.
Seja motivacional mas realista. Sugira formas de melhorar consistência.`,

  cards: `Você está no módulo de Planejamento (Cards/Tarefas) do Organon. O usuário está gerenciando tarefas e projetos.
Contexto: Cards podem ter prioridades, datas, checklists e status. O usuário quer organizarse melhor.
Sugira formas práticas de priorizar e organizar tarefas.`,

  calendar: `Você está no módulo de Calendário do Organon. O usuário está planejando eventos e agendamentos.
Contexto: Eventos têm data, hora, categoria e podem ter lembretes.
Ajud a otimizar a agenda e identificar conflitos.`,

  finance: `Você está no módulo Financeiro do Organon. O usuário está gerenciando finanças pessoais.
Contexto: Inclui despesas, receitas, investimentos, metas de economia e orçamento.
Seja prático com dicas de economia e investimento.`,

  crm: `Você está no módulo de CRM do Organon. O usuário está gerenciando contatos e relacionamentos.
Contexto: CRM inclui contatos, tags, interações e histórico de comunicações.
Ajud e a organizar e priorizar contatos importantes.`,

  general: `Você é um assistente pessoal inteligente do Organon, um sistema de produtividade pessoal completo.
Módulos disponíveis: Notas, Hábitos, Planejamento (Cards), Calendário, Financeiro, CRM, Estudos, Apps.
O usuário pode perguntar sobre qualquer módulo e eu vou consultar os dados relevantes.
Seja útil, conciso e proativo em sugerir ações.`
}

// ============================================================
// SUGGESTIONS BY CONTEXT
// ============================================================

const SUGGESTIONS_BY_CONTEXT: Record<string, string[]> = {
  notes: [
    'Resuma minhas notas recentes',
    'Que notas tenho sobre projetos?',
    'Crie uma nota sobre...',
    'Compare duas notas',
  ],
  habits: [
    'Como está minha consistência?',
    'Sugira novos hábitos para mim',
    'Analyze meus padrões de hábito',
    'Como melhorar minha rotina?',
  ],
  cards: [
    'Priorize minhas tarefas',
    'O que devo fazer hoje?',
    'Analise meu progresso semanal',
    'Sugira como organizar projetos',
  ],
  calendar: [
    'Analise minha agenda',
    'Sugira otimizar meu tempo',
    'Que eventos tenho esta semana?',
    'Crie um lembrete para...',
  ],
  finance: [
    'Analise minhas finanças',
    'Estou dentro do orçamento?',
    'Sugira metas de economia',
    'Como melhorar minha situação?',
  ],
  crm: [
    'Quem são meus contatos importantes?',
    'Analise meus relacionamentos',
    'Sugira follow-ups pendentes',
    'Como melhorar minha rede?',
  ],
  general: [
    'Dê um resumo do meu dia',
    'O que tenho pendente?',
    'Sugira melhorias para meu sistema',
    'Resumo geral de tudo',
  ],
}

// ============================================================
// PROMPT TEMPLATES
// ============================================================

const PROMPT_TEMPLATES = [
  { id: 'bullet', label: 'Como bullet points', template: 'Resuma {content} como bullet points' },
  { id: 'table', label: 'Como tabela', template: 'Resuma {content} como tabela' },
  { id: 'action', label: 'Lista de ações', template: 'Extraia {content} como lista de ações' },
  { id: 'expand', label: 'Mais detalhes', template: 'Expanda {content} com mais detalhes' },
  { id: 'simplify', label: 'Simplificar', template: 'Simplifique {content} mantendo o essencial' },
  { id: 'professional', label: 'Tom profissional', template: 'Reescreva {content} em tom profissional' },
]

// ============================================================
// ICONS
// ============================================================

const Icons = {
  chat: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>,
  close: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
  send: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>,
  bot: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><rect x="3" y="11" width="18" height="10" rx="2" /><circle cx="12" cy="5" r="2" /><path d="M12 7v4" /><line x1="8" y1="16" x2="8" y2="16" /><line x1="16" y1="16" x2="16" y2="16" /></svg>,
  user: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>,
  mic: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>,
  micOff: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><line x1="1" y1="1" x2="23" y2="23" /><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" /><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>,
  download: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>,
  templates: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" /></svg>,
  search: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>,
  summarize: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>,
  expand: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" /></svg>,
  rewrite: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>,
  diff: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>,
  copy: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>,
  plus: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>,
  trash: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>,
  check: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><polyline points="20 6 9 17 4 12" /></svg>,
  minimize: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><polyline points="6 9 12 15 18 9" /></svg>,
  keyboard: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><rect x="2" y="4" width="20" height="16" rx="2" ry="2" /><path d="M6 8h.001M10 8h.001M14 8h.001M18 8h.001M8 12h.001M12 12h.001M16 12h.001M6 16h8" /></svg>,
  lightbulb: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M9 18h6M10 22h4M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" /></svg>,
  gear: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
}

// ============================================================
// UTILITIES
// ============================================================

function tokenCount(text: string): number {
  return Math.ceil(text.length / 4)
}

function truncateText(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text
  return text.slice(0, maxChars - 3) + '...'
}

function extractSnippet(content: string, query: string, maxChars: number = NOTE_SNIPPET_CHARS): string {
  const lowerContent = content.toLowerCase()
  const lowerQuery = query.toLowerCase()
  const words = lowerQuery.split(/\s+/).filter(w => w.length > 2)
  let bestIndex = 0
  let bestScore = 0

  for (const word of words) {
    const idx = lowerContent.indexOf(word)
    if (idx !== -1 && idx > bestScore) {
      bestIndex = Math.max(0, idx - 100)
      bestScore = idx
    }
  }

  const start = bestIndex
  const end = Math.min(start + maxChars, content.length)
  let snippet = content.slice(start, end)
  if (start > 0) snippet = '...' + snippet
  if (end < content.length) snippet = snippet + '...'
  return snippet
}

function calculateSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(w => w.length > 2))
  const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(w => w.length > 2))
  let intersection = 0
  for (const word of words1) {
    if (words2.has(word)) intersection++
  }
  const union = words1.size + words2.size - intersection
  return union > 0 ? intersection / union : 0
}

function computeDiff(original: string, rewritten: string): DiffChange[] {
  const changes: DiffChange[] = []
  const originalLines = original.split('\n')
  const rewrittenLines = rewritten.split('\n')
  const maxLines = Math.max(originalLines.length, rewrittenLines.length)

  for (let i = 0; i < maxLines; i++) {
    const origLine = originalLines[i] || ''
    const newLine = rewrittenLines[i] || ''
    if (origLine === newLine) {
      if (origLine) changes.push({ type: 'equal', text: origLine })
    } else {
      if (origLine) changes.push({ type: 'remove', text: origLine })
      if (newLine) changes.push({ type: 'add', text: newLine })
    }
  }
  return changes
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// ============================================================
// LOCAL STORAGE
// ============================================================

function saveHistory(messages: Message[]) {
  try {
    const toSave = messages.slice(-MAX_HISTORY_MESSAGES).map(m => ({
      ...m,
      timestamp: m.timestamp.toISOString()
    }))
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
  } catch (e) {
    console.error('Failed to save chat history:', e)
  }
}

function loadHistory(): Message[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      return parsed.map((m: any) => ({
        ...m,
        timestamp: new Date(m.timestamp)
      }))
    }
  } catch (e) {
    console.error('Failed to load chat history:', e)
  }
  return []
}

// ============================================================
// TYPING INDICATOR
// ============================================================

const TypingIndicator = () => (
  <div className="chatbot-typing">
    <span></span>
    <span></span>
    <span></span>
  </div>
)

// ============================================================
// DIFF VIEWER COMPONENT
// ============================================================

const DiffViewer: React.FC<{
  diff: DiffResult
  onApply: (text: string) => void
  onCancel: () => void
}> = ({ diff, onApply, onCancel }) => {
  const [activeTab, setActiveTab] = useState<'side' | 'inline'>('side')

  return (
    <div className="chatbot-diff-viewer">
      <div className="chatbot-diff-header">
        <div className="chatbot-diff-tabs">
          <button className={`chatbot-diff-tab ${activeTab === 'side' ? 'is-active' : ''}`} onClick={() => setActiveTab('side')}>
            Lado a Lado
          </button>
          <button className={`chatbot-diff-tab ${activeTab === 'inline' ? 'is-active' : ''}`} onClick={() => setActiveTab('inline')}>
            Inline
          </button>
        </div>
        <div className="chatbot-diff-actions">
          <button className="chatbot-diff-btn chatbot-diff-btn-apply" onClick={() => onApply(diff.rewritten)}>
            {Icons.check} Aplicar
          </button>
          <button className="chatbot-diff-btn" onClick={onCancel}>
            {Icons.close} Fechar
          </button>
        </div>
      </div>

      {activeTab === 'side' ? (
        <div className="chatbot-diff-side">
          <div className="chatbot-diff-pane">
            <div className="chatbot-diff-pane-header">Original</div>
            <div className="chatbot-diff-pane-content">
              {diff.changes.map((change, i) => (
                <div key={i} className={`chatbot-diff-line ${change.type !== 'remove' && change.type !== 'equal' ? 'chatbot-diff-hidden' : ''}`}>
                  <span className="chatbot-diff-line-num">{i + 1}</span>
                  <span className={`chatbot-diff-line-content ${change.type === 'remove' ? 'chatbot-diff-removed' : ''}`}>
                    {change.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="chatbot-diff-pane">
            <div className="chatbot-diff-pane-header">Novo</div>
            <div className="chatbot-diff-pane-content">
              {diff.changes.map((change, i) => (
                <div key={i} className={`chatbot-diff-line ${change.type !== 'add' && change.type !== 'equal' ? 'chatbot-diff-hidden' : ''}`}>
                  <span className="chatbot-diff-line-num">{i + 1}</span>
                  <span className={`chatbot-diff-line-content ${change.type === 'add' ? 'chatbot-diff-added' : ''}`}>
                    {change.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="chatbot-diff-inline">
          {diff.changes.map((change, i) => (
            <div key={i} className={`chatbot-diff-inline-line chatbot-diff-${change.type}`}>
              <span className="chatbot-diff-marker">{change.type === 'remove' ? '-' : change.type === 'add' ? '+' : ' '}</span>
              <span>{change.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================
// NOTE REFERENCE
// ============================================================

const NoteReference: React.FC<{ note: NoteContext; onClick?: () => void }> = ({ note, onClick }) => (
  <button className="chatbot-note-ref" onClick={onClick} title={`Similaridade: ${Math.round(note.similarity * 100)}%`}>
    <span className="chatbot-note-ref-icon">📄</span>
    <span className="chatbot-note-ref-title">{note.title}</span>
    <span className="chatbot-note-ref-score">{Math.round(note.similarity * 100)}%</span>
  </button>
)

// ============================================================
// TEMPLATE PICKER
// ============================================================

const TemplatePicker: React.FC<{
  content: string
  onSelect: (prompt: string) => void
  onClose: () => void
}> = ({ content, onSelect, onClose }) => (
  <div className="chatbot-template-picker">
    <div className="chatbot-template-picker-header">
      <span>Formatar como:</span>
      <button onClick={onClose}>{Icons.close}</button>
    </div>
    <div className="chatbot-template-picker-list">
      {PROMPT_TEMPLATES.map(t => (
        <button key={t.id} className="chatbot-template-option" onClick={() => onSelect(t.template.replace('{content}', content))}>
          {t.label}
        </button>
      ))}
    </div>
  </div>
)

// ============================================================
// LOCAL INTENT & ORCHESTRATION ENGINE
// ============================================================

function processLocalCommand(
  input: string,
  notes: Array<{ id: string; title: string; content: string; folderId?: string | null }>,
  folders: Array<{ id: string; name: string; parentId?: string | null; isHome?: boolean }>
): { message: string; action?: PendingAction } {
  const text = input.trim()
  const lower = text.toLowerCase()

  // 1. Criar pasta
  const createFolderMatch = lower.match(/(?:crie|criar|nova|adicione|adicionar)\s+(?:uma\s+)?pasta\s+(?:chamada\s+|com\s+nome\s+)?["'“]?([^"'\n”]+)["'”]?/i)
  if (createFolderMatch) {
    const folderName = createFolderMatch[1].trim()
    const parentMatch = lower.match(/(?:dentro\s+de|na\s+pasta|no\s+hub)\s+["'“]?([^"'\n”]+)["'”]?/i)
    let parentId: string | null = null
    if (parentMatch) {
      const parentName = parentMatch[1].trim()
      const foundParent = folders.find(f => f.name.toLowerCase() === parentName.toLowerCase() || f.name.toLowerCase().includes(parentName.toLowerCase()))
      if (foundParent) parentId = foundParent.id
    }
    return {
      message: `Entendido! Preparei a criação da pasta "${folderName}"${parentId ? ` dentro da pasta selecionada` : ''}. Por favor, confirme no card abaixo:`,
      action: { id: generateId(), type: 'create_folder', name: folderName, parentId }
    }
  }

  // 2. Mover nota
  const moveMatch = lower.match(/(?:mova|mover|coloque|colocar|transfira|transferir)\s+(?:a\s+nota\s+)?["'“]?([^"'\n”]+)["'”]?\s+(?:para\s+a\s+pasta|para\s+o\s+hub|para)\s+["'“]?([^"'\n”]+)["'”]?/i)
  if (moveMatch) {
    const noteQuery = moveMatch[1].trim()
    const folderQuery = moveMatch[2].trim()
    const foundNote = notes.find(n => n.title.toLowerCase().includes(noteQuery.toLowerCase()) || n.id === noteQuery)
    const foundFolder = folders.find(f => f.name.toLowerCase().includes(folderQuery.toLowerCase()) || f.id === folderQuery)

    if (foundNote && foundFolder) {
      return {
        message: `Entendido! Preparei a movimentação da nota "${foundNote.title}" para a pasta "${foundFolder.name}". Confirme no card abaixo:`,
        action: { id: generateId(), type: 'move_note', noteId: foundNote.id, noteTitle: foundNote.title, folderId: foundFolder.id, folderName: foundFolder.name }
      }
    }
  }

  // 3. Ativar/Desativar Hub
  const hubMatch = lower.match(/(?:transforme|transformar|ative|ativar|defina|definir)\s+(?:a\s+pasta\s+)?["'“]?([^"'\n”]+)["'”]?\s+(?:em\s+hub|como\s+hub|hub\s+central)/i)
  if (hubMatch) {
    const folderQuery = hubMatch[1].trim()
    const foundFolder = folders.find(f => f.name.toLowerCase().includes(folderQuery.toLowerCase()) || f.id === folderQuery)
    if (foundFolder) {
      return {
        message: `Pronto! Preparei a ativação da pasta "${foundFolder.name}" como Hub Central. Confirme no card abaixo:`,
        action: { id: generateId(), type: 'toggle_hub', folderId: foundFolder.id, folderName: foundFolder.name, isHome: true }
      }
    }
  }

  // 4. Renomear pasta
  const renameMatch = lower.match(/(?:renomeie|renomear|mude\s+o\s+nome\s+da\s+pasta)\s+["'“]?([^"'\n”]+)["'”]?\s+para\s+["'“]?([^"'\n”]+)["'”]?/i)
  if (renameMatch) {
    const oldQuery = renameMatch[1].trim()
    const newName = renameMatch[2].trim()
    const foundFolder = folders.find(f => f.name.toLowerCase().includes(oldQuery.toLowerCase()) || f.id === oldQuery)
    if (foundFolder) {
      return {
        message: `Entendido! Preparei a renomeação da pasta "${foundFolder.name}" para "${newName}". Confirme abaixo:`,
        action: { id: generateId(), type: 'rename_folder', folderId: foundFolder.id, folderName: foundFolder.name, newName }
      }
    }
  }

  // 5. Criar nota
  const createNoteMatch = lower.match(/(?:crie|criar|nova|adicione|adicionar)\s+(?:uma\s+)?nota\s+(?:chamada\s+|com\s+titulo\s+)?["'“]?([^"'\n”]+)["'”]?/i)
  if (createNoteMatch) {
    const noteTitle = createNoteMatch[1].trim()
    return {
      message: `Entendido! Preparei a criação da nota "${noteTitle}". Confirme no card abaixo:`,
      action: { id: generateId(), type: 'create_note', title: noteTitle, content: `# ${noteTitle}\n\nNota criada pelo Assistente Organon.` }
    }
  }

  // Fallback assistente geral
  return {
    message: `Olá! Sou o Orquestrador IA do Organon. 🤖\n\nPosso executar os seguintes comandos de organização:\n\n• **"Criar pasta [Nome]"** (ex: *crie a pasta PROMPTS*)\n• **"Mova a nota [Nome] para [Pasta]"** (ex: *mova a nota DevTools para a pasta Tools*)\n• **"Transforme a pasta [Nome] em Hub"**\n• **"Renomear pasta [Nome] para [NovoNome]"**\n• **"Criar nota [Título]"**\n\n*(Dica: Você também pode configurar sua chave de API nas configurações ⚙ para respostas avançadas de LLM!)*`
  }
}

// ============================================================
// MAIN COMPONENT
// ============================================================

interface ChatbotProps {
  notes?: Array<{ id: string; title: string; content: string; folderId?: string | null }>
  folders?: Array<{ id: string; name: string; parentId?: string | null; isHome?: boolean }>
  habits?: Array<{ id: string; name: string; description?: string }>
  cards?: Array<{ id: string; title: string; status?: string }>
  screenContext?: ScreenContext
  onApplyNote?: (noteId: string | undefined, content: string) => void
  onNavigateToNote?: (noteId: string) => void
  onCreateNote?: (title: string, content: string, folderId?: string | null) => void
  onAddFolder?: (name: string, parentId?: string | null) => string
  onUpdateFolder?: (folderId: string, updates: Partial<{ name: string; parentId: string | null; isHome: boolean }>) => void
  onUpdateNote?: (noteId: string, updates: Partial<{ title: string; content: string; folderId: string | null; isPinned: boolean; isFavorite: boolean }>) => void
  isOpen?: boolean
  onClose?: () => void
  hideFloatingTrigger?: boolean
  conversationsDir?: string
}

export type PendingAction =
  | { id: string; type: 'create_note'; title: string; content: string; folderId?: string | null }
  | { id: string; type: 'update_note'; title: string; content: string }
  | { id: string; type: 'create_folder'; name: string; parentId?: string | null }
  | { id: string; type: 'move_note'; noteId: string; noteTitle: string; folderId: string; folderName: string }
  | { id: string; type: 'toggle_hub'; folderId: string; folderName: string; isHome: boolean }
  | { id: string; type: 'rename_folder'; folderId: string; folderName: string; newName: string }

export const Chatbot: React.FC<ChatbotProps> = ({
  notes = [],
  folders = [],
  habits = [],
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
  const [showDiff, setShowDiff] = useState<DiffResult | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [selectedText, setSelectedText] = useState('')

  // Config do Assistente & Modal
  const [aiConfig, setAiConfig] = useState<AiConfig>(() => loadAiConfig())
  const [showAiSettings, setShowAiSettings] = useState(false)
  const [copiedKey, setCopiedKey] = useState(false)
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)

  const copyApiKey = () => {
    if (aiConfig.apiKey) {
      navigator.clipboard.writeText(aiConfig.apiKey)
      setCopiedKey(true)
      setTimeout(() => setCopiedKey(false), 2000)
    }
  }

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const recognitionRef = useRef<any>(null)
  const inputClearedRef = useRef(false)

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
    if (habits.length > 0) {
      prompt += `\nHábitos ativos: ${habits.map(h => h.name).join(', ')}.`
    }
    if (cards.length > 0) {
      const pending = cards.filter(c => c.status !== 'done').length
      prompt += `\nTarefas pendentes: ${pending}.`
    }

    return prompt
  }, [contextDescription, notes, folders, habits, cards])

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
      const localResult = processLocalCommand(content, notes, folders)
      setMessages(prev => [
        ...prev,
        { id: generateId(), role: 'assistant', content: localResult.message, timestamp: new Date() }
      ])
      if (localResult.action) {
        setPendingAction(localResult.action)
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
      const updateNoteMatch = fullContent.match(/\[ACTION:UPDATE_NOTE\](\{.*?\})\[\/ACTION\]/s)
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
      } else if (updateNoteMatch) {
        try {
          const actionPayload = JSON.parse(updateNoteMatch[1])
          setPendingAction({
            id: generateId(),
            type: 'update_note',
            title: actionPayload.title || 'Escrever na Nota Atual',
            content: actionPayload.content || '',
          })
        } catch {}
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro na comunicação'
      setError(errorMessage)
      setMessages(prev => prev.map(msg =>
        msg.id === assistantMessageId ? { ...msg, content: `❌ ${errorMessage}` } : msg
      ))
    } finally {
      setIsLoading(false)
    }
  }

  // Confirm and Execute Pending Action
  const handleConfirmPendingAction = () => {
    if (!pendingAction) return

    if (pendingAction.type === 'create_note') {
      if (onCreateNote) {
        onCreateNote(pendingAction.title, pendingAction.content || '', pendingAction.folderId)
      }
      const evt = new CustomEvent('organon:create-note', { detail: { title: pendingAction.title, content: pendingAction.content, folderId: pendingAction.folderId } })
      window.dispatchEvent(evt)

      setMessages(prev => [...prev, {
        id: generateId(),
        role: 'assistant',
        content: `✅ Nota "${pendingAction.title}" criada com sucesso no Organon!`,
        timestamp: new Date(),
        actionPayload: {
          type: 'view_note',
          title: pendingAction.title,
        }
      }])
    } else if (pendingAction.type === 'create_folder') {
      let createdId: string | undefined = undefined
      if (onAddFolder) {
        createdId = onAddFolder(pendingAction.name, pendingAction.parentId)
      }
      const parentFolder = folders.find(f => f.id === pendingAction.parentId)
      const parentInfo = parentFolder ? ` dentro de "${parentFolder.name}"` : ''
      setMessages(prev => [...prev, {
        id: generateId(),
        role: 'assistant',
        content: `✅ Pasta "${pendingAction.name}" criada com sucesso${parentInfo}!`,
        timestamp: new Date(),
      }])
    } else if (pendingAction.type === 'move_note') {
      if (onUpdateNote) {
        onUpdateNote(pendingAction.noteId, { folderId: pendingAction.folderId })
      }
      setMessages(prev => [...prev, {
        id: generateId(),
        role: 'assistant',
        content: `✅ Nota "${pendingAction.noteTitle}" movida para a pasta "${pendingAction.folderName}" com sucesso!`,
        timestamp: new Date(),
      }])
    } else if (pendingAction.type === 'toggle_hub') {
      if (onUpdateFolder) {
        onUpdateFolder(pendingAction.folderId, { isHome: pendingAction.isHome })
      }
      const statusLabel = pendingAction.isHome ? 'transformada em Hub Central' : 'removida do modo Hub'
      setMessages(prev => [...prev, {
        id: generateId(),
        role: 'assistant',
        content: `✅ Pasta "${pendingAction.folderName}" ${statusLabel} com sucesso!`,
        timestamp: new Date(),
      }])
    } else if (pendingAction.type === 'rename_folder') {
      if (onUpdateFolder) {
        onUpdateFolder(pendingAction.folderId, { name: pendingAction.newName })
      }
      setMessages(prev => [...prev, {
        id: generateId(),
        role: 'assistant',
        content: `✅ Pasta renomeada de "${pendingAction.folderName}" para "${pendingAction.newName}" com sucesso!`,
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
        content: `✅ Conteúdo gravado com sucesso na nota atual!`,
        timestamp: new Date(),
      }])
    }

    setPendingAction(null)
  }

  const handleCancelPendingAction = () => {
    setPendingAction(null)
  }

  // Voice Input
  const startListening = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError('Navegador sem suporte para voz')
      return
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = 'pt-BR'

    recognition.onstart = () => { setIsListening(true); setError(null) }
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results).map((r: any) => r[0].transcript).join('')
      setInputValue(prev => prev + transcript)
    }
    recognition.onerror = () => setIsListening(false)
    recognition.onend = () => setIsListening(false)

    recognitionRef.current = recognition
    recognition.start()
  }, [])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
    setIsListening(false)
  }, [])

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

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  const handleSuggestionClick = (suggestion: string) => {
    if (suggestion.includes('Crie uma nota')) {
      const title = prompt('Título da nova nota:')
      if (title && onCreateNote) {
        onCreateNote(title, '')
        setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: `✅ Nota "${title}" criada!`, timestamp: new Date() }])
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
        <button className="chatbot-fab" onClick={() => setIsOpen(!isChatOpen)} title={isChatOpen ? 'Fechar' : 'Assistente IA'}>
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
            <button className="chatbot-header-btn" onClick={() => setShowAiSettings(true)} title="Configurações de IA (API Key)">
              {Icons.gear}
            </button>
            <button className="chatbot-header-btn" onClick={exportConversation} title="Exportar conversa">
              {Icons.download}
            </button>
            <button className="chatbot-header-btn" onClick={() => setMessages([])} title="Limpar" disabled={messages.length === 0}>
              {Icons.trash}
            </button>
            <button className="chatbot-header-btn" onClick={() => setIsOpen(false)} title="Minimizar">
              {Icons.minimize}
            </button>
          </div>
        </div>

        {/* Modal Configuração de IA */}
        {showAiSettings && (
          <div style={{ padding: '16px', background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>⚙ Configurações de IA & API</span>
              <button type="button" onClick={() => setShowAiSettings(false)} style={{ border: 'none', background: 'transparent', color: 'var(--color-text)', cursor: 'pointer' }}>×</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', fontWeight: 600 }}>Provedor de IA:</label>
              <select
                value={aiConfig.provider}
                onChange={e => {
                  const prov = e.target.value as any
                  const preset = PROVIDER_PRESETS[prov]
                  setAiConfig(prev => ({
                    ...prev,
                    provider: prov,
                    baseUrl: preset ? preset.url : prev.baseUrl,
                    model: preset ? preset.defaultModel : prev.model,
                  }))
                }}
                style={{ padding: '6px', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-background)', color: 'var(--color-text)', fontSize: '12px' }}
              >
                {Object.entries(PROVIDER_PRESETS).map(([key, item]) => (
                  <option key={key} value={key}>{item.label}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', fontWeight: 600 }}>Chave de API (API Key):</label>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <input
                  type="password"
                  placeholder={aiConfig.provider === 'ollama' ? 'Não necessária para Ollama Local' : 'Cole sua API Key (sk-...)'}
                  value={aiConfig.apiKey}
                  onChange={e => setAiConfig(prev => ({ ...prev, apiKey: e.target.value.trim() }))}
                  style={{ flex: 1, padding: '6px', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-background)', color: 'var(--color-text)', fontSize: '12px' }}
                />
                <button
                  type="button"
                  onClick={copyApiKey}
                  disabled={!aiConfig.apiKey}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-surface)',
                    color: 'var(--color-text)',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: aiConfig.apiKey ? 'pointer' : 'not-allowed',
                    opacity: aiConfig.apiKey ? 1 : 0.5,
                  }}
                >
                  {copiedKey ? '✓ Copiado' : 'Copiar'}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', fontWeight: 600 }}>Modelo de IA:</label>
              <input
                type="text"
                value={aiConfig.model}
                onChange={e => setAiConfig(prev => ({ ...prev, model: e.target.value.trim() }))}
                style={{ padding: '6px', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-background)', color: 'var(--color-text)', fontSize: '12px' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => { saveAiConfig(aiConfig); setShowAiSettings(false); setError(null) }}
                style={{ flex: 1, padding: '8px', borderRadius: '6px', background: 'var(--color-primary)', color: '#fff', border: 'none', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}
              >
                Salvar e Aplicar
              </button>
            </div>
          </div>
        )}

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
            <div key={msg.id} className={`chatbot-message chatbot-message-${msg.role}`}>
              <div className="chatbot-message-avatar">
                {msg.role === 'assistant' ? Icons.bot : Icons.user}
              </div>
              <div className="chatbot-message-content">
                {msg.notes && msg.notes.length > 0 && (
                  <div className="chatbot-message-notes">
                    {msg.notes.map(note => (
                      <NoteReference key={note.id} note={note} onClick={() => onNavigateToNote?.(note.id)} />
                    ))}
                  </div>
                )}
                <div className="chatbot-message-bubble">
                  {msg.content.replace(/\[ACTION:CREATE_NOTE\].*?\[\/ACTION\]/s, '').trim()}

                  {msg.actionPayload?.type === 'view_note' && (
                    <div style={{ marginTop: '8px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          const found = notes.find(n => n.title.toLowerCase() === msg.actionPayload?.title?.toLowerCase()) || notes[notes.length - 1]
                          if (found && onNavigateToNote) {
                            onNavigateToNote(found.id)
                          }
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          background: 'var(--color-primary)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          marginTop: '6px',
                        }}
                      >
                        👁️ Ver Nota
                      </button>
                    </div>
                  )}

                  {msg.role === 'assistant' && msg.content && !msg.content.startsWith('❌') && (
                    <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => {
                          const cleanText = msg.content
                            .replace(/\[ACTION:CREATE_NOTE\].*?\[\/ACTION\]/s, '')
                            .replace(/\[ACTION:UPDATE_NOTE\].*?\[\/ACTION\]/s, '')
                            .trim()
                          if (onApplyNote) {
                            onApplyNote(undefined, cleanText)
                          }
                          const evt = new CustomEvent('organon:apply-note', { detail: { content: cleanText } })
                          window.dispatchEvent(evt)
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '5px 10px',
                          background: 'rgba(99, 102, 241, 0.15)',
                          color: 'var(--color-primary)',
                          border: '1px solid rgba(99, 102, 241, 0.3)',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        📝 Escrever nesta Nota
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const cleanText = msg.content
                            .replace(/\[ACTION:CREATE_NOTE\].*?\[\/ACTION\]/s, '')
                            .replace(/\[ACTION:UPDATE_NOTE\].*?\[\/ACTION\]/s, '')
                            .trim()
                          const firstLine = cleanText.split('\n')[0].replace(/^#+\s*/, '').slice(0, 40).trim() || 'Nova Nota do Assistente'
                          if (onCreateNote) {
                            onCreateNote(firstLine, cleanText)
                          }
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '5px 10px',
                          background: 'var(--color-surface)',
                          color: 'var(--color-text)',
                          border: '1px solid var(--color-border)',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        ➕ Salvar como Nova Nota
                      </button>
                    </div>
                  )}

                  {msg.content && (
                    <div className="chatbot-message-actions">
                      <button className="chatbot-copy-btn" onClick={() => copyToClipboard(msg.content, msg.id)} title="Copiar">
                        {copiedId === msg.id ? Icons.check : Icons.copy}
                      </button>
                    </div>
                  )}
                </div>
                <div className="chatbot-message-time">{formatTime(msg.timestamp)}</div>
              </div>
            </div>
          ))}

          {/* Card de Layout de Confirmação Pendente */}
          {pendingAction && (
            <div style={{ margin: '8px 12px', padding: '12px 14px', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.35)', borderRadius: '10px' }}>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, color: 'var(--color-primary)', letterSpacing: '0.04em' }}>
                {pendingAction.type === 'create_note' && '⚡ Ação Solicitada: Criar Nota'}
                {pendingAction.type === 'create_folder' && '📂 Ação Solicitada: Criar Pasta'}
                {pendingAction.type === 'move_note' && '🔄 Ação Solicitada: Mover Nota'}
                {pendingAction.type === 'toggle_hub' && '🏠 Ação Solicitada: Alternar Hub'}
                {pendingAction.type === 'rename_folder' && '✏️ Ação Solicitada: Renomear Pasta'}
                {pendingAction.type === 'update_note' && '📝 Ação Solicitada: Atualizar Nota'}
              </div>

              <div style={{ fontSize: '14px', fontWeight: 700, marginTop: '4px', color: 'var(--color-text)' }}>
                {pendingAction.type === 'create_note' && `📄 ${pendingAction.title}`}
                {pendingAction.type === 'create_folder' && `📂 ${pendingAction.name}`}
                {pendingAction.type === 'move_note' && `📄 ${pendingAction.noteTitle}`}
                {pendingAction.type === 'toggle_hub' && `📂 ${pendingAction.folderName}`}
                {pendingAction.type === 'rename_folder' && `📂 ${pendingAction.folderName}`}
                {pendingAction.type === 'update_note' && `📝 ${pendingAction.title}`}
              </div>

              {/* Subtitle / Details */}
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px', background: 'var(--color-surface)', padding: '6px 8px', borderRadius: '6px' }}>
                {pendingAction.type === 'create_note' && (pendingAction.content ? pendingAction.content.slice(0, 100) + '...' : 'Nota vazia')}
                {pendingAction.type === 'create_folder' && `Criar nova pasta no Organon`}
                {pendingAction.type === 'move_note' && `Mover para a pasta "📂 ${pendingAction.folderName}"`}
                {pendingAction.type === 'toggle_hub' && (pendingAction.isHome ? 'Transformar em Hub Central de Navegação' : 'Remover modo Hub Central')}
                {pendingAction.type === 'rename_folder' && `Renomear pasta para "📂 ${pendingAction.newName}"`}
                {pendingAction.type === 'update_note' && `Aplicar alterações no conteúdo da nota`}
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={handleConfirmPendingAction}
                  style={{ flex: 1, padding: '7px 12px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                >
                  ✓ Confirmar e Executar
                </button>
                <button
                  type="button"
                  onClick={handleCancelPendingAction}
                  style={{ padding: '7px 12px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '6px', fontSize: '12px', color: 'var(--color-text-muted)', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
              </div>
            </div>
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
            <span>⚠️ {error}</span>
            <button type="button" onClick={() => setError(null)} aria-label="Fechar erro">×</button>
          </div>
        )}

        {/* Input Form */}
        <form className="chatbot-input-form" onSubmit={(e) => { e.preventDefault(); const relevantNotes = searchNotes(inputValue); sendMessage(inputValue, relevantNotes) }}>
          <div className="chatbot-input-wrap">
            <textarea ref={inputRef} className="chatbot-input" value={inputValue} onChange={e => setInputValue(e.target.value)} placeholder={`Fale com o assistente sobre ${screenContext?.title || 'o sistema'}...`} rows={1} disabled={isLoading} onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                const relevantNotes = searchNotes(inputValue)
                sendMessage(inputValue, relevantNotes)
              }
            }} />
            <button type="button" className={`chatbot-mic-btn ${isListening ? 'is-listening' : ''}`} onClick={isListening ? stopListening : startListening} title={isListening ? 'Parar' : 'Gravar voz'}>
              {isListening ? Icons.micOff : Icons.mic}
            </button>
            <button type="submit" className="chatbot-send-btn" disabled={!inputValue.trim() || isLoading}>
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
