import {
  AiConfig,
  DEFAULT_AI_CONFIG,
  Message,
} from './chatbot.types'
import {
  STORAGE_KEY,
  AI_CONFIG_KEY,
  MAX_HISTORY_MESSAGES,
} from './chatbot.constants'

export function loadAiConfig(): AiConfig {
  try {
    const saved = localStorage.getItem(AI_CONFIG_KEY)
    if (saved) return JSON.parse(saved)
  } catch {}
  return DEFAULT_AI_CONFIG
}

export function saveAiConfig(cfg: AiConfig) {
  localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(cfg))
}

export function saveHistory(messages: Message[]) {
  try {
    const toSave = messages.slice(-MAX_HISTORY_MESSAGES).map((m) => ({
      ...m,
      timestamp: m.timestamp.toISOString(),
    }))
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
  } catch (e) {
    console.error('Failed to save chat history:', e)
  }
}

export function loadHistory(): Message[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      return parsed.map((m: any) => ({
        ...m,
        timestamp: new Date(m.timestamp),
      }))
    }
  } catch (e) {
    console.error('Failed to load chat history:', e)
  }
  return []
}
