import React from 'react'

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  notes?: NoteContext[]
  action?: 'summarize' | 'expand' | 'rewrite' | 'ask' | 'diff'
  originalText?: string
  diffResult?: DiffResult
}

export interface NoteContext {
  id: string
  title: string
  content: string
  similarity: number
  snippet: string
}

export interface DiffResult {
  original: string
  rewritten: string
  changes: DiffChange[]
}

export interface DiffChange {
  type: 'add' | 'remove' | 'equal'
  text: string
}

export interface ChatAction {
  id: string
  label: string
  icon: React.ReactNode
  prompt: string
  requiresSelection?: boolean
  context?: 'notes' | 'cards' | 'calendar' | 'finance' | 'general'
}

export interface ScreenContext {
  screen: string
  title: string
  items: Array<{ id: string; title: string; type: string }>
}

export interface AiConfig {
  apiKey: string
  provider: 'openrouter' | 'openai' | 'gemini' | 'groq' | 'ollama'
  model: string
  baseUrl: string
}

export const DEFAULT_AI_CONFIG: AiConfig = {
  apiKey: import.meta.env?.VITE_OPENROUTER_API_KEY || '',
  provider: 'openrouter',
  model: 'openai/gpt-4o',
  baseUrl: 'https://openrouter.ai/api/v1/chat/completions',
}

export const PROVIDER_PRESETS: Record<string, { label: string; url: string; defaultModel: string }> = {
  openrouter: { label: 'OpenRouter (OpenAI, Claude, etc)', url: 'https://openrouter.ai/api/v1/chat/completions', defaultModel: 'openai/gpt-4o' },
  openai: { label: 'OpenAI (Oficial)', url: 'https://api.openai.com/v1/chat/completions', defaultModel: 'gpt-4o' },
  gemini: { label: 'Google Gemini API', url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', defaultModel: 'gemini-1.5-pro' },
  groq: { label: 'Groq (Respostas Ultra-Rápidas)', url: 'https://api.groq.com/openai/v1/chat/completions', defaultModel: 'llama-3.3-70b-versatile' },
  ollama: { label: 'Ollama Local (Offline / Grátis)', url: 'http://localhost:11434/v1/chat/completions', defaultModel: 'llama3' },
}
